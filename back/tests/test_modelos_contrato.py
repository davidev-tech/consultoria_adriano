from back.models.modelo_contrato import ModeloContrato
from back.core.database import SessionLocal

def test_criar_modelo(client, auth_headers):
    """Cria um modelo e o remove ao final."""
    payload = {"nome_modelo": "Modelo XYZ", "periodicidade_cobranca": "Quinzenal"}
    resp = client.post("/api/v1/modelos-contrato", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["nome_modelo"] == "Modelo XYZ"

    # Limpeza direta no banco
    db = SessionLocal()
    try:
        modelo = db.query(ModeloContrato).filter(ModeloContrato.id_modelo == data["id_modelo"]).first()
        if modelo:
            db.delete(modelo)
            db.commit()
    finally:
        db.close()

def test_listar_modelos(client):
    resp = client.get("/api/v1/modelos-contrato")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_arquivar_modelo(client, auth_headers):
    """Cria um modelo para arquivar, testa arquivamento e desarquivamento, e remove ao final."""
    # Cria
    resp = client.post("/api/v1/modelos-contrato", json={"nome_modelo": "Arquivar Teste"}, headers=auth_headers)
    assert resp.status_code == 200
    id_modelo = resp.json()["id_modelo"]

    # Arquiva
    patch = client.patch(f"/api/v1/modelos-contrato/{id_modelo}/arquivar", json={}, headers=auth_headers)
    assert patch.status_code == 200

    # Verifica se ativo == False
    get_resp = client.get(f"/api/v1/modelos-contrato/{id_modelo}")
    assert get_resp.status_code == 200
    assert get_resp.json()["ativo"] == False

    # Desarquiva
    client.patch(f"/api/v1/modelos-contrato/{id_modelo}/desarquivar", headers=auth_headers)

    # Limpeza direta no banco
    db = SessionLocal()
    try:
        modelo = db.query(ModeloContrato).filter(ModeloContrato.id_modelo == id_modelo).first()
        if modelo:
            db.delete(modelo)
            db.commit()
    finally:
        db.close()