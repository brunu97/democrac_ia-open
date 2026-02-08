import re, sqlite3, sys
from pathlib import Path
from multiprocessing import Pool, cpu_count
import pymupdf
from tqdm import tqdm

SCRIPT_DIR = Path(__file__).parent.resolve()
PASTA = SCRIPT_DIR / "documentos"
DB = SCRIPT_DIR / "docs.db"

if not DB.exists():
    print(f"Base de dados não encontrada: {DB}")
    sys.exit(1)


RE_ORADOR = re.compile(
    r"(?:O Sr\.|A Sr\.ª)\s+"            # "O Sr." ou "A Sr.ª"
    r"([A-ZÀ-Ú][A-Za-zÀ-ú \-']+?)"      # Nome (captura letras, espaços, hífens, apóstrofos)
    r"\s*\(([A-Za-z\-]+)\)"             # Partido entre parênteses
    r"\s*:\s*"                          # Dois pontos (com espaços opcionais)
    r"[—\-]"                            # Travessão (— ou -)
)

def processar_pdf(pdf_path):
    resultados = []
    doc = pymupdf.open(pdf_path)
    
    for num_pag in range(len(doc)):
        texto = doc[num_pag].get_text()
        
        # Encontra todas as marcas de orador na página
        marcas = []
        for m in RE_ORADOR.finditer(texto):
            nome = m.group(1).strip()
            partido = m.group(2).strip()
            inicio = m.start()
            fim_marca = m.end()
            marcas.append((inicio, fim_marca, nome, partido))
        
        # Extrai o texto de cada intervenção
        for i, (ini, fim_m, nome, partido) in enumerate(marcas):
            # O fim da intervenção é o início da próxima marca, ou o fim do texto
            fim = marcas[i+1][0] if i+1 < len(marcas) else len(texto)
            
            # Extrai o texto (do fim da marca até ao início da próxima)
            dito = texto[fim_m:fim].strip()
            
            # Remove linhas em branco excessivas e normaliza espaços
            dito = re.sub(r'\n\s*\n', '\n\n', dito) # Max 2 quebras de linha seguidas
            dito = re.sub(r'[ \t]+', ' ', dito) # Normaliza espaços
            
            if dito:
                resultados.append((nome, partido, dito, pdf_path.name, num_pag + 1))
    
    doc.close()
    return resultados

if __name__ == "__main__":
    conn = sqlite3.connect(DB)

    conn.execute("DROP TABLE IF EXISTS intervencoes")

    conn.execute("""CREATE TABLE intervencoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT, 
        partido TEXT, 
        texto TEXT, 
        ficheiro TEXT, 
        pagina INTEGER
    )""")
    conn.commit()

    pdfs = sorted(PASTA.glob("*.pdf"))
    workers = max(1, cpu_count() - 1)

    print(f"A processar {len(pdfs)} PDFs com {workers} workers...")
    
    with Pool(workers) as pool:
        for resultados in tqdm(pool.imap(processar_pdf, pdfs), 
                              total=len(pdfs), 
                              desc=f"PDFs ({workers}w)"):
            if resultados:
                conn.executemany(
                    "INSERT INTO intervencoes VALUES (NULL,?,?,?,?,?)", 
                    resultados
                )
                conn.commit()
    
    conn.close()