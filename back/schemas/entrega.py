from __future__ import annotations
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from uuid import UUID
from datetime import date

from back.validators.validators import validate_string_content, validate_enum_choice

class EntregaBase(BaseModel):
    descricao_entrega: str
    data_prazo_limite: Optional[date] = None
    status_entrega: Optional[str] = "Pendente"

class EntregaCreate(EntregaBase):
    id_contrato: UUID
    data_conclusao: Optional[date] = None

    @field_validator("descricao_entrega")
    @classmethod
    def check_text(cls, v):
        return validate_string_content(v)

    @field_validator("status_entrega")
    @classmethod
    def check_status(cls, v):
        if v: return validate_enum_choice(v.title(), ["Pendente", "Em Andamento", "Concluído", "Atrasado"])
        return v

class EntregaResponse(EntregaBase):
    id_entrega: UUID
    id_contrato: UUID
    data_conclusao: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)