from __future__ import annotations
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime

from back.validators.validators import validate_positive_value, validate_enum_choice, validate_not_past_date

class ContratoBase(BaseModel):
    valor_acordado: float
    status_contrato: Optional[str] = "Ativo"
    data_inicio: date
    data_fim: Optional[date] = None
    cobra_juros: Optional[bool] = False
    taxa_juros: Optional[float] = 0.00
    motivo_arquivamento: Optional[str] = None
    data_criacao: Optional[datetime] = None
    dia_vencimento: Optional[int] = 5

class ContratoCreate(ContratoBase):
    id_cliente: UUID
    id_modelo: UUID

    @field_validator("valor_acordado", "taxa_juros")
    @classmethod
    def check_valor(cls, v):
        return validate_positive_value(v)

    @field_validator("status_contrato")
    @classmethod
    def check_status(cls, v):
        if v: return validate_enum_choice(v.title(), ["Ativo", "Encerrado", "Arquivado"])
        return v

    @field_validator("data_inicio")
    @classmethod
    def check_data_inicio(cls, v):
        return validate_not_past_date(v)

    @field_validator("dia_vencimento")
    @classmethod
    def check_dia_vencimento(cls, v):
        if v is not None and (v < 1 or v > 31):
            raise ValueError("Dia de vencimento deve ser entre 1 e 31.")
        return v

    @model_validator(mode='after')
    def check_data_fim(self) -> 'ContratoCreate':
        if self.data_fim and self.data_inicio:
            if self.data_fim <= self.data_inicio:
                raise ValueError("A data de término deve ser posterior à data de início.")
        return self

class ContratoResponse(ContratoBase):
    id_contrato: UUID
    id_cliente: UUID
    id_modelo: UUID
    entregas: List["EntregaResponse"] = []
    faturas: List["FaturaResponse"] = []
    pagamentos: List["PagamentoResponse"] = []
    model_config = ConfigDict(from_attributes=True)