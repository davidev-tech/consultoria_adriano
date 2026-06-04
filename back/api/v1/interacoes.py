from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID

from back.core.database import get_db
from back.core.security import get_current_user
from back.models.historico_interacoes import HistoricoInteracoes
from back.models.empresa_cliente import EmpresaCliente
from back.schemas.interacao import InteracaoCreate, InteracaoResponse

router = APIRouter(prefix="/interacoes", tags=["Interações"])


@router.get("/pagas", response_model=List[InteracaoResponse])
def listar_interacoes_pagas(
    id_cliente: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(HistoricoInteracoes).filter(HistoricoInteracoes.status_financeiro == "Paga")
        if id_cliente:
            if not db.query(EmpresaCliente).filter(EmpresaCliente.id_cliente == id_cliente).first():
                raise HTTPException(status_code=404, detail="Empresa não encontrada.")
            query = query.filter(HistoricoInteracoes.id_cliente == id_cliente)
        interacoes = query.order_by(HistoricoInteracoes.data_hora.desc()).offset(skip).limit(limit).all()
        return interacoes
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar interações pagas: {str(e)}")


@router.get("/pagas/total")
def total_interacoes_pagas(id_cliente: Optional[UUID] = Query(None), db: Session = Depends(get_db)):
    try:
        query = db.query(
            func.count(HistoricoInteracoes.id_interacao).label('total_interacoes'),
            func.coalesce(func.sum(HistoricoInteracoes.valor_cobrado), 0).label('total_valor')
        ).filter(HistoricoInteracoes.status_financeiro == "Paga")
        if id_cliente:
            query = query.filter(HistoricoInteracoes.id_cliente == id_cliente)
        resultado = query.first()
        if resultado is None:
            return {"total_interacoes": 0, "total_valor": 0.0}
        return {"total_interacoes": resultado.total_interacoes, "total_valor": float(resultado.total_valor)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao calcular totais: {str(e)}")


@router.get("/{id_cliente}", response_model=List[InteracaoResponse])
def get_interacoes_por_cliente(id_cliente: UUID, db: Session = Depends(get_db)):
    try:
        interacoes = (
            db.query(HistoricoInteracoes)
            .filter(HistoricoInteracoes.id_cliente == id_cliente)
            .order_by(HistoricoInteracoes.data_hora.desc())
            .all()
        )
        return interacoes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar interações: {str(e)}")


@router.post("", response_model=InteracaoResponse)
def criar_interacao(
    obj_in: InteracaoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not db.query(EmpresaCliente).filter(EmpresaCliente.id_cliente == obj_in.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    novo_obj = HistoricoInteracoes(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj


@router.put("/{id_interacao}", response_model=InteracaoResponse)
def atualizar_interacao(
    id_interacao: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_interacao = db.query(HistoricoInteracoes).filter(HistoricoInteracoes.id_interacao == id_interacao).first()
    if not db_interacao:
        raise HTTPException(status_code=404, detail="Interação não encontrada")

    if "tipo_interacao" in payload and payload["tipo_interacao"]:
        tipo_formatado = payload["tipo_interacao"].strip().lower()
        if tipo_formatado not in ["visita", "reunião", "mensagem", "ligação", "e-mail"]:
            raise HTTPException(status_code=400, detail="Valor inválido. Use: visita, reunião, mensagem, ligação, e-mail")
        db_interacao.tipo_interacao = tipo_formatado

    if "data_hora" in payload:
        db_interacao.data_hora = payload["data_hora"]
    if "feedback_anotacoes" in payload:
        db_interacao.feedback_anotacoes = payload["feedback_anotacoes"]
    if "grau_urgencia" in payload:
        db_interacao.grau_urgencia = payload["grau_urgencia"]
    if "status_financeiro" in payload:
        db_interacao.status_financeiro = payload["status_financeiro"]
    if "valor_cobrado" in payload:
        db_interacao.valor_cobrado = payload["valor_cobrado"]
    if "status_pagamento" in payload:
        db_interacao.status_pagamento = payload["status_pagamento"]
    if "nota" in payload:
        db_interacao.nota = payload["nota"]

    try:
        db.commit()
        db.refresh(db_interacao)
        return db_interacao
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar: {str(e)}")


@router.delete("/{id_interacao}")
def deletar_interacao(
    id_interacao: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_interacao = db.query(HistoricoInteracoes).filter(HistoricoInteracoes.id_interacao == id_interacao).first()
    if not db_interacao:
        raise HTTPException(status_code=404, detail="Interação não encontrada")
    try:
        db.delete(db_interacao)
        db.commit()
        return {"mensagem": "Interação removida com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao deletar: {str(e)}")