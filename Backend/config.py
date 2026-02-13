import os

# Configurações
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VECTOR_PATH = os.path.join(BASE_DIR, "base_dados")

GROQ_KEY = "CHAVE_GROQ"

EMBED_MODEL = "BAAI/bge-m3"
MODEL_SIMPLES = "llama-3.1-8b-instant"
MODEL_AVANCADO = "qwen/qwen3-32b"
MODEL_AVANCADO_2 = "meta-llama/llama-4-scout-17b-16e-instruct"
MODEL_AVANCADO_3 = "llama-3.3-70b-versatile"


RESPOSTA_MODEL = MODEL_SIMPLES

MODOS_VALIDOS = {'pesquisa', 'explicativo', 'imaginativo', 'simples', 'constituicao'}

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