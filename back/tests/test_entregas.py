import datetime

def test_criar_entrega(client, empresa_teste, modelo_contrato_teste, auth_headers):
    inicio = datetime.date.today() + datetime.timedelta(days=1)
    fim = inicio + datetime.timedelta(days=180)
    payload_contrato = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 1000,
        "data_inicio": str(inicio),
        "data_fim": str(fim)
    }
    contrato = client.post("/api/v1/contratos", json=payload_contrato, headers=auth_headers).json()

    payload_entrega = {
        "id_contrato": contrato["id_contrato"],
        "descricao_entrega": "Entrega de teste",
        "data_prazo_limite": str(inicio + datetime.timedelta(days=30))
    }
    resp = client.post("/api/v1/entregas", json=payload_entrega, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["descricao_entrega"] == "Entrega de teste"

def test_entrega_data_invalida(client, empresa_teste, modelo_contrato_teste, auth_headers):
    inicio = datetime.date.today() + datetime.timedelta(days=1)
    fim = inicio + datetime.timedelta(days=30)
    payload_contrato = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 1000,
        "data_inicio": str(inicio),
        "data_fim": str(fim)
    }
    contrato = client.post("/api/v1/contratos", json=payload_contrato, headers=auth_headers).json()

    # data anterior ao início
    payload_entrega = {
        "id_contrato": contrato["id_contrato"],
        "descricao_entrega": "Entrega inválida",
        "data_prazo_limite": str(inicio - datetime.timedelta(days=1))
    }
    resp = client.post("/api/v1/entregas", json=payload_entrega, headers=auth_headers)
    assert resp.status_code == 400