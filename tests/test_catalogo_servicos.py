def test_listar_servicos(client):
    resp = client.get("/api/v1/catalogo-servicos")
    assert resp.status_code == 200
    # pode estar vazio, mas deve ser lista
    assert isinstance(resp.json(), list)