from __future__ import annotations
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.validators.validators import validate_positive_value, validate_enum_choice

class PagamentoBase(BaseModel):
    valor: float
    data_pagamento: datetime
    forma_pagamento: Optional[str] = None
    status_pagamento: Optional[str] = "Pendente"
    valor_juros: Optional[float] = 0.00
    id_fatura: Optional[UUID] = None

class PagamentoCreate(PagamentoBase):
    id_contrato: UUID

    @field_validator("valor", "valor_juros")
    @classmethod
    def check_valor(cls, v):
        return validate_positive_value(v)

    @field_validator("status_pagamento")
    @classmethod
    def check_status(cls, v):
        if v: return validate_enum_choice(v.title(), ["Pendente", "Pago", "Cancelado"])
        return v

class PagamentoResponse(PagamentoBase):
    id_pagamento: UUID
    id_contrato: UUID
    model_config = ConfigDict(from_attributes=True)