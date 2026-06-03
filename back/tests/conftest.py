import pytest
from fastapi.testclient import TestClient
from validate_docbr import CPF, CNPJ
from back.main import app

@pytest.fixture
def client():
    """Fornece um cliente de teste para a API."""
    return TestClient(app)

@pytest.fixture
def novo_cnpj():
    """Gera um CNPJ válido aleatório."""
    return CNPJ().generate()

@pytest.fixture
def novo_cpf():
    """Gera um CPF válido aleatório."""
    return CPF().generate()

@pytest.fixture
def empresa_teste(client, novo_cnpj):
    """Cria uma empresa de teste e retorna seus dados. Exclui ao final."""
    payload = {
        "nome_empresa": f"Empresa Teste {novo_cnpj[:4]}",
        "cnpj": novo_cnpj,
        "ids_servicos_contratados": []
    }
    resp = client.post("/api/v1/empresas", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    yield data
    client.delete(f"/api/v1/empresas/{data['id_cliente']}")

@pytest.fixture
def modelo_contrato_teste(client):
    """Cria um modelo de contrato padrão para testes."""
    payload = {
        "nome_modelo": "Modelo de Teste Automático",
        "periodicidade_cobranca": "Mensal"
    }
    resp = client.post("/api/v1/modelos-contrato", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    yield data
    # Não há endpoint para excluir modelo (opcional), então mantemos
    # mas o modelo pode ser reutilizado.