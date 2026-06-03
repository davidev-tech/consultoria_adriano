from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.empresa_cliente import EmpresaCliente
from app.models.contrato import Contrato

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/kpis")
def obter_kpis_dashboard(db: Session = Depends(get_db)):
    total_empresas = db.query(EmpresaCliente).count()
    total_ativos = db.query(Contrato).filter(Contrato.status_contrato == "Ativo").count()
    soma_receita = db.query(func.sum(Contrato.valor_acordado)).filter(Contrato.status_contrato == "Ativo").scalar() or 0
    return {
        "empresas_total": total_empresas,
        "contratos_ativos": total_ativos,
        "receita_acordada": float(soma_receita)
    }