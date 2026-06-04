import datetime
from datetime import date, timedelta

def test_criar_contrato(client, empresa_teste, modelo_contrato_teste, auth_headers):
    inicio = date.today() + timedelta(days=1)
    fim = inicio + timedelta(days=365)
    payload = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 1500.00,
        "data_inicio": str(inicio),
        "data_fim": str(fim),
        "dia_vencimento": 15
    }
    resp = client.post("/api/v1/contratos", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["valor_acordado"] == 1500.0
    assert len(data["faturas"]) == 13

def test_criar_contrato_empresa_inexistente(client, modelo_contrato_teste, auth_headers):
    payload = {
        "id_cliente": "00000000-0000-0000-0000-000000000000",
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 100,
        "data_inicio": str(date.today() + timedelta(days=1))
    }
    resp = client.post("/api/v1/contratos", json=payload, headers=auth_headers)
    assert resp.status_code == 404

def test_listar_contratos_por_empresa(client, empresa_teste):
    resp = client.get(f"/api/v1/contratos/{empresa_teste['id_cliente']}")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_arquivar_contrato(client, empresa_teste, modelo_contrato_teste, auth_headers):
    inicio = date.today() + timedelta(days=1)
    payload = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 500,
        "data_inicio": str(inicio)
    }
    resp = client.post("/api/v1/contratos", json=payload, headers=auth_headers)
    id_contrato = resp.json()["id_contrato"]

    patch = client.patch(f"/api/v1/contratos/{id_contrato}/arquivar", json={}, headers=auth_headers)
    assert patch.status_code == 200

    # Desarquivar
    client.patch(f"/api/v1/contratos/{id_contrato}/desarquivar", headers=auth_headers)