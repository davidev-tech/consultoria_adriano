from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from dateutil.relativedelta import relativedelta
import calendar

from back.core.database import get_db
from back.core.security import get_current_user
from back.models.contrato import Contrato
from back.models.empresa_cliente import EmpresaCliente
from back.models.modelo_contrato import ModeloContrato
from back.models.fatura import Fatura
from back.schemas.contrato import ContratoCreate, ContratoResponse

router = APIRouter(prefix="/contratos", tags=["Contratos"])


@router.get("", response_model=List[ContratoResponse])
def listar_todos_contratos(
    id_cliente: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Contrato)
    if id_cliente:
        query = query.filter(Contrato.id_cliente == id_cliente)
    if status:
        query = query.filter(Contrato.status_contrato == status)
    return query.all()


@router.get("/{id_cliente}", response_model=List[ContratoResponse])
def listar_contratos_por_empresa(id_cliente: UUID, db: Session = Depends(get_db)):
    return db.query(Contrato).options(
        joinedload(Contrato.pagamentos),
        joinedload(Contrato.faturas),
        joinedload(Contrato.entregas)
    ).filter(Contrato.id_cliente == id_cliente).all()


@router.post("", response_model=ContratoResponse)
def criar_novo_contrato(
    contrato_data: ContratoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not db.query(EmpresaCliente).filter(EmpresaCliente.id_cliente == contrato_data.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    if not db.query(ModeloContrato).filter(ModeloContrato.id_modelo == contrato_data.id_modelo).first():
        raise HTTPException(status_code=404, detail="Modelo de contrato não encontrado.")

    novo_contrato = Contrato(**contrato_data.model_dump())
    db.add(novo_contrato)
    db.flush()

    data_corrente = novo_contrato.data_inicio
    data_fim = novo_contrato.data_fim
    dia_vencimento_escolhido = novo_contrato.dia_vencimento

    if data_fim:
        total_meses = (data_fim.year - data_corrente.year) * 12 + (data_fim.month - data_corrente.month)
        for i in range(total_meses + 1):
            data_alvo = novo_contrato.data_inicio + relativedelta(months=i)
            ultimo_dia_mes = calendar.monthrange(data_alvo.year, data_alvo.month)[1]
            dia_vencimento_real = min(dia_vencimento_escolhido, ultimo_dia_mes)
            vencimento_fatura = date(data_alvo.year, data_alvo.month, dia_vencimento_real)

            if vencimento_fatura >= novo_contrato.data_inicio:
                nova_fatura = Fatura(
                    id_contrato=novo_contrato.id_contrato,
                    valor_original=novo_contrato.valor_acordado,
                    data_vencimento=vencimento_fatura,
                    status="Pendente"
                )
                db.add(nova_fatura)

    db.commit()
    db.refresh(novo_contrato)
    return novo_contrato


@router.patch("/{contrato_id}/arquivar")
def arquivar_contrato(
    contrato_id: UUID,
    payload: dict = {},
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id_contrato == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado no banco")

    contrato.status_contrato = "Arquivado"
    if "motivo_arquivamento" in payload:
        contrato.motivo_arquivamento = payload["motivo_arquivamento"]

    db.commit()
    db.refresh(contrato)
    return {"mensagem": "Contrato arquivado com sucesso!", "id_contrato": str(contrato_id)}


@router.patch("/{contrato_id}/desarquivar")
def desarquivar_contrato(
    contrato_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id_contrato == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado no banco")

    hoje = date.today()
    if contrato.data_fim and contrato.data_fim < hoje:
        contrato.status_contrato = "Encerrado"
    else:
        contrato.status_contrato = "Ativo"

    db.commit()
    db.refresh(contrato)
    return {"mensagem": "Contrato desarquivado com sucesso!", "id_contrato": str(contrato_id)}


@router.patch("/{contrato_id}")
def atualizar_contrato(
    contrato_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id_contrato == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    if "motivo_arquivamento" in payload:
        contrato.motivo_arquivamento = payload["motivo_arquivamento"]
        db.commit()
        db.refresh(contrato)
    return {"mensagem": "Contrato atualizado", "id_contrato": str(contrato_id)}