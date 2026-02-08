import os

# Configurações
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VECTOR_PATH = os.path.join(BASE_DIR, "base_dados")
EMBED_MODEL = "BAAI/bge-m3"
RESPOSTA_MODEL = "llama-3.1-8b-instant"
GROQ_KEY = "CHAVE_AQUI"



class PesquisaRequest:
    MODOS_VALIDOS = {'pesquisa', 'explicativo', 'imaginativo', 'simples'}

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
        
        if self.modo not in self.MODOS_VALIDOS:
            self.modo = 'pesquisa'
            
        return True, None