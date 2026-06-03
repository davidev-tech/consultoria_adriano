def test_dashboard_kpis(client):
    resp = client.get("/api/v1/dashboard/kpis")
    assert resp.status_code == 200
    data = resp.json()
    assert "empresas_total" in data
    assert "contratos_ativos" in data
    assert "receita_acordada" in data