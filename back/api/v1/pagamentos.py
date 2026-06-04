from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from back.core.database import get_db
from back.core.security import get_current_user
from back.models.pagamento import Pagamento
from back.models.fatura import Fatura
from back.schemas.pagamento import PagamentoCreate, PagamentoResponse

router = APIRouter(prefix="/pagamentos", tags=["Pagamentos"])


@router.post("", response_model=PagamentoResponse)
def criar_pagamento(
    pagamento_in: PagamentoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        if pagamento_in.id_fatura:
            fatura = db.query(Fatura).filter(Fatura.id_fatura == pagamento_in.id_fatura).first()
            if not fatura:
                raise HTTPException(status_code=404, detail="Fatura não encontrada.")
        novo_pago = Pagamento(**pagamento_in.model_dump())
        db.add(novo_pago)
        db.commit()
        db.refresh(novo_pago)
        return novo_pago
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar pagamento: {str(e)}")


@router.put("/{id_pagamento}", response_model=PagamentoResponse)
def atualizar_pagamento(
    id_pagamento: UUID,
    pagamento_in: PagamentoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        pagamento = db.query(Pagamento).filter(Pagamento.id_pagamento == id_pagamento).first()
        if not pagamento:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")

        for var, value in pagamento_in.model_dump(exclude_unset=True).items():
            setattr(pagamento, var, value)

        db.commit()
        db.refresh(pagamento)
        return pagamento
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar pagamento: {str(e)}")


@router.delete("/{id_pagamento}")
def deletar_pagamento(
    id_pagamento: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        pagamento = db.query(Pagamento).filter(Pagamento.id_pagamento == id_pagamento).first()
        if not pagamento:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")

        db.delete(pagamento)
        db.commit()
        return {"mensagem": "Pagamento removido com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contrato/{id_contrato}", tags=["Pagamentos"])
def get_pagamentos_por_contrato(id_contrato: UUID, db: Session = Depends(get_db)):
    try:
        pagamentos = (
            db.query(Pagamento)
            .filter(Pagamento.id_contrato == id_contrato)
            .order_by(Pagamento.data_pagamento.desc())
            .all()
        )
        return pagamentos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar pagamentos: {str(e)}")