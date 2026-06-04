from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from back.core.database import get_db
from back.core.security import get_current_user
from back.models.modelo_contrato import ModeloContrato
from back.schemas.modelo_contrato import ModeloContratoCreate, ModeloContratoResponse

router = APIRouter(prefix="/modelos-contrato", tags=["Modelos de Contrato"])


@router.get("", response_model=List[ModeloContratoResponse])
def listar_modelos(
    busca: Optional[str] = Query(None, description="Busca por nome do modelo"),
    db: Session = Depends(get_db)
):
    query = db.query(ModeloContrato)
    if busca:
        query = query.filter(ModeloContrato.nome_modelo.ilike(f"%{busca}%"))
    return query.all()


@router.post("", response_model=ModeloContratoResponse)
def criar_modelo(
    obj_in: ModeloContratoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    novo_obj = ModeloContrato(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj


@router.put("/{id_modelo}", response_model=ModeloContratoResponse)
def atualizar_modelo_completo(
    id_modelo: UUID,
    modelo_atualizado: ModeloContratoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    modelo_db = db.query(ModeloContrato).filter(ModeloContrato.id_modelo == id_modelo).first()
    if not modelo_db:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    update_data = modelo_atualizado.model_dump(exclude_unset=True)
    for var, value in update_data.items():
        setattr(modelo_db, var, value)

    db.add(modelo_db)
    db.commit()
    db.refresh(modelo_db)
    return modelo_db


@router.get("/{id_modelo}", response_model=ModeloContratoResponse)
def obter_modelo(id_modelo: UUID, db: Session = Depends(get_db)):
    modelo = db.query(ModeloContrato).filter(ModeloContrato.id_modelo == id_modelo).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    return modelo


@router.patch("/{id_modelo}/arquivar")
def arquivar_modelo(
    id_modelo: UUID,
    payload: dict = {},
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    modelo = db.query(ModeloContrato).filter(ModeloContrato.id_modelo == id_modelo).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    modelo.ativo = False
    if "motivo_arquivamento" in payload:
        modelo.motivo_arquivamento = payload["motivo_arquivamento"]

    db.commit()
    db.refresh(modelo)
    return {"mensagem": "Modelo arquivado com sucesso", "id_modelo": str(id_modelo)}


@router.patch("/{id_modelo}/desarquivar")
def desarquivar_modelo(
    id_modelo: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    modelo = db.query(ModeloContrato).filter(ModeloContrato.id_modelo == id_modelo).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    modelo.ativo = True
    db.commit()
    db.refresh(modelo)
    return {"mensagem": "Modelo desarquivado com sucesso!", "id_modelo": str(id_modelo)}


@router.patch("/{id_modelo}")
def atualizar_modelo(
    id_modelo: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    modelo = db.query(ModeloContrato).filter(ModeloContrato.id_modelo == id_modelo).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    if "motivo_arquivamento" in payload:
        modelo.motivo_arquivamento = payload["motivo_arquivamento"]
        db.commit()
        db.refresh(modelo)
    return {"mensagem": "Modelo atualizado", "id_modelo": str(id_modelo)}