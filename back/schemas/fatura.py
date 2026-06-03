from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from uuid import UUID
from datetime import date, datetime

from back.validators.validators import validate_positive_value, validate_enum_choice, validate_non_negative_value

class FaturaBase(BaseModel):
    valor_original: float
    data_vencimento: date
    status: Optional[str] = "Pendente"
    valor_juros_pago: Optional[float] = 0.00
    data_pagamento: Optional[date] = None
    valor_pago: Optional[float] = None

class FaturaCreate(FaturaBase):
    id_contrato: UUID

    @field_validator("valor_original")
    @classmethod
    def check_valor_original(cls, v):
        return validate_positive_value(v)

    @field_validator("valor_juros_pago")
    @classmethod
    def check_valor_juros(cls, v):
        return validate_non_negative_value(v)

    @field_validator("status")
    @classmethod
    def check_status(cls, v):
        if v: return validate_enum_choice(v.title(), ["Pendente", "Pago", "Atrasado", "Cancelado"])
        return v

class FaturaResponse(FaturaBase):
    id_fatura: UUID
    id_contrato: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)