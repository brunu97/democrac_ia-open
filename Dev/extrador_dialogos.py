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
    # Cada deputado é identificado pelo par (nome, partido) — pessoas diferentes
    # podem partilhar o mesmo nome, mas não nome+partido.
    conn.execute("""CREATE TABLE deputados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        partido TEXT NOT NULL,
        total INTEGER NOT NULL,
        tamanho_medio INTEGER NOT NULL,
        primeira DATE,
        ultima DATE,
        UNIQUE(nome, partido)
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

    print("A criar índice em intervencoes(nome, partido)...")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_interv_nome_partido ON intervencoes(nome, partido)")
    conn.commit()

    print("A popular tabela de deputados (com filtro anti-ruído OCR)...")
    # Mantém apenas pares com >= 5 intervenções E >= 5% do total daquele nome.
    # Pares abaixo deste limiar são quase sempre erros de OCR no campo partido.
    conn.execute("""
        INSERT INTO deputados (nome, partido, total, tamanho_medio, primeira, ultima)
        SELECT par.nome, par.partido, par.n,
               CAST(par.tam_medio AS INTEGER),
               par.primeira, par.ultima
        FROM (
            SELECT nome, partido,
                   COUNT(*) AS n,
                   AVG(LENGTH(texto)) AS tam_medio,
                   MIN(data) AS primeira,
                   MAX(data) AS ultima
            FROM intervencoes
            WHERE nome IS NOT NULL AND partido IS NOT NULL AND partido != ''
            GROUP BY nome, partido
        ) par
        JOIN (
            SELECT nome, SUM(n) AS total_nome FROM (
                SELECT nome, partido, COUNT(*) AS n
                FROM intervencoes
                WHERE nome IS NOT NULL AND partido IS NOT NULL AND partido != ''
                GROUP BY nome, partido
            ) GROUP BY nome
        ) tot ON tot.nome = par.nome
        WHERE par.n >= 5 AND par.n >= tot.total_nome * 0.05
        ORDER BY par.nome COLLATE NOCASE, par.partido
    """)
    conn.commit()

    conn.close()