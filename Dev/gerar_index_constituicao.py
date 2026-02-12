"""
Indexação FAISS - Constituição da República Portuguesa
1 chunk = 1 artigo completo (nunca partido)
FP16 com ROCm/CUDA
"""

import faiss
import sqlite3
import numpy as np
import pymupdf
import torch
import re
from pathlib import Path
from sentence_transformers import SentenceTransformer

SCRIPT_DIR = Path(__file__).parent.resolve()
PDF_PATH = SCRIPT_DIR / "constpt2005.pdf"
EMBED_MODEL = "BAAI/bge-m3"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DB_PATH = SCRIPT_DIR / "docs.db"


def limpar_texto(text):
    lines = text.split("\n")
    result, buf = [], []
    for line in lines:
        s = line.strip()
        if s == "":
            if buf:
                result.append(" ".join(buf))
                buf = []
        else:
            buf.append(s)
    if buf:
        result.append(" ".join(buf))
    return "\n".join(result).strip()


def extrair_artigos(pdf_path):
    pdf = pymupdf.open(pdf_path)
    raw = "\n".join(page.get_text("text") for page in pdf)

    # Mapear artigo -> página
    paginas = {}
    for pn, page in enumerate(pdf):
        for m in re.finditer(r"Artigo (\d+)\.º", page.get_text("text")):
            num = int(m.group(1))
            if num not in paginas:
                paginas[num] = pn + 1
    pdf.close()

    # Hierarquia funciona assim - Parte > Título > Capítulo
    parte, titulo, capitulo = "", "", ""
    hierarquia = {}
    lines = raw.split("\n")
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        if re.match(r"^PARTE [IVX]+$", s):
            parte = f"{s} - {lines[i+1].strip()}" if i+1 < len(lines) else s
            titulo = capitulo = ""
            i += 2; continue
        if re.match(r"^TÍTULO [IVX]+$", s):
            titulo = f"{s} - {lines[i+1].strip()}" if i+1 < len(lines) else s
            capitulo = ""
            i += 2; continue
        if re.match(r"^CAPÍTULO [IVX]+$", s):
            capitulo = f"{s} - {lines[i+1].strip()}" if i+1 < len(lines) else s
            i += 2; continue
        m = re.match(r"^Artigo (\d+)\.º", s)
        if m:
            hierarquia[int(m.group(1))] = {"parte": parte, "titulo": titulo, "capitulo": capitulo}
        i += 1

    # Dividir por artigos
    pattern = r"Artigo (\d+)\.º\s*\n\(([^)]+)\)\s*\n"
    matches = list(re.finditer(pattern, raw))

    # Cabeçalhos de secção a excluir do corpo dos artigos
    secao_re = re.compile(
        r"^\s*(PARTE [IVX]+|TÍTULO [IVX]+|CAPÍTULO [IVX]+|"
        r"Princípios fundamentais|Princípios gerais|"
        r"Direitos e deveres fundamentais|Organização económica|"
        r"Organização do poder político|Garantia e revisão da constituição|"
        r"Disposições finais e transitórias)\s*$"
    )

    chunks = []
    for i, match in enumerate(matches):
        num = int(match.group(1))
        titulo_art = match.group(2).strip()

        start = match.start()
        end = matches[i+1].start() if i+1 < len(matches) else len(raw)
        texto_raw = raw[start:end]

        # Cortar cabeçalhos de secção do fim
        linhas = []
        for linha in texto_raw.split("\n"):
            if secao_re.match(linha):
                break
            linhas.append(linha)

        texto = limpar_texto("\n".join(linhas))
        h = hierarquia.get(num, {})
        ctx = [h[k] for k in ("parte", "titulo", "capitulo") if h.get(k)]
        content = f"[{' > '.join(ctx)}]\n{texto}" if ctx else texto

        chunks.append({
            "content": content,
            "artigo_numero": num,
            "artigo_titulo": titulo_art,
            "parte": h.get("parte", ""),
            "titulo_secao": h.get("titulo", ""),
            "capitulo": h.get("capitulo", ""),
            "pagina": paginas.get(num, 1),
        })

    return chunks


def main():
    import time
    start = time.time()
    print(f"Device: {DEVICE}")

    # Extrair artigos
    chunks = extrair_artigos(PDF_PATH)
    print(f"{len(chunks)} artigos extraídos")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("DROP TABLE IF EXISTS constituicao")
    conn.execute("DROP INDEX IF EXISTS idx_artigo")
    conn.execute("""
        CREATE TABLE constituicao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            artigo_numero INTEGER NOT NULL,
            artigo_titulo TEXT NOT NULL,
            parte TEXT,
            titulo_secao TEXT,
            capitulo TEXT,
            pagina INTEGER NOT NULL
        )
    """)
    conn.execute("CREATE INDEX idx_artigo ON constituicao(artigo_numero)")

    for c in chunks:
        conn.execute(
            "INSERT INTO constituicao (content, artigo_numero, artigo_titulo, parte, titulo_secao, capitulo, pagina) VALUES (?,?,?,?,?,?,?)",
            (c["content"], c["artigo_numero"], c["artigo_titulo"],
             c["parte"], c["titulo_secao"], c["capitulo"], c["pagina"]),
        )
    conn.commit()
    conn.close()

    # Embeddings + FAISS
    embedder = SentenceTransformer(EMBED_MODEL, device=DEVICE)
    if DEVICE == "cuda":
        embedder.half()

    textos = [c["content"] for c in chunks]
    batch_size = 32 if DEVICE == "cuda" else 8

    embeddings = embedder.encode(
        textos, normalize_embeddings=True,
        batch_size=batch_size, show_progress_bar=True,
    ).astype("float32")

    base_index = faiss.IndexFlatIP(embeddings.shape[1])
    index = faiss.IndexIDMap(base_index)
    index.add_with_ids(embeddings, np.arange(len(chunks), dtype="int64"))

    faiss_path = SCRIPT_DIR / "constituicao.faiss"
    faiss.write_index(index, str(faiss_path))

    elapsed = time.time() - start
    print(f"Completo! {len(chunks)} chunks, {embeddings.shape[1]}d, {elapsed:.1f}s")
    print(f"  {DB_PATH}")
    print(f"  {faiss_path}")


if __name__ == "__main__":
    main()