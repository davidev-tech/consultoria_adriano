def test_criar_modelo(client, auth_headers):
    payload = {"nome_modelo": "Modelo XYZ", "periodicidade_cobranca": "Quinzenal"}
    resp = client.post("/api/v1/modelos-contrato", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["nome_modelo"] == "Modelo XYZ"

def test_listar_modelos(client):
    resp = client.get("/api/v1/modelos-contrato")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_arquivar_modelo(client, auth_headers):
    # Cria um modelo para arquivar
    resp = client.post("/api/v1/modelos-contrato", json={"nome_modelo": "Arquivar Teste"}, headers=auth_headers)
    assert resp.status_code == 200
    id_modelo = resp.json()["id_modelo"]

    patch = client.patch(f"/api/v1/modelos-contrato/{id_modelo}/arquivar", json={}, headers=auth_headers)
    assert patch.status_code == 200

    # Verificar se foi arquivado
    get_resp = client.get(f"/api/v1/modelos-contrato/{id_modelo}")
    assert get_resp.status_code == 200
    modelo = get_resp.json()
    assert modelo["ativo"] == False

    # Desarquivar
    client.patch(f"/api/v1/modelos-contrato/{id_modelo}/desarquivar", headers=auth_headers)