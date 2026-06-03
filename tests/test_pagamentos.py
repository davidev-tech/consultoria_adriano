import datetime

def test_criar_pagamento(client, empresa_teste, modelo_contrato_teste):
    # cria contrato com fatura
    payload_contrato = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 500,
        "data_inicio": str(datetime.date.today()),
        "data_fim": str(datetime.date.today() + datetime.timedelta(days=60)),
        "dia_vencimento": 10
    }
    contrato = client.post("/api/v1/contratos", json=payload_contrato).json()
    id_contrato = contrato["id_contrato"]
    # obtém a primeira fatura
    faturas = client.get(f"/api/v1/faturas?id_contrato={id_contrato}").json()
    id_fatura = faturas[0]["id_fatura"]

    payload = {
        "id_contrato": id_contrato,
        "id_fatura": id_fatura,
        "valor": 500.0,
        "data_pagamento": str(datetime.datetime.now().isoformat()),
        "status_pagamento": "Pago"
    }
    resp = client.post("/api/v1/pagamentos", json=payload)
    assert resp.status_code == 200
    assert resp.json()["valor"] == 500.0

def test_pagamento_sem_fatura(client, empresa_teste, modelo_contrato_teste):
    # Cria contrato sem data_fim (apenas início)
    payload_contrato = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 300,
        "data_inicio": str(datetime.date.today())
    }
    resp = client.post("/api/v1/contratos", json=payload_contrato)
    assert resp.status_code == 200
    contrato = resp.json()
    id_contrato = contrato["id_contrato"]
    payload = {
        "id_contrato": id_contrato,
        "valor": 300.0,
        "data_pagamento": str(datetime.datetime.now().isoformat()),
        "status_pagamento": "Pago"
    }
    resp = client.post("/api/v1/pagamentos", json=payload)
    # Pode retornar 200 ou 201 dependendo da implementação
    assert resp.status_code in [200, 201]