from __future__ import annotations
from pydantic import BaseModel, ConfigDict, field_validator, ValidationInfo
from typing import Optional
from uuid import UUID
from datetime import datetime

class InteracaoBase(BaseModel):
    id_cliente: UUID
    tipo_interacao: Optional[str] = "Visita"
    data_hora: Optional[datetime] = None
    feedback_anotacoes: Optional[str] = None
    grau_urgencia: Optional[str] = ""
    status_financeiro: Optional[str] = "Não Cobrado"
    valor_cobrado: Optional[float] = None
    status_pagamento: Optional[str] = "Pendente"
    nota: Optional[int] = None

class InteracaoCreate(InteracaoBase):
    id_cliente: UUID

    @field_validator("status_financeiro")
    @classmethod
    def check_status_financeiro(cls, v):
        if v is not None:
            opcoes_validas = ["Não Cobrado", "Paga"]
            if v not in opcoes_validas:
                raise ValueError(f"Status financeiro inválido. Use: {', '.join(opcoes_validas)}")
        return v

    @field_validator("valor_cobrado")
    @classmethod
    def check_valor_cobrado(cls, v, info: ValidationInfo):
        if v is not None and v < 0:
            raise ValueError("Valor cobrado não pode ser negativo")
        status = info.data.get('status_financeiro') if info.data else None
        if status == "Paga" and (v is None or v <= 0):
            raise ValueError("Valor cobrado é obrigatório quando status for 'Paga'")
        return v

    @field_validator("nota")
    @classmethod
    def check_nota(cls, v):
        if v is not None and (v < 0 or v > 10):
            raise ValueError("Nota deve ser entre 0 e 10.")
        return v

class InteracaoResponse(InteracaoBase):
    id_interacao: UUID
    id_cliente: UUID
    model_config = ConfigDict(from_attributes=True)