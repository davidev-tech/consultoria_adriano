import datetime

def test_criar_entrega(client, empresa_teste, modelo_contrato_teste):
    # cria um contrato primeiro
    payload_contrato = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 1000,
        "data_inicio": str(datetime.date.today()),
        "data_fim": str(datetime.date.today() + datetime.timedelta(days=180))
    }
    contrato = client.post("/api/v1/contratos", json=payload_contrato).json()

    payload_entrega = {
        "id_contrato": contrato["id_contrato"],
        "descricao_entrega": "Entrega de teste",
        "data_prazo_limite": str(datetime.date.today() + datetime.timedelta(days=30))
    }
    resp = client.post("/api/v1/entregas", json=payload_entrega)
    assert resp.status_code == 200
    assert resp.json()["descricao_entrega"] == "Entrega de teste"

def test_entrega_data_invalida(client, empresa_teste, modelo_contrato_teste):
    payload_contrato = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 1000,
        "data_inicio": str(datetime.date.today()),
        "data_fim": str(datetime.date.today() + datetime.timedelta(days=30))
    }
    contrato = client.post("/api/v1/contratos", json=payload_contrato).json()

    # data anterior ao início do contrato
    payload_entrega = {
        "id_contrato": contrato["id_contrato"],
        "descricao_entrega": "Entrega inválida",
        "data_prazo_limite": str(datetime.date.today() - datetime.timedelta(days=1))
    }
    resp = client.post("/api/v1/entregas", json=payload_entrega)
    assert resp.status_code == 400