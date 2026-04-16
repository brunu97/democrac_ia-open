import re
import sqlite3
import sys
from pathlib import Path
from multiprocessing import Pool, cpu_count

import pymupdf
from tqdm import tqdm

SCRIPT_DIR = Path(__file__).parent.resolve()
PASTA = SCRIPT_DIR / "documentos"
DB = SCRIPT_DIR / "docs.db"

if not DB.exists():
    print("BD não encontrada!")
    sys.exit(1)

RE_ORADOR = re.compile(
    r"(?:O Sr\.|A Sr\.ª)\s+"
    r"(.+?)"                             # Nome ou cargo
    r"\s*(?:\(([A-Za-z\-]+)\))?"         # Partido entre parênteses, que é opcional
    r"\s*:\s*"
    r"[—\-]"                             # Travessão
)


def get_text_sem_italico(page):
    blocos = page.get_text("dict")["blocks"]
    partes = []
    for bloco in blocos:
        if bloco["type"] != 0 or "lines" not in bloco:
            continue
        for linha in bloco["lines"]:
            texto_linha = ""
            for span in linha["spans"]:
                is_italic = span["flags"] & 2
                if not is_italic:
                    texto_linha += span["text"]
            partes.append(texto_linha)
    return "\n".join(partes)


def processar_pdf(pdf_path):
    resultados = []
    # Extrai a data do nome do ficheiro
    encontra_uma_data = re.search(r"(\d{4}-\d{2}-\d{2})", pdf_path.name)
    data_sessao = encontra_uma_data.group(1) if encontra_uma_data else None

    doc = pymupdf.open(pdf_path)
    for num_pag in range(len(doc)):
        texto = get_text_sem_italico(doc[num_pag])

        # Encontra todas as marcas de orador na página
        marcas = []
        for m in RE_ORADOR.finditer(texto):
            nome = m.group(1).strip()
            partido = m.group(2).strip() if m.group(2) else None
            inicio = m.start()
            fim_marca = m.end()
            marcas.append((inicio, fim_marca, nome, partido))

        # Extrai o texto de cada intervenção
        for i, (ini, fim_m, nome, partido) in enumerate(marcas):
            # O fim da intervenção é o início da próxima marca, ou o fim do texto
            fim = marcas[i + 1][0] if i + 1 < len(marcas) else len(texto)
            # Extrai o texto (do fim da marca até ao início da próxima)
            dito = texto[fim_m:fim].strip()
            # Remove linhas em branco excessivas e normaliza espaços
            dito = re.sub(r'\n\s*\n', '\n\n', dito)
            dito = re.sub(r'[ \t]+', ' ', dito)
            # Só guarda se tiver partido
            if dito and partido:
                resultados.append(
                    (nome, partido, dito, pdf_path.name, num_pag + 1, data_sessao))

    doc.close()
    return resultados


if __name__ == "__main__":
    conn = sqlite3.connect(DB)
    conn.execute("DROP TABLE IF EXISTS intervencoes")
    conn.execute("DROP TABLE IF EXISTS deputados")
    conn.execute("""CREATE TABLE intervencoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        partido TEXT,
        texto TEXT,
        ficheiro TEXT,
        pagina INTEGER,
        data DATE
    )""")
    conn.execute("""CREATE TABLE deputados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE NOT NULL
    )""")
    conn.commit()

    pdfs = sorted(PASTA.glob("*.pdf"))
    workers = max(1, cpu_count() - 1)
    print(f"A processar {len(pdfs)} PDFs com {workers} workers...")

    with Pool(workers) as pool:
        for resultados in tqdm(pool.imap(processar_pdf, pdfs),
                               total=len(pdfs), desc=f"PDFs ({workers}w)"):
            if resultados:
                conn.executemany(
                    "INSERT INTO intervencoes VALUES (NULL,?,?,?,?,?,?)",
                    resultados)
                conn.commit()

    print("A popular tabela de deputados...")
    conn.execute("""
        INSERT INTO deputados (nome)
        SELECT DISTINCT nome FROM intervencoes
        WHERE nome IS NOT NULL
        ORDER BY nome
    """)
    conn.commit()

    conn.close()