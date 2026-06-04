def test_criar_interacao(client, empresa_teste, auth_headers):
    payload = {
        "id_cliente": empresa_teste["id_cliente"],
        "tipo_interacao": "visita",
        "feedback_anotacoes": "Tudo ok",
        "status_financeiro": "Não Cobrado"
    }
    resp = client.post("/api/v1/interacoes", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["tipo_interacao"] == "visita"
    client.delete(f"/api/v1/interacoes/{data['id_interacao']}", headers=auth_headers)

def test_listar_interacoes_por_cliente(client, empresa_teste):
    resp = client.get(f"/api/v1/interacoes/{empresa_teste['id_cliente']}")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_atualizar_interacao(client, empresa_teste, auth_headers):
    payload = {"id_cliente": empresa_teste["id_cliente"], "tipo_interacao": "visita"}
    resp = client.post("/api/v1/interacoes", json=payload, headers=auth_headers)
    id_interacao = resp.json()["id_interacao"]

    update = {"feedback_anotacoes": "Atualizado"}
    put_resp = client.put(f"/api/v1/interacoes/{id_interacao}", json=update, headers=auth_headers)
    assert put_resp.status_code == 200
    assert put_resp.json()["feedback_anotacoes"] == "Atualizado"

    client.delete(f"/api/v1/interacoes/{id_interacao}", headers=auth_headers)

def test_interacoes_pagas(client, empresa_teste, auth_headers):
    payload = {
        "id_cliente": empresa_teste["id_cliente"],
        "tipo_interacao": "visita",
        "status_financeiro": "Paga",
        "valor_cobrado": 100.0,
        "status_pagamento": "Pendente"
    }
    resp = client.post("/api/v1/interacoes", json=payload, headers=auth_headers)
    id_int = resp.json()["id_interacao"]

    pagas_resp = client.get("/api/v1/interacoes/pagas")
    assert pagas_resp.status_code == 200
    ids_pagas = [i["id_interacao"] for i in pagas_resp.json()]
    assert id_int in ids_pagas

    total_resp = client.get("/api/v1/interacoes/pagas/total")
    assert total_resp.status_code == 200
    assert total_resp.json()["total_interacoes"] >= 1

    client.delete(f"/api/v1/interacoes/{id_int}", headers=auth_headers)