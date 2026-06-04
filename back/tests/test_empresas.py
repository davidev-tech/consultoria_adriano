from validate_docbr import CNPJ

def test_listar_empresas(client):
    response = client.get("/api/v1/empresas")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_criar_empresa(client, novo_cnpj, auth_headers):
    payload = {
        "nome_empresa": "Empresa Única",
        "cnpj": novo_cnpj,
        "ids_servicos_contratados": []
    }
    response = client.post("/api/v1/empresas", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["nome_empresa"] == "Empresa Única"
    assert data["cnpj"] == novo_cnpj
    assert "id_cliente" in data
    # limpeza
    client.delete(f"/api/v1/empresas/{data['id_cliente']}", headers=auth_headers)

def test_cnpj_duplicado(client, novo_cnpj, auth_headers):
    payload = {"nome_empresa": "Duplicada", "cnpj": novo_cnpj}
    primeira = client.post("/api/v1/empresas", json=payload, headers=auth_headers)
    assert primeira.status_code == 201
    id_empresa = primeira.json()["id_cliente"]

    segunda = client.post("/api/v1/empresas", json=payload, headers=auth_headers)
    assert segunda.status_code == 400
    assert "já está cadastrado" in segunda.json()["detail"]

    client.delete(f"/api/v1/empresas/{id_empresa}", headers=auth_headers)

def test_obter_empresa_por_id(client, empresa_teste):
    id_cliente = empresa_teste["id_cliente"]
    response = client.get(f"/api/v1/empresas/{id_cliente}")
    assert response.status_code == 200
    data = response.json()
    assert data["id_cliente"] == id_cliente

def test_obter_empresa_inexistente(client):
    response = client.get("/api/v1/empresas/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert "não encontrada" in response.json()["detail"]

def test_atualizar_empresa(client, empresa_teste, auth_headers):
    id_cliente = empresa_teste["id_cliente"]
    novo_nome = "Nome Atualizado"
    payload = {
        "nome_empresa": novo_nome,
        "cnpj": empresa_teste["cnpj"],
        "ids_servicos_contratados": []
    }
    response = client.put(f"/api/v1/empresas/{id_cliente}", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["nome_empresa"] == novo_nome

def test_excluir_empresa(client, novo_cnpj, auth_headers):
    payload = {"nome_empresa": "Para excluir", "cnpj": novo_cnpj}
    resp = client.post("/api/v1/empresas", json=payload, headers=auth_headers)
    id_empresa = resp.json()["id_cliente"]

    delete_resp = client.delete(f"/api/v1/empresas/{id_empresa}", headers=auth_headers)
    assert delete_resp.status_code == 204

    get_resp = client.get(f"/api/v1/empresas/{id_empresa}")
    assert get_resp.status_code == 404

def test_criar_empresa_sem_cnpj(client, auth_headers):
    payload = {"nome_empresa": "Sem CNPJ", "ids_servicos_contratados": []}
    resp = client.post("/api/v1/empresas", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    client.delete(f"/api/v1/empresas/{resp.json()['id_cliente']}", headers=auth_headers)

def test_cnpj_invalido(client, auth_headers):
    payload = {"nome_empresa": "CNPJ ruim", "cnpj": "00000000000000"}
    resp = client.post("/api/v1/empresas", json=payload, headers=auth_headers)
    assert resp.status_code == 422