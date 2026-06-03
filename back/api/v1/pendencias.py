from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from back.core.database import get_db
from back.models.fatura import Fatura
from back.models.entrega import Entrega
from back.models.contrato import Contrato
from back.schemas.common import PendenciaResponse

router = APIRouter(prefix="/pendencias", tags=["Pendências"])

@router.get("", response_model=List[PendenciaResponse])
def listar_pendencias(
    id_cliente: Optional[UUID] = Query(None),
    tipo: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    resultados = []

    if not tipo or tipo == "financeira":
        faturas_query = db.query(Fatura).join(Contrato).filter(Fatura.status.in_(["Pendente", "Atrasado"]))
        if id_cliente:
            faturas_query = faturas_query.filter(Contrato.id_cliente == id_cliente)
        for fatura in faturas_query.all():
            contrato = fatura.contrato
            empresa = contrato.empresa if contrato else None
            resultados.append({
                "id": str(fatura.id_fatura),
                "tipo": "financeira",
                "empresa_nome": empresa.nome_empresa if empresa else "—",
                "descricao": f"Fatura #{str(fatura.id_fatura)[:8]} – Vencimento: {fatura.data_vencimento.strftime('%d/%m/%Y')}",
                "status": fatura.status,
                "data_limite": fatura.data_vencimento,
                "valor": float(fatura.valor_original) if fatura.valor_original is not None else 0.0,
                "id_referencia": str(fatura.id_contrato)
            })

    if not tipo or tipo == "entrega":
        entregas_query = db.query(Entrega).join(Contrato).filter(Entrega.status_entrega != "Concluído")
        if id_cliente:
            entregas_query = entregas_query.filter(Contrato.id_cliente == id_cliente)
        for entrega in entregas_query.all():
            contrato = entrega.contrato
            empresa = contrato.empresa if contrato else None
            resultados.append({
                "id": str(entrega.id_entrega),
                "tipo": "entrega",
                "empresa_nome": empresa.nome_empresa if empresa else "—",
                "descricao": f"Entrega: {entrega.descricao_entrega}",
                "status": entrega.status_entrega,
                "data_limite": entrega.data_prazo_limite,
                "valor": None,
                "id_referencia": str(entrega.id_contrato)
            })

    resultados.sort(key=lambda x: x["data_limite"] if x["data_limite"] else date.today())
    return resultados