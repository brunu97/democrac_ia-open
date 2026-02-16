from flask import Flask, request, jsonify
from flask_cors import CORS
from config import PesquisaRequest
import pesquisar

app = Flask(__name__)
pesquisa_core = pesquisar.Pesquisar()
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://democrac-ia.pt",
            "https://www.democrac-ia.pt",
            "http://localhost:4200"
        ]
    }
})

print("=== Carrega Dados ===")
if not pesquisa_core.carrega_dados():
    print("Falha ao carregar dados!")

@app.route('/api/pesquisa', methods=['POST'])
def api_pesquisa():
    try:
        data = request.get_json()
        req_pesquisa = PesquisaRequest(data)
        is_valido, erro = req_pesquisa.validar()
        
        if not is_valido:
            return jsonify({'error': erro}), 400
        
        resposta = "Pesquisa realizada com sucesso."
        
        if not req_pesquisa.modo == "constituicao":
            # Realizar pesquisa
            resultados = pesquisa_core.pesquisa(req_pesquisa.query, req_pesquisa.modo, req_pesquisa.anos)
            
            # Gerar resposta
            if not req_pesquisa.modo == 'simples':
                resposta = pesquisa_core.gera_resposta(req_pesquisa.query, resultados, req_pesquisa.modo)
        else:
            # Realizar pesquisa e resposta
            resultados, resposta = pesquisa_core.pesquisa_constituicao(req_pesquisa.query)

        return jsonify({
            'resposta': resposta,
            'fontes': resultados
        })
        
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/lista-oradores', methods=['GET'])
def api_oradores():
    try:
        return pesquisa_core.get_oradores_lista()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tabela', methods=['POST'])
def get_tabela():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON inválido'}), 400
        
        nome = data.get('nome')
        offset = data.get('offset', 0)
        texto = data.get('texto')
        data_inicio = data.get('data_inicio')
        data_fim = data.get('data_fim')
        
        # Validação do nome
        if not nome or not isinstance(nome, str) or len(nome) > 200:
            return jsonify({'error': 'Nome inválido'}), 400
        
        # Validação do offset
        if not isinstance(offset, int) or offset < 0:
            offset = 0
        
        # Chamar o método com os parâmetros
        resultado = pesquisa_core.get_deputado(
            nome=nome, 
            offset=offset, 
            texto=texto,
            data_inicio=data_inicio,
            data_fim=data_fim
        )
        
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({'error': 'Erro interno'}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
    print(f"servidor ligado")
