def test_pendencias(client):
    resp = client.get("/api/v1/pendencias")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)