from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from back.core.database import get_db
from back.core.security import get_current_user
from back.models.fatura import Fatura
from back.schemas.fatura import FaturaCreate, FaturaResponse

router = APIRouter(prefix="/faturas", tags=["Faturas"])


@router.get("", response_model=List[FaturaResponse])
def listar_faturas(id_contrato: UUID = None, db: Session = Depends(get_db)):
    query = db.query(Fatura)
    if id_contrato:
        query = query.filter(Fatura.id_contrato == id_contrato)
    return query.all()


@router.post("", response_model=FaturaResponse)
def criar_fatura(
    fatura_in: FaturaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    nova_fatura = Fatura(**fatura_in.model_dump())
    db.add(nova_fatura)
    db.commit()
    db.refresh(nova_fatura)
    return nova_fatura


@router.put("/{id_fatura}", response_model=FaturaResponse)
def atualizar_fatura(
    id_fatura: UUID,
    fatura_in: FaturaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    fatura = db.query(Fatura).filter(Fatura.id_fatura == id_fatura).first()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada.")

    for var, value in fatura_in.model_dump(exclude_unset=True).items():
        setattr(fatura, var, value)

    db.commit()
    db.refresh(fatura)
    return fatura


@router.delete("/{id_fatura}")
def deletar_fatura(
    id_fatura: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    fatura = db.query(Fatura).filter(Fatura.id_fatura == id_fatura).first()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada.")

    db.delete(fatura)
    db.commit()
    return {"mensagem": "Fatura removida com sucesso"}