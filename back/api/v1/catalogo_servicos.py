from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from back.core.database import get_db
from back.models.catalogo_servico import CatalogoServico
from back.schemas.common import ServicoDetalhe

router = APIRouter(prefix="/catalogo-servicos", tags=["Catálogo de Serviços"])

@router.get("", response_model=List[ServicoDetalhe])
def listar_catalogo_servicos(db: Session = Depends(get_db)):
    return db.query(CatalogoServico).all()