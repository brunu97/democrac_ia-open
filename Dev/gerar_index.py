import faiss
import sqlite3
import numpy as np
from sentence_transformers import SentenceTransformer
from pathlib import Path
import pymupdf
from tqdm import tqdm
import torch
import gc
import re

# Configurações
SCRIPT_DIR = Path(__file__).parent.resolve()
DOCS_FOLDER = SCRIPT_DIR / "documentos"
OUTPUT_FOLDER = SCRIPT_DIR / "base_dados"
EMBED_MODEL = "BAAI/bge-m3"
CHUNK_SIZE = 2000
CHUNK_OVERLAP = 300

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def limpar_texto(text):
    if not text:
        return ""

    # Remove números das página
    lines = text.split('\n')
    cleaned_lines = []
    for i, line in enumerate(lines):
        s = line.strip()
        if s.isdigit() and len(s) <= 3 and (i < 5 or i > len(lines) - 5):
            continue
        cleaned_lines.append(line)
    
    text = '\n'.join(cleaned_lines)

    # Unir linhas que foram partidas no meio de um paragrafo por alguma razão no ficheiro
    lines = text.split('\n')
    result = []
    buf = []

    for line in lines:
        s = line.strip()
        if s == '':
            if buf:
                # Junta o buffer com espaços e limpa hifens de quebra de palavra
                paragraph = ' '.join(buf).replace('- ', '')
                result.append(paragraph)
                buf = []
            result.append('')
        else:
            buf.append(s)
            
    if buf:
        paragraph = ' '.join(buf).replace('- ', '')
        result.append(paragraph)

    text = '\n'.join(result)

    # Remove espaços horizontais duplicados
    text = re.sub(r'[^\S\n]+', ' ', text)
    # Garante que não existam mais de duas quebras de linha seguidas
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()

def extrair_texto(path):
    meta_data = []
    try:
        pdf = pymupdf.open(path)
        for page_num, page in enumerate(pdf):
            text = page.get_text("text")
            text = limpar_texto(text)
            
            if len(text) < 50: 
                continue
            
            # Divisão em chunks dentro da página
            start = 0
            while start < len(text):
                end = start + CHUNK_SIZE
                chunk = text[start:end]
                
                if len(chunk) > 100:
                    meta_data.append({
                        "content": chunk,
                        "page": page_num + 1,
                        "source": path.name
                    })
                
                start += CHUNK_SIZE - CHUNK_OVERLAP
        pdf.close()
    except Exception as e:
        print(f"{path}: {e}")
    return meta_data

def init_database(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Cria tabela para armazenar os chunks
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            source TEXT NOT NULL,
            page INTEGER NOT NULL,
            chunk_id INTEGER NOT NULL,
            path TEXT NOT NULL
        )
    ''')
    
    # Cria índices para melhorar performance de busca
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_source ON chunks(source)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_page ON chunks(page)')
    
    conn.commit()
    return conn

def process_files():
    folder = Path(DOCS_FOLDER)
    folder.mkdir(exist_ok=True)
    
    files = list(folder.rglob('*.pdf'))    
    print(f"\n{len(files)} PDFs encontrados")
    print(f"{DEVICE.upper()}")
    
    embedder = SentenceTransformer(EMBED_MODEL, device=DEVICE)
    if DEVICE == "cuda":
        embedder.half()  # FP16
    
    out = Path(OUTPUT_FOLDER)
    out.mkdir(exist_ok=True)
    db_path = out / "docs.db"
    conn = init_database(db_path)
    cursor = conn.cursor()
    
    all_embs = []
    batch_size = 32 if DEVICE == "cuda" else 8
    
    for path in tqdm(files, desc="A indexar"):
        page_chunks = extrair_texto(path)
        
        if not page_chunks:
            continue
            
        texts_to_embed = [c["content"] for c in page_chunks]
        
        # Geração de vetores
        embs = embedder.encode(texts_to_embed, normalize_embeddings=True, batch_size=batch_size, show_progress_bar=False).astype('float32')
        
        # coloca os chunks na BD
        for i, chunk_data in enumerate(page_chunks):
            cursor.execute('''INSERT INTO chunks (content, source, page, chunk_id, path) VALUES (?, ?, ?, ?, ?)''', (
                chunk_data["content"],
                chunk_data["source"],
                chunk_data["page"],
                i,
                str(path.relative_to(folder))
            ))
        
        all_embs.append(embs)
        
        gc.collect()
        if DEVICE == "cuda": torch.cuda.empty_cache()
    
    conn.commit()
    
    cursor.execute('SELECT COUNT(DISTINCT source) FROM chunks')
    pdfs_processados = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM chunks')
    chunks_totais = cursor.fetchone()[0]
    conn.close()
    
    embeddings = np.vstack(all_embs)
    base_index = faiss.IndexFlatIP(embeddings.shape[1])
    index = faiss.IndexIDMap(base_index)
    ids = np.arange(embeddings.shape[0], dtype='int64')
    index.add_with_ids(embeddings, ids)
        
    return index, pdfs_processados, chunks_totais

def save_index(index):
    out = Path(OUTPUT_FOLDER)
    out.mkdir(exist_ok=True)
    faiss.write_index(index, str(out / "index.faiss"))

def main():
    import time
    start = time.time()
    index, files_count, chunks_count = process_files()
    save_index(index)
    elapsed = time.time() - start
    
    print(f"\nIndexação Completa!")
    print(f"Documentos: {files_count} | Total de Chunks: {chunks_count}")
    print(f"Tempo decorrido: {elapsed/60:.2f} min")

if __name__ == "__main__":
    main()