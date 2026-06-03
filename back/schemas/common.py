from __future__ import annotations
from pydantic import BaseModel, ConfigDict, model_validator
from typing import Optional
from uuid import UUID
from datetime import date, datetime

# ==========================================
# CATÁLOGO DE SERVIÇOS
# ==========================================
class ServicoDetalhe(BaseModel):
    id_servico: Optional[UUID] = None
    tipo_servico: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# ENDEREÇO
# ==========================================
class EnderecoResponse(BaseModel):
    cep: str
    bairro: str
    cidade: str
    estado: str
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# PENDÊNCIAS
# ==========================================
class PendenciaResponse(BaseModel):
    id: str
    tipo: str
    empresa_nome: str
    descricao: str
    status: str
    data_limite: Optional[date] = None
    valor: Optional[float] = None
    id_referencia: str
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# SUB-SCHEMAS DE SUPORTE (FRONT-END)
# ==========================================
class InteracaoFront(BaseModel):
    data_interacao: Optional[datetime] = None
    tipo: Optional[str] = None
    feedback: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, v):
        if not isinstance(v, dict):
            return {
                "data_interacao": getattr(v, "data_hora", None),
                "tipo": getattr(v, "tipo_interacao", None),
                "feedback": getattr(v, "feedback_anotacoes", None)
            }
        return v

class ContratoFront(BaseModel):
    id_contrato: UUID
    data_fim: Optional[date] = None
    status_contrato: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class FinanceiroFront(BaseModel):
    status: str
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, v):
        if not isinstance(v, dict):
            status_val = getattr(v, "status_pagamento", "Pendente")
            return {"status": (status_val or "pendente").lower()}
        return v