# #!/usr/bin/env python3

# import requests
# from bs4 import BeautifulSoup
# import time
# import re
# import json
# import os
# from urllib.parse import urljoin, urlparse

# DIR_SCRIPT = os.path.dirname(os.path.abspath(__file__))
# FICHEIRO_SAIDA = os.path.join(DIR_SCRIPT, "links_serie_01.json")
# URL_CATALOGO = "https://debates.parlamento.pt/catalogo/r3/dar/01/"
# INTERVALO = 1.5
# HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/147.0'}

# def extrair_links(url, sessao):
#     try:
#         resposta = sessao.get(url, headers=HEADERS, timeout=30)
#         resposta.raise_for_status()
#         soup = BeautifulSoup(resposta.content, 'html.parser')
#         links = []
        
#         for link in soup.find_all('a', href=True):
#             href = link['href']
#             if href.startswith('#') or href.startswith('javascript:'):
#                 continue
            
#             url_completo = urljoin(url, href)
#             if '/catalogo/r3/dar/01/' in url_completo and url_completo != url:
#                 parsed = urlparse(url_completo)
#                 links.append(f"{parsed.scheme}://{parsed.netloc}{parsed.path}")
        
#         return list(dict.fromkeys(links))
#     except:
#         return []

# def tem_data_no_final(url):
#     # Verifica se a URL termina com data
#     return bool(re.search(r'\d{4}-\d{2}-\d{2}$', url))
# l
# def guardar_link(url, ficheiro):
#     try:
#         with open(ficheiro, 'r', encoding='utf-8') as f:
#             links = json.load(f)
#     except:
#         links = []
    
#     # Adiciona o novo link se não existir
#     if url not in links:
#         links.append(url)
#         with open(ficheiro, 'w', encoding='utf-8') as f:
#             json.dump(links, f, indent=2, ensure_ascii=False)

# def explorar(url, sessao, visitados, nivel=0, nivel_max=8):
#     if url in visitados or nivel > nivel_max:
#         return
    
#     visitados.add(url)
    
#     # Se tem data no final, é uma página com PDF
#     if tem_data_no_final(url):
#         print(f"{url}")
#         guardar_link(url, FICHEIRO_SAIDA)
#         return
    
#     if nivel > 0:
#         time.sleep(INTERVALO)
    
#     links = extrair_links(url, sessao)
    
#     for link in links:
#         explorar(link, sessao, visitados, nivel + 1, nivel_max)

# def main():
#     print(f"A extrair links de: {URL_CATALOGO}\n")
    
#     sessao = requests.Session()
#     sessao.headers.update(HEADERS)
    
#     explorar(URL_CATALOGO, sessao, set())
    
#     # Conta quantos links foram guardados
#     with open(FICHEIRO_SAIDA, 'r', encoding='utf-8') as f:
#         links = json.load(f)
#     print(f"\nTotal: {len(links)} links guardados em {FICHEIRO_SAIDA}")

# if __name__ == "__main__":
#     main()


#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import time
import re
import json
import os
from urllib.parse import urljoin, urlparse

DIR_SCRIPT = os.path.dirname(os.path.abspath(__file__))
FICHEIRO_SAIDA = os.path.join(DIR_SCRIPT, "links_serie_01.json")
URL_CATALOGO = "https://debates.parlamento.pt/catalogo/r3/dar/01/"
INTERVALO = 1.5
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/147.0'}
LEGISLATURA_MINIMA = 10 

def extrair_links(url, sessao):
    try:
        resposta = sessao.get(url, headers=HEADERS, timeout=30)
        resposta.raise_for_status()
        soup = BeautifulSoup(resposta.content, 'html.parser')
        links = []
        
        for link in soup.find_all('a', href=True):
            href = link['href']
            if href.startswith('#') or href.startswith('javascript:'):
                continue
            
            url_completo = urljoin(url, href)
            if '/catalogo/r3/dar/01/' in url_completo and url_completo != url:
                parsed = urlparse(url_completo)
                links.append(f"{parsed.scheme}://{parsed.netloc}{parsed.path}")
        
        return list(dict.fromkeys(links))
    except:
        return []

def tem_data_no_final(url):
    return bool(re.search(r'\d{4}-\d{2}-\d{2}$', url))

def obter_numero_legislatura(url): # Extrai o número da legislatura da URL
    match = re.search(r'/catalogo/r3/dar/01/(\d+)', url)
    return int(match.group(1)) if match else None

def deve_processar_url(url):
    # Verifica se a URL deve ser processada com base na legislatura mínima
    if LEGISLATURA_MINIMA is None:
        return True
    
    leg = obter_numero_legislatura(url)
    if leg is None:
        return True  # Permite URLs sem número de legislatura (para navegação)
    
    return leg >= LEGISLATURA_MINIMA

def guardar_link(url, ficheiro):
    try:
        with open(ficheiro, 'r', encoding='utf-8') as f:
            links = json.load(f)
    except:
        links = []
    
    if url not in links:
        links.append(url)
        with open(ficheiro, 'w', encoding='utf-8') as f:
            json.dump(links, f, indent=2, ensure_ascii=False)

def explorar(url, sessao, visitados, nivel=0, nivel_max=8):
    if url in visitados or nivel > nivel_max:
        return
    
    # Verifica se deve processar esta URL
    if not deve_processar_url(url):
        return
    
    visitados.add(url)
    
    if tem_data_no_final(url):
        leg = obter_numero_legislatura(url)
        print(f"[Legislatura {leg}] {url}")
        guardar_link(url, FICHEIRO_SAIDA)
        return
    
    if nivel > 0:
        time.sleep(INTERVALO)
    
    links = extrair_links(url, sessao)
    
    for link in links:
        explorar(link, sessao, visitados, nivel + 1, nivel_max)

def main():
    if LEGISLATURA_MINIMA is not None:
        print(f"A extrair links de: {URL_CATALOGO} (Legislaturas >= {LEGISLATURA_MINIMA})\n")
    else:
        print(f"A extrair links de: {URL_CATALOGO} (Todas as legislaturas)\n")
    
    sessao = requests.Session()
    sessao.headers.update(HEADERS)
    
    explorar(URL_CATALOGO, sessao, set())
    
    with open(FICHEIRO_SAIDA, 'r', encoding='utf-8') as f:
        links = json.load(f)
    print(f"\nTotal: {len(links)} links guardados em {FICHEIRO_SAIDA}")

if __name__ == "__main__":
    main()