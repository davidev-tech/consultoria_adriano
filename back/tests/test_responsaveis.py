from fastapi.testclient import TestClient
from back.main import app
from validate_docbr import CPF

client = TestClient(app)

def test_criar_responsavel(client, empresa_teste, novo_cpf):
    payload = {
        "id_cliente": str(empresa_teste["id_cliente"]),  # garanta string
        "nome": "Responsavel Teste",
        "cpf": novo_cpf,
        "cargo": "Gerente"
    }
    resp = client.post("/api/v1/responsaveis", json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["nome"] == "Responsavel Teste"
    # limpeza
    client.delete(f"/api/v1/responsaveis/{data['id_responsavel']}")

def test_cpf_duplicado(client, empresa_teste, novo_cpf):
    payload = {
        "id_cliente": str(empresa_teste["id_cliente"]),
        "nome": "Resp1",
        "cpf": novo_cpf,
        "cargo": ""
    }
    r1 = client.post("/api/v1/responsaveis", json=payload)
    assert r1.status_code == 201, r1.text
    id1 = r1.json()["id_responsavel"]

    r2 = client.post("/api/v1/responsaveis", json=payload)
    assert r2.status_code == 400
    assert "já cadastrado" in r2.json()["detail"]

    client.delete(f"/api/v1/responsaveis/{id1}")

def test_listar_responsaveis_por_empresa(client, empresa_teste):
    resp = client.get(f"/api/v1/responsaveis/lista?id_cliente={empresa_teste['id_cliente']}")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_atualizar_responsavel(client, empresa_teste, novo_cpf):
    payload = {"id_cliente": str(empresa_teste["id_cliente"]), "nome": "Antigo", "cpf": novo_cpf, "cargo": "Teste"}
    resp = client.post("/api/v1/responsaveis", json=payload)
    id_resp = resp.json()["id_responsavel"]

    update = {"nome": "Novo Nome"}
    resp_put = client.put(f"/api/v1/responsaveis/{id_resp}", json=update)
    assert resp_put.status_code == 200
    assert resp_put.json()["nome"] == "Novo Nome"

    client.delete(f"/api/v1/responsaveis/{id_resp}")

def test_excluir_responsavel(client, empresa_teste, novo_cpf):
    payload = {"id_cliente": str(empresa_teste["id_cliente"]), "nome": "Excluir", "cpf": novo_cpf, "cargo": ""}
    resp = client.post("/api/v1/responsaveis", json=payload)
    id_resp = resp.json()["id_responsavel"]

    del_resp = client.delete(f"/api/v1/responsaveis/{id_resp}")
    assert del_resp.status_code == 204

    get_resp = client.get(f"/api/v1/responsaveis/lista?id_cliente={empresa_teste['id_cliente']}")
    ids = [r["id_responsavel"] for r in get_resp.json()]
    assert id_resp not in ids