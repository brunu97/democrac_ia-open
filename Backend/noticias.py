import feedparser
import json
import re
import time
from datetime import datetime, timezone, timedelta
from dateutil import parser as dateparser
from groq import Groq
import config
from prompt import get_prompt_config

FEEDS = {
    "https://sapo.pt/rss/destaques": {"categorias": {"Notícias", "Nacional", "Economia"}, "max_tempo": 24 * 60 * 60},
    "https://www.rtp.pt/noticias/rss/politica": {"max_tempo": 3 * 60 * 60},
    "https://www.rtp.pt/noticias/rss/economia": {"max_tempo": 3 * 60 * 60},
    "https://www.cmjornal.pt/rss": {"max_tempo": 3 * 60 * 60},
    "https://www.record.pt/rss": {"max_tempo": 3 * 60 * 60},
    "https://www.rtp.pt/noticias/rss/desporto": {"max_tempo": 3 * 60 * 60},
    "https://www.rtp.pt/noticias/rss/pais": {"max_tempo": 3 * 60 * 60},
    "https://www.noticiasaominuto.com/rss/ultima-hora": {"max_tempo": 30 * 60},
    "https://www.noticiasaominuto.com/rss/fama": {"max_tempo": 3 * 60 * 60},
    "https://www.noticiasaominuto.com/rss/tech": {"max_tempo": 4 * 60 * 60},
}

INTERVALO = 2 * 60 * 60


def limpar_html(texto):
    texto = texto.replace('<![CDATA[', '').replace(']]>', '')
    texto = re.sub(r'<[^>]+>', '', texto)
    texto = re.sub(r'&\w+;', ' ', texto)
    texto = re.sub(r'\s+', ' ', texto).strip()
    return texto


def atualizar():
    try:
        noticias = []
        agora = datetime.now(timezone.utc)

        for url, config_feed in FEEDS.items():
            feed = feedparser.parse(url)
            categoria_filtro = config_feed.get("categorias")
            max_tempo = config_feed.get("max_tempo", 3 * 60 * 60)

            for entry in feed.entries:
                if categoria_filtro:
                    cat = getattr(entry, 'category', '') or ''
                    if cat not in categoria_filtro:
                        continue

                descricao_raw = getattr(entry, 'description', '') or ''
                descricao = limpar_html(descricao_raw)

                if descricao.strip().lower() == 'patrocinado':
                    continue

                titulo_raw = entry.title
                titulo = limpar_html(titulo_raw).strip()

                try:
                    pub = dateparser.parse(entry.published).astimezone(timezone.utc)
                except Exception:
                    pub = agora

                if (agora - pub).total_seconds() > max_tempo:
                    continue

                fonte = ""
                if hasattr(entry, 'source'):
                    fonte = entry.source.get('title', '')
                if not fonte:
                    fonte = getattr(entry, 'author', '') or ''
                if not fonte:
                    from urllib.parse import urlparse
                    fonte = urlparse(url).netloc.replace('www.', '')

                noticias.append({
                    'titulo': titulo,
                    'descricao': descricao if titulo not in descricao else '',
                    'fonte': fonte,
                    'link': entry.link,
                    'pub_date': pub.isoformat(),
                })

        noticias.sort(key=lambda n: n['pub_date'], reverse=True)

        resumo = resumir(noticias)

        with open(config.NOTICIAS_FICHEIRO, 'w', encoding='utf-8') as f:
            json.dump({
                'noticias': noticias,
                'resumo': resumo,
                'atualizado_em': agora.isoformat()
            }, f, ensure_ascii=False)

        print(f"[{datetime.now().strftime('%H:%M:%S')}] {len(noticias)} notícias guardadas")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Erro: {e}")


def resumir(noticias):
    if not noticias:
        return ""

    linhas = []
    for n in noticias:
        if n['descricao']:
            linhas.append(f"- {n['titulo']} ({n['fonte']})\n  {n['descricao']}")
        else:
            linhas.append(f"- {n['titulo']} ({n['fonte']})")
    texto = "\n--------\n\n".join(linhas)

    try:
        cfg = get_prompt_config("noticias")
        client = Groq(api_key=config.GROQ_KEY)
        resposta = client.chat.completions.create(
            model=cfg["modelo"],
            temperature=cfg["temperature"],
            max_completion_tokens=cfg["tokens"],
            messages=[
                {"role": "system", "content": cfg["system_prompt"]},
                {"role": "user", "content": f"Notícias das últimas horas:\n\n{texto}"}
            ]
        )
        return resposta.choices[0].message.content.strip()
    except Exception as e:
        print(f"Erro LLM: {e}")
        return ""


if __name__ == "__main__":
    while True:
        atualizar()
        print(f"Proxima atualização das noticias - {datetime.now().strftime('%H:%M:%S')} + 2h\n")
        time.sleep(INTERVALO)