from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.catalogo_servico import CatalogoServico
from app.schemas.common import ServicoDetalhe

router = APIRouter(prefix="/catalogo-servicos", tags=["Catálogo de Serviços"])

@router.get("", response_model=List[ServicoDetalhe])
def listar_catalogo_servicos(db: Session = Depends(get_db)):
    return db.query(CatalogoServico).all()