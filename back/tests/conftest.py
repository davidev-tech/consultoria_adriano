import pytest
from fastapi.testclient import TestClient
from validate_docbr import CPF, CNPJ
from back.main import app
from back.core.database import SessionLocal
from back.models.usuario import Usuario
from back.core.security import get_password_hash, create_access_token

client = TestClient(app)

@pytest.fixture(scope="session")
def auth_headers():
    """Cria um usuário de teste e retorna headers com token JWT."""
    db = SessionLocal()
    try:
        # Verifica se usuário já existe (caso o teste anterior tenha rodado)
        user = db.query(Usuario).filter(Usuario.username == "testuser").first()
        if not user:
            user = Usuario(
                username="testuser",
                hashed_password=get_password_hash("testpass")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        access_token = create_access_token(data={"sub": user.username})
        return {"Authorization": f"Bearer {access_token}"}
    finally:
        db.close()

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def novo_cnpj():
    return CNPJ().generate()

@pytest.fixture
def novo_cpf():
    return CPF().generate()

@pytest.fixture
def empresa_teste(client, novo_cnpj, auth_headers):
    """Cria uma empresa de teste e retorna seus dados. Exclui ao final."""
    payload = {
        "nome_empresa": f"Empresa Teste {novo_cnpj[:4]}",
        "cnpj": novo_cnpj,
        "ids_servicos_contratados": []
    }
    resp = client.post("/api/v1/empresas", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    yield data
    client.delete(f"/api/v1/empresas/{data['id_cliente']}", headers=auth_headers)
    del_resp = client.delete(f"/api/v1/empresas/{data['id_cliente']}", headers=auth_headers)
    assert del_resp.status_code == 204, f"Falha ao limpar empresa {data['id_cliente']}"

@pytest.fixture
def modelo_contrato_teste(client, auth_headers):
    """Cria um modelo de contrato padrão para testes e o remove após o uso."""
    payload = {
        "nome_modelo": "Modelo de Teste Automático",
        "periodicidade_cobranca": "Mensal"
    }
    resp = client.post("/api/v1/modelos-contrato", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    yield data
    # Remove o modelo ao final do teste
    client.delete(f"/api/v1/modelos-contrato/{data['id_modelo']}", headers=auth_headers)