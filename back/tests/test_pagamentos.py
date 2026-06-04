import datetime

def test_criar_pagamento(client, empresa_teste, modelo_contrato_teste, auth_headers):
    inicio = datetime.date.today() + datetime.timedelta(days=1)
    fim = inicio + datetime.timedelta(days=60)
    payload_contrato = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 500,
        "data_inicio": str(inicio),
        "data_fim": str(fim),
        "dia_vencimento": 10
    }
    contrato = client.post("/api/v1/contratos", json=payload_contrato, headers=auth_headers).json()
    faturas = client.get(f"/api/v1/faturas?id_contrato={contrato['id_contrato']}").json()
    id_fatura = faturas[0]["id_fatura"]

    payload = {
        "id_contrato": contrato["id_contrato"],
        "id_fatura": id_fatura,
        "valor": 500.0,
        "data_pagamento": str(datetime.datetime.now().isoformat()),
        "status_pagamento": "Pago"
    }
    resp = client.post("/api/v1/pagamentos", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["valor"] == 500.0

def test_pagamento_sem_fatura(client, empresa_teste, modelo_contrato_teste, auth_headers):
    inicio = datetime.date.today() + datetime.timedelta(days=1)
    payload_contrato = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 300,
        "data_inicio": str(inicio)
    }
    contrato = client.post("/api/v1/contratos", json=payload_contrato, headers=auth_headers).json()
    payload = {
        "id_contrato": contrato["id_contrato"],
        "valor": 300.0,
        "data_pagamento": str(datetime.datetime.now().isoformat()),
        "status_pagamento": "Pago"
    }
    resp = client.post("/api/v1/pagamentos", json=payload, headers=auth_headers)
    assert resp.status_code == 200