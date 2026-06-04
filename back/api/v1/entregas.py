from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from back.core.database import get_db
from back.core.security import get_current_user
from back.models.entrega import Entrega
from back.models.contrato import Contrato
from back.schemas.entrega import EntregaCreate, EntregaResponse

router = APIRouter(prefix="/entregas", tags=["Entregas"])


@router.get("", response_model=List[EntregaResponse])
def listar_entregas(
    id_contrato: Optional[UUID] = Query(None),
    status_entrega: Optional[str] = Query(None),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Entrega)
    if id_contrato:
        query = query.filter(Entrega.id_contrato == id_contrato)
    if status_entrega:
        query = query.filter(Entrega.status_entrega == status_entrega)
    if data_inicio:
        query = query.filter(Entrega.data_prazo_limite >= data_inicio)
    if data_fim:
        query = query.filter(Entrega.data_prazo_limite <= data_fim)
    return query.order_by(Entrega.data_prazo_limite.asc()).all()


@router.post("", response_model=EntregaResponse)
def criar_entrega(
    obj_in: EntregaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id_contrato == obj_in.id_contrato).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado.")

    if obj_in.data_prazo_limite:
        if contrato.data_inicio and obj_in.data_prazo_limite < contrato.data_inicio:
            raise HTTPException(status_code=400, detail="A data da entrega não pode ser anterior ao início do contrato.")
        if contrato.data_fim and obj_in.data_prazo_limite > contrato.data_fim:
            raise HTTPException(status_code=400, detail="A data da entrega não pode ser posterior ao fim do contrato.")

    nova = Entrega(**obj_in.model_dump())
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


@router.put("/{id_entrega}", response_model=EntregaResponse)
def atualizar_entrega(
    id_entrega: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    entrega = db.query(Entrega).filter(Entrega.id_entrega == id_entrega).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")

    if "descricao_entrega" in payload:
        entrega.descricao_entrega = payload["descricao_entrega"]
    if "data_prazo_limite" in payload:
        entrega.data_prazo_limite = payload["data_prazo_limite"]
    if "status_entrega" in payload:
        entrega.status_entrega = payload["status_entrega"]
        if payload["status_entrega"] == "Concluído" and "data_conclusao" not in payload:
            entrega.data_conclusao = date.today()
    if "data_conclusao" in payload and payload["data_conclusao"]:
        try:
            data_str = payload["data_conclusao"]
            if isinstance(data_str, str) and "T" in data_str:
                data_str = data_str.split("T")[0]
            entrega.data_conclusao = date.fromisoformat(data_str)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Formato de data inválido. Use YYYY-MM-DD. Erro: {str(e)}")

    try:
        db.commit()
        db.refresh(entrega)
        return entrega
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id_entrega}")
def deletar_entrega(
    id_entrega: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    entrega = db.query(Entrega).filter(Entrega.id_entrega == id_entrega).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
    db.delete(entrega)
    db.commit()
    return {"mensagem": "Entrega removida com sucesso"}