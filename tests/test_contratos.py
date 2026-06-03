import datetime

def test_criar_contrato(client, empresa_teste, modelo_contrato_teste):
    payload = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 1500.00,
        "data_inicio": str(datetime.date.today()),
        "data_fim": str(datetime.date.today() + datetime.timedelta(days=365)),
        "dia_vencimento": 15
    }
    resp = client.post("/api/v1/contratos", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["valor_acordado"] == 1500.0
    assert len(data["faturas"]) == 13   # corrigido

# Garantir que a rota de arquivar exista (código já fornecido; se faltar, adicione em contratos.py)
def test_arquivar_contrato(client, empresa_teste, modelo_contrato_teste):
    payload = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 500,
        "data_inicio": str(datetime.date.today())
    }
    resp = client.post("/api/v1/contratos", json=payload)
    assert resp.status_code == 200
    id_contrato = resp.json()["id_contrato"]

    patch = client.patch(f"/api/v1/contratos/{id_contrato}/arquivar", json={})
    assert patch.status_code == 200

def test_listar_contratos_por_empresa(client, empresa_teste):
    resp = client.get(f"/api/v1/contratos/{empresa_teste['id_cliente']}")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_arquivar_contrato(client, empresa_teste, modelo_contrato_teste):
    # Cria um contrato para arquivar
    payload = {
        "id_cliente": empresa_teste["id_cliente"],
        "id_modelo": modelo_contrato_teste["id_modelo"],
        "valor_acordado": 500,
        "data_inicio": str(datetime.date.today())
    }
    resp = client.post("/api/v1/contratos", json=payload)
    id_contrato = resp.json()["id_contrato"]

    patch = client.patch(f"/api/v1/contratos/{id_contrato}/arquivar", json={})
    assert patch.status_code == 200

    # Desarquivar
    client.patch(f"/api/v1/contratos/{id_contrato}/desarquivar")