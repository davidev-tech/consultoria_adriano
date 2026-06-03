from __future__ import annotations
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from uuid import UUID

from app.validators.validators import validate_string_content, validate_enum_choice

class ModeloContratoBase(BaseModel):
    nome_modelo: str
    periodicidade_cobranca: Optional[str] = None
    descricao_padrao: Optional[str] = None
    ativo: Optional[bool] = True
    motivo_arquivamento: Optional[str] = None

class ModeloContratoCreate(ModeloContratoBase):

    @field_validator("nome_modelo", "descricao_padrao")
    @classmethod
    def check_text(cls, v):
        if v: return validate_string_content(v)
        return v

    @field_validator("periodicidade_cobranca")
    @classmethod
    def check_periodicidade(cls, v):
        opcoes_validas = [
            "Semanal", "Quinzenal", "Mensal", "Bimestral",
            "Trimestral", "Semestral", "Anual", "Única", "Por Visita", "Por Entrega"
        ]
        if v: return validate_enum_choice(v.title(), opcoes_validas)
        return v

class ModeloContratoResponse(ModeloContratoBase):
    id_modelo: UUID
    model_config = ConfigDict(from_attributes=True)