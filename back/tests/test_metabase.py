def test_metabase_token(client):
    resp = client.get("/api/v1/metabase/token/contratos")
    assert resp.status_code == 200
    assert "token" in resp.json()