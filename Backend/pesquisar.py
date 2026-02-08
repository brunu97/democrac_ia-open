from pathlib import Path
import threading
import faiss
import sqlite3
import numpy as np
import prompt
import config
import re
from sentence_transformers import SentenceTransformer
from groq import Groq


class Pesquisar:
    def __init__(self):
        self.index = None
        self.db_path = None
        self.embedder = None
        self._local = threading.local()
        self._lock = threading.Lock() 

    def _get_conn(self):
        if not hasattr(self._local, 'conn') or self._local.conn is None:
            self._local.conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True, check_same_thread=True)
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def carrega_dados(self):
        print("A iniciar servidor")

        try:
            print(f"{config.VECTOR_PATH}/index.faiss")
            self.index = faiss.read_index(f"{config.VECTOR_PATH}/index.faiss")
            self.db_path = str(Path(config.VECTOR_PATH) / "docs.db")

            self.embedder = SentenceTransformer(config.EMBED_MODEL, device='cpu')

            print("Dados carregados!")
            return True

        except Exception as e:
            print(f"Erro ao carregar dados: {e}")
            return False

    def get_oradores_lista(self):
        cursor = self._get_conn().cursor()
        cursor.execute('''SELECT DISTINCT nome FROM intervencoes ORDER BY nome''')
        return [dict(row) for row in cursor.fetchall()]

    def get_deputado(self, nome, offset=0):
        cursor = self._get_conn().cursor()

        cursor.execute('''
            SELECT 
                nome, 
                partido, 
                texto,
                ficheiro, 
                pagina 
            FROM intervencoes 
            WHERE nome = ?
            ORDER BY ficheiro, pagina
            LIMIT ? OFFSET ?
        ''', (nome, 15, offset))

        resultados = [dict(row) for row in cursor.fetchall()]

        cursor.execute('''SELECT COUNT(*) as total FROM intervencoes WHERE nome = ?''',(nome,))
        total = cursor.fetchone()['total']

        return {
            'dados': resultados,
            'total': total,
            'offset': offset,
            'limit': 15,
            'tem_mais_paginas': (offset + 15) < total
        }

    def pesquisa(self, query, modo="pesquisa", anos=None):
        config_prompt = prompt.get_prompt_config(modo)

        # Lock para o encoder
        with self._lock:
            emb = self.embedder.encode([query], normalize_embeddings=True, show_progress_bar=False).astype('float32')

        id_selector = None

        # Filtro por anos
        if anos and len(anos) > 0:
            cursor = self._get_conn().cursor()

            clausulas = " OR ".join(["source LIKE ?" for _ in anos])
            sql_filtrar = f"SELECT rowid FROM chunks WHERE {clausulas}"
            params = [f"%_{ano}-%" for ano in anos]

            cursor.execute(sql_filtrar, params)

            # FAISS é 0-indexed, SQLite rowid é 1-indexed
            ids_permitidos = np.array([row[0] - 1 for row in cursor.fetchall()], dtype='int64')

            if len(ids_permitidos) == 0:
                return []

            id_selector = faiss.IDSelectorBatch(ids_permitidos)

        # Pesquisa no FAISS
        if id_selector is not None:
            params = faiss.SearchParameters(sel=id_selector)
            scores, indices = self.index.search(
                emb, config_prompt["k"], params=params)
        else:
            scores, indices = self.index.search(emb, config_prompt["k"])

        resultados = []
        cursor = self._get_conn().cursor()
        for i, (idx, score) in enumerate(zip(indices[0], scores[0])):
            if idx >= 0:
                cursor.execute(
                    '''SELECT content, source, page, chunk_id, path FROM chunks WHERE rowid = ?''',
                    (int(idx) + 1,)
                )
                row = cursor.fetchone()
                if row:
                    resultados.append({
                        "rank": i + 1,
                        "score": float(score),
                        "content": row['content'],
                        "source": row['source'],
                        "page": row['page'],
                        "path": row['path']
                    })

        return resultados

    def gera_resposta(self, query, resultados, modo="pesquisa"):
        contexto = []
        for r in resultados:
            date = re.search(r'(\d{4})-(\d{2})-(\d{2})', r['source'])
            if date:
                block = (
                    f"[FONTE {r['rank']}: {r['source']}, "
                    f"PÁGINA {r['page']}, "
                    f"DATA: {date.group(3)}/{date.group(2)}/{date.group(1)}]\n"
                    f"{r['content']}"
                )
            else:
                block = (
                    f"[FONTE {r['rank']}: {r['source']}, "
                    f"PÁGINA {r['page']}]\n"
                    f"{r['content']}"
                )
            contexto.append(block)

        contexto_completo = "\n\n".join(contexto)

        user_prompt = f"""CONTEXTO DOS DEBATES:
{contexto_completo}

---

PERGUNTA: {query}"""

        try:
            client = Groq(api_key=config.GROQ_KEY)
            config_prompt = prompt.get_prompt_config(modo)

            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": config_prompt["system_prompt"]},
                    {"role": "user", "content": user_prompt}
                ],
                model=config.RESPOSTA_MODEL,
                top_p=0.9,
                temperature=config_prompt["temperature"],
                max_completion_tokens=config_prompt["tokens"],
            )

            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            return f"Erro na comunicação com Servidor: {str(e)}"
