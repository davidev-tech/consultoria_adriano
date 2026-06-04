from datetime import date, timedelta

def test_listar_faturas_contrato(client, empresa_teste, modelo_contrato_teste, auth_headers):
    inicio = date.today() + timedelta(days=1)
    fim = inicio + timedelta(days=365)
    contrato_payload = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 1200,
        "data_inicio": str(inicio),
        "data_fim": str(fim)
    }
    resp = client.post("/api/v1/contratos", json=contrato_payload, headers=auth_headers)
    assert resp.status_code == 200
    contrato = resp.json()
    faturas = client.get(f"/api/v1/faturas?id_contrato={contrato['id_contrato']}").json()
    assert len(faturas) == 13

def test_atualizar_fatura(client, empresa_teste, modelo_contrato_teste, auth_headers):
    inicio = date.today() + timedelta(days=1)
    fim = inicio + timedelta(days=90)
    resp = client.post("/api/v1/contratos", json={
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 500,
        "data_inicio": str(inicio),
        "data_fim": str(fim)
    }, headers=auth_headers)
    assert resp.status_code == 200
    contrato = resp.json()
    faturas = client.get(f"/api/v1/faturas?id_contrato={contrato['id_contrato']}").json()
    fatura = faturas[0]

    update_payload = {
        "id_contrato": contrato["id_contrato"],
        "valor_original": fatura["valor_original"],
        "data_vencimento": fatura["data_vencimento"],
        "status": "Pago",
        "valor_juros_pago": 0.01,
        "data_pagamento": str(date.today()),
        "valor_pago": 500.0
    }
    resp2 = client.put(f"/api/v1/faturas/{fatura['id_fatura']}", json=update_payload, headers=auth_headers)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "Pago"