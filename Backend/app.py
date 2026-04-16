from flask import Flask, json, request, jsonify
from flask_cors import CORS
from config import PesquisaRequest, NOTICIAS_FICHEIRO
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

        deputado_id = data.get('id')
        offset = data.get('offset', 0)
        texto = data.get('texto')
        data_inicio = data.get('data_inicio')
        data_fim = data.get('data_fim')

        # Validação do id
        if deputado_id is None or not isinstance(deputado_id, int) or deputado_id <= 0:
            return jsonify({'error': 'ID de deputado inválido'}), 400

        # Validação do offset
        if not isinstance(offset, int) or offset < 0:
            offset = 0

        resultado = pesquisa_core.get_deputado_by_id(
            deputado_id=deputado_id,
            offset=offset,
            texto=texto,
            data_inicio=data_inicio,
            data_fim=data_fim
        )

        if resultado is None:
            return jsonify({'error': 'Deputado não encontrado'}), 404

        return jsonify(resultado), 200

    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({'error': 'Erro interno'}), 500



# ==================== QUIZ ====================

@app.route('/api/quiz', methods=['GET'])
def api_quiz():
    try:
        pergunta = pesquisa_core.obtem_quiz()
        if not pergunta:
            return jsonify({'error': 'Não foi possível obter'}), 500
        return jsonify(pergunta)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== NOTÍCIAS ====================

@app.route('/api/noticias', methods=['GET'])
def api_noticias():
    try:
        with open(NOTICIAS_FICHEIRO, 'r', encoding='utf-8') as f:
            dados = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify({'noticias': [], 'resumo': '', 'atualizado_em': None})

    todas = dados['noticias']

    return jsonify({
        'noticias': todas,
        'total': len(todas),
        'resumo': dados.get('resumo', ''),
        'atualizado_em': dados.get('atualizado_em')
    })

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
    print(f"servidor ligado")
