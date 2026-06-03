from __future__ import annotations
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from uuid import UUID

from app.validators.validators import validate_cnpj, validate_string_content
from .common import ServicoDetalhe, EnderecoResponse

class EmpresaBase(BaseModel):
    nome_empresa: str
    cnpj: Optional[str] = None
    cep: Optional[str] = None
    segmento: Optional[str] = None
    porte: Optional[str] = None

class EmpresaCreate(EmpresaBase):
    ids_servicos_contratados: List[UUID] = []

    @field_validator("cnpj")
    @classmethod
    def check_cnpj(cls, v):
        if v: return validate_cnpj(v)
        return v

    @field_validator("nome_empresa")
    @classmethod
    def check_text(cls, v):
        return validate_string_content(v)

    @field_validator("segmento", "porte")
    @classmethod
    def check_tamanho_max_50(cls, v):
        if v and len(v) > 50:
            raise ValueError("O campo deve ter no máximo 50 caracteres.")
        return v

class EmpresaResponse(EmpresaBase):
    id_cliente: UUID
    servicos_contratados: List[ServicoDetalhe] = []
    interacoes: List["InteracaoResponse"] = []
    contratos: List["ContratoResponse"] = []
    endereco: Optional[EnderecoResponse] = None
    model_config = ConfigDict(from_attributes=True)