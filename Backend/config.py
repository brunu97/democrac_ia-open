import os

# Configurações
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VECTOR_PATH = os.path.join(BASE_DIR, "base_dados")

GROQ_KEY = "CHAVE_GROQ"

EMBED_MODEL = "BAAI/bge-m3"

MODEL_SIMPLES = "openai/gpt-oss-120b"
MODEL_AVANCADO = "qwen/qwen3.6-27b"
MODEL_AVANCADO_2 = "llama-3.3-70b-versatile"

MODOS_VALIDOS = {'pesquisa', 'explicativo', 'imaginativo', 'simples', 'constituicao'}

NOTICIAS_FICHEIRO = os.path.join(VECTOR_PATH, "noticias.json")

class PesquisaRequest:
    def __init__(self, data):
        self.query = data.get('pergunta', '').strip()
        self.modo = data.get('modo', 'pesquisa').strip()
        self.anos = data.get('anos', []) 
        
        if not isinstance(self.anos, list):
            self.anos = [self.anos] if self.anos else []

    def validar(self):
        if not self.query or len(self.query) < 10:
            return False, 'A pergunta deve ter pelo menos 10 caracteres'
        if len(self.query) > 256:
            return False, 'A pergunta é demasiado longa (máximo 256 caracteres)'
        
        if self.modo not in MODOS_VALIDOS:
            self.modo = 'pesquisa'
            
        return True, None