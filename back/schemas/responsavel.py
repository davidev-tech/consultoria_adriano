from __future__ import annotations
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from uuid import UUID

from back.validators.validators import validate_cpf, validate_string_content

class ResponsavelBase(BaseModel):
    nome: str
    cargo: Optional[str] = None
    cpf: Optional[str] = None

class ResponsavelCreate(ResponsavelBase):
    id_cliente: UUID

    @field_validator("cpf")
    @classmethod
    def check_cpf(cls, v):
        if v: return validate_cpf(v)
        return v

    @field_validator("nome", "cargo")
    @classmethod
    def check_text(cls, v):
        if v: return validate_string_content(v)
        return v

class ResponsavelResponse(ResponsavelBase):
    id_responsavel: UUID
    id_cliente: UUID
    model_config = ConfigDict(from_attributes=True)

class ResponsavelListResponse(BaseModel):
    id_responsavel: UUID
    id_cliente: UUID
    nome: str
    cpf: Optional[str] = None
    cargo: Optional[str] = None
    empresa_nome: str
    model_config = ConfigDict(from_attributes=True)