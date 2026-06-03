from datetime import date, timedelta
from back.schemas.contrato import ContratoCreate   # não usado diretamente


def test_listar_faturas_contrato(client, empresa_teste, modelo_contrato_teste):
    hoje = date.today()
    inicio = hoje + timedelta(days=1)
    fim = inicio + timedelta(days=365)
    contrato_payload = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 1200,
        "data_inicio": str(inicio),
        "data_fim": str(fim)
    }
    resp = client.post("/api/v1/contratos", json=contrato_payload)
    assert resp.status_code == 200
    contrato = resp.json()
    faturas = client.get(f"/api/v1/faturas?id_contrato={contrato['id_contrato']}").json()
    # 13 faturas: uma por mês, inclusive a do mês inicial
    assert len(faturas) == 13


def test_atualizar_fatura(client, empresa_teste, modelo_contrato_teste):
    hoje = date.today()
    inicio = hoje + timedelta(days=1)
    fim = inicio + timedelta(days=90)
    resp = client.post("/api/v1/contratos", json={
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 500,
        "data_inicio": str(inicio),
        "data_fim": str(fim)
    })
    assert resp.status_code == 200
    contrato = resp.json()
    faturas = client.get(f"/api/v1/faturas?id_contrato={contrato['id_contrato']}").json()
    assert len(faturas) > 0
    fatura = faturas[0]

    update_payload = {
        "id_contrato": contrato["id_contrato"],
        "valor_original": fatura["valor_original"],
        "data_vencimento": fatura["data_vencimento"],
        "status": "Pago",
        "valor_juros_pago": fatura.get("valor_juros_pago", 0.0),
        "data_pagamento": str(hoje),
        "valor_pago": 500.0
    }
    resp2 = client.put(f"/api/v1/faturas/{fatura['id_fatura']}", json=update_payload)
    if resp2.status_code != 200:
        print("PUT /faturas/ response:", resp2.status_code, resp2.text)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "Pago"