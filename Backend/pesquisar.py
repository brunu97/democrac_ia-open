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
import random


class Pesquisar:
    def __init__(self):
        self.index = None
        self.index_constitucao = None
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
            self.index_constitucao = faiss.read_index(f"{config.VECTOR_PATH}/constituicao.faiss")
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

    def get_deputado(self, nome, offset=0, texto=None, data_inicio=None, data_fim=None):
        cursor = self._get_conn().cursor()
        
        base_query = '''SELECT nome, partido, texto, ficheiro, pagina, data FROM intervencoes  WHERE nome = ?'''
        count_query = '''SELECT COUNT(*) as total FROM intervencoes WHERE nome = ?'''
        
        params = [nome]
        
        # Adicionar filtro de texto
        if texto:
            base_query += ' AND texto LIKE ?'
            count_query += ' AND texto LIKE ?'
            params.append(f'%{texto}%')
        
        # Adicionar filtro de data início
        if data_inicio:
            base_query += ' AND data >= ?'
            count_query += ' AND data >= ?'
            params.append(data_inicio)
        
        # Adicionar filtro de data fim
        if data_fim:
            base_query += ' AND data <= ?'
            count_query += ' AND data <= ?'
            params.append(data_fim)
        
        # Adicionar ordenação e paginação à query principal
        base_query += ' ORDER BY data DESC LIMIT ? OFFSET ?'
        
        # Executar query principal
        cursor.execute(base_query, params + [15, offset])
        resultados = [dict(row) for row in cursor.fetchall()]
        
        # Executar query da contagem
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        return {
            'dados': resultados,
            'total': total,
            'offset': offset,
            'limit': 15,
            'tem_mais_paginas': (offset + 15) < total
        }

    def obtem_quiz(self):
        cursor = self._get_conn().cursor()

        # Escolhe deputado qualquer que esteja no top das intervenções
        cursor.execute('''SELECT nome FROM intervencoes WHERE LENGTH(texto) > 10 AND LENGTH(texto) <= 700 GROUP BY nome ORDER BY COUNT(*) DESC LIMIT 30''')
        deputados = [row['nome'] for row in cursor.fetchall()]

        correto = random.choice(deputados)

        cursor.execute('''SELECT texto, data, ficheiro, pagina FROM intervencoes WHERE nome = ? AND LENGTH(texto) > 10 AND LENGTH(texto) <= 700 ORDER BY RANDOM() LIMIT 1''', (correto,))
        row = cursor.fetchone()

        fonte = row['ficheiro']
        data = row['data']
        texto = row['texto']
        pagina = row['pagina']

        errados = random.sample([d for d in deputados if d != correto], 2) # Obtem 2 outros quaisqueres que estão errados para as opções
        opcoes = [correto] + errados
        random.shuffle(opcoes)

        return { 'citacao': texto, 'opcoes': opcoes, 'correto': correto, 'data': data, 'fonte': fonte, 'pagina': pagina }

    def pesquisa(self, query, modo="pesquisa", anos=None, incluir_contexto_adjacente=True, top_n_com_contexto=3):
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
                    resultado = {
                        "rank": i + 1,
                        "score": float(score),
                        "content": row['content'],
                        "source": row['source'],
                        "page": row['page'],
                        "path": row['path'],
                        "chunk_id": row['chunk_id']
                    }
                    
                    # Adicionar chunks adjacentes para os top 3 resultados
                    if incluir_contexto_adjacente and i < top_n_com_contexto:
                        resultado["contexto_adjacente"] = self._obter_chunks_adjacentes(
                            cursor, row['source'], row['chunk_id']
                        )
                    
                    resultados.append(resultado)

        return resultados

    def _obter_chunks_adjacentes(self, cursor, source, chunk_id_atual):
        contexto = {
            "anterior": None,
            "posterior": None
        }
        
        # Chunk anterior
        cursor.execute('''SELECT content, page, chunk_id FROM chunks WHERE source = ? AND chunk_id = ?''', (source, chunk_id_atual - 1))
        row_anterior = cursor.fetchone()
        if row_anterior:
            contexto["anterior"] = {
                "content": row_anterior['content'],
                "page": row_anterior['page'],
                "chunk_id": row_anterior['chunk_id']
            }
        
        # Chunk posterior
        cursor.execute('''SELECT content, page, chunk_id FROM chunks WHERE source = ? AND chunk_id = ?''',(source, chunk_id_atual + 1))
        row_posterior = cursor.fetchone()
        if row_posterior:
            contexto["posterior"] = {
                "content": row_posterior['content'],
                "page": row_posterior['page'],
                "chunk_id": row_posterior['chunk_id']
            }
        
        return contexto
        
    def gera_resposta(self, query, resultados, modo="pesquisa"):
        contexto = []
        
        for r in resultados:
            date = re.search(r'(\d{4})-(\d{2})-(\d{2})', r['source'])
            date_str = f", DATA: {date.group(3)}/{date.group(2)}/{date.group(1)}" if date else ""
            
            # Determinar a página inicial
            if r.get('contexto_adjacente', {}).get('anterior'):
                pagina_inicial = r['contexto_adjacente']['anterior']['page']
            else:
                pagina_inicial = r['page']
            
            # Header da fonte com a página onde realmente começa
            header = f"[FONTE {r['rank']}: {r['source']}, PÁGINA {pagina_inicial}{date_str}]\n"
            
            # Juntar os chunks de forma contínua
            conteudo_completo = []
            
            if r.get('contexto_adjacente', {}).get('anterior'):
                conteudo_completo.append(r['contexto_adjacente']['anterior']['content'])
            
            conteudo_completo.append(r['content'])
            
            if r.get('contexto_adjacente', {}).get('posterior'):
                conteudo_completo.append(r['contexto_adjacente']['posterior']['content'])
            
            bloco = header + " ".join(conteudo_completo)
            contexto.append(bloco)

        contexto_completo = "\n\n".join(contexto)
        user_prompt = f"""CONTEXTO DOS DEBATES:\n{contexto_completo}\n\n---\n\nPERGUNTA: {query}"""
        
        config_prompt = prompt.get_prompt_config(modo)
        
        return self._chamar_groq(system_prompt=config_prompt["system_prompt"], user_prompt=user_prompt, temperature=config_prompt["temperature"], max_tokens=config_prompt["tokens"], modelo=config_prompt["modelo"])

    def pesquisa_constituicao(self, query):
        with self._lock:
            emb = self.embedder.encode([query], normalize_embeddings=True, show_progress_bar=False).astype('float32')
        
        config_prompt = prompt.get_prompt_config("constituicao")
        scores, indices = self.index_constitucao.search(emb, config_prompt["k"])

        resultados = []
        cursor = self._get_conn().cursor()

        for rank, (idx, score) in enumerate(zip(indices[0], scores[0])):
            if idx < 0:
                continue
            cursor.execute(
                '''SELECT content, artigo_numero, artigo_titulo, parte, titulo_secao, capitulo, pagina 
                   FROM constituicao WHERE id = ?''',
                (int(idx) + 1,)
            )
            row = cursor.fetchone()
            if row:
                resultados.append({
                    "rank": rank + 1,
                    "score": float(score),
                    "content": row['content'],
                    "artigo_numero": row['artigo_numero'],
                    "artigo_titulo": row['artigo_titulo'],
                    "parte": row['parte'],
                    "titulo_secao": row['titulo_secao'],
                    "capitulo": row['capitulo'],
                    "pagina": row['pagina'],
                })

        # Contexto para a LLM
        contexto = "\n\n".join(
            f"[Artigo {r['artigo_numero']}º - {r['artigo_titulo']}]\n{r['content']}" 
            for r in resultados
        )
        
        user_prompt = f"CONTEXTO DA CONSTITUIÇÃO:\n{contexto}\n\n---\n\nPERGUNTA: {query}"
        
        resposta = self._chamar_groq(
            system_prompt=config_prompt["system_prompt"], 
            user_prompt=user_prompt, 
            temperature=config_prompt["temperature"],
            max_tokens=config_prompt["tokens"],
            modelo=config_prompt["modelo"]
        )

        return resultados, resposta

    def _chamar_groq(self, system_prompt, user_prompt, temperature, max_tokens, modelo):
        try:
            client = Groq(api_key=config.GROQ_KEY)
            argumentos = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "model": modelo,
                "top_p": 0.9,
                "temperature": temperature,
                "max_completion_tokens": max_tokens,
            }

            if modelo == config.MODEL_AVANCADO:
                argumentos["reasoning_format"] = "hidden"

            resposta_llm = client.chat.completions.create(**argumentos)
            return resposta_llm.choices[0].message.content.strip()

        except Exception as e:
            return f"Erro na comunicação com Servidor: {str(e)}"