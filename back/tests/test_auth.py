from fastapi.testclient import TestClient
from back.main import app

client = TestClient(app)

USERNAME = "Funcionario"
PASSWORD = "Funcionario123"


def test_register_new_user():
    """Cria um novo usuário e verifica se retorna token."""
    payload = {"username": USERNAME, "password": PASSWORD}
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_user():
    """Tenta criar o mesmo usuário novamente e espera erro 400."""
    payload = {"username": USERNAME, "password": PASSWORD}
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 400
    assert "já existe" in resp.json()["detail"]


def test_login_valid():
    """Faz login com credenciais corretas e retorna token."""
    payload = {"username": USERNAME, "password": PASSWORD}
    resp = client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


def test_login_invalid():
    """Login com senha errada retorna 401."""
    payload = {"username": USERNAME, "password": "wrongpass"}
    resp = client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 401


def test_protected_route_without_token():
    """Tenta criar empresa sem token e recebe 401."""
    payload = {"nome_empresa": "Teste Protegido", "ids_servicos_contratados": []}
    resp = client.post("/api/v1/empresas", json=payload)
    assert resp.status_code == 401


def test_protected_route_with_token():
    """Cria empresa com token válido e obtém sucesso (201)."""
    # Faz login para obter token
    login_resp = client.post("/api/v1/auth/login", json={"username": USERNAME, "password": PASSWORD})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"nome_empresa": "Empresa Protegida", "ids_servicos_contratados": []}
    resp = client.post("/api/v1/empresas", json=payload, headers=headers)
    assert resp.status_code == 201
    # Limpeza
    id_empresa = resp.json()["id_cliente"]
    client.delete(f"/api/v1/empresas/{id_empresa}", headers=headers)