# consultoria_adriano/app/back/schemas.py
from pydantic import BaseModel, ConfigDict, field_validator, ValidationInfo, model_validator
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime

# Importação relativa das regras de validação
from validators import (
    validate_cpf,
    validate_cnpj,
    validate_not_past_date,
    validate_not_past_datetime,
    validate_positive_value,
    validate_string_content,
    validate_enum_choice,
    validate_email,
    validate_phone_br,
    validate_cep
)

# ==========================================
# 0. CATÁLOGO DE SERVIÇOS E VINCULOS
# ==========================================

class ServicoDetalhe(BaseModel):
    id_servico: Optional[UUID] = None
    tipo_servico: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 1. MÓDULO: EMPRESA CLIENTE
# ==========================================

class EmpresaBase(BaseModel):
    nome_empresa: str
    cnpj: Optional[str] = None
    email: Optional[str] = None
    localizacao_estado: Optional[str] = None
    localizacao_cidade: Optional[str] = None
    localizacao_bairro: Optional[str] = None

class EmpresaCreate(EmpresaBase):
    ids_servicos_contratados: List[UUID] = []
    localizacao_estado: Optional[str] = None
    localizacao_cidade: Optional[str] = None
    localizacao_bairro: Optional[str] = None
    @field_validator("cnpj")
    @classmethod
    def check_cnpj(cls, v):
        if v: return validate_cnpj(v)
        return v

    @field_validator("email")
    @classmethod
    def check_email(cls, v):
        if v: return validate_email(v)
        return v

    @field_validator("nome_empresa", "localizacao_cidade", "localizacao_bairro")
    @classmethod
    def check_text(cls, v):
        if v: return validate_string_content(v)
        return v

    @field_validator("localizacao_estado")
    @classmethod
    def check_estado(cls, v):
        if v: return validate_string_content(v, min_length=2, max_length=2)
        return v

class EmpresaResponse(EmpresaBase):
    id_cliente: UUID
    servicos_contratados: List[ServicoDetalhe] = []
    localizacao: Optional[str] = None
    servico_prestado: Optional[str] = None
    
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 2. MÓDULO: RESPONSÁVEL (Contatos)
# ==========================================

class ResponsavelBase(BaseModel):
    nome: str
    telefone: Optional[str] = None
    email: Optional[str] = None
    cargo: Optional[str] = None

class ResponsavelCreate(ResponsavelBase):
    id_cliente: UUID

    @field_validator("telefone")
    @classmethod
    def check_phone(cls, v):
        if v: return validate_phone_br(v)
        return v

    @field_validator("email")
    @classmethod
    def check_email(cls, v):
        if v: return validate_email(v)
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

# ==========================================
# 3. MÓDULO: MODELO DE CONTRATO
# ==========================================

class ModeloContratoBase(BaseModel):
    nome_modelo: str
    periodicidade_cobranca: Optional[str] = None
    descricao_padrao: Optional[str] = None
    ativo: Optional[bool] = True

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
            "Trimestral", "Semestral", "Anual", "Única"
        ]
        if v: return validate_enum_choice(v.title(), opcoes_validas)
        return v

class ModeloContratoResponse(ModeloContratoBase):
    id_modelo: UUID
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 4. MÓDULO: CONTRATO
# ==========================================

class ContratoBase(BaseModel):
    valor_acordado: float
    status_contrato: Optional[str] = "Ativo"
    data_inicio: date
    data_fim: Optional[date] = None
    cobra_juros: Optional[bool] = False
    taxa_juros: Optional[float] = 0.00

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
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 5. MÓDULO: HISTÓRICO DE INTERAÇÕES
# ==========================================

class InteracaoBase(BaseModel):
    id_cliente: UUID
    tipo_interacao: Optional[str] = "Visita"
    data_hora: Optional[datetime] = None
    feedback_anotacoes: Optional[str] = None
    grau_urgencia: Optional[str] = "Baixo"
    status_financeiro: Optional[str] = "Não Cobrado"

class InteracaoCreate(InteracaoBase):
    id_cliente: UUID

  #  @field_validator("tipo_interacao")
    @classmethod
    def check_tipo(cls, v):
        opcoes = ["Visita", "Ligação", "e-mail", "Mensagem", "Reunião"]
        if v: return validate_enum_choice(v.title(), opcoes)
        return v
        
    @field_validator("grau_urgencia")
    @classmethod
    def check_urgencia(cls, v):
        if v: return validate_enum_choice(v.title(), ["Baixo", "Médio", "Alto"])
        return v

class InteracaoResponse(InteracaoBase):
    id_interacao: UUID
    id_cliente: UUID
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 6. MÓDULO: ENTREGAS E PRAZOS
# ==========================================

class EntregaBase(BaseModel):
    descricao_entrega: str
    data_prazo_limite: date
    status_entrega: Optional[str] = "Pendente"

class EntregaCreate(EntregaBase):
    id_contrato: UUID

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
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 7. MÓDULO: PAGAMENTOS
# ==========================================

class PagamentoBase(BaseModel):
    valor_pago: float
    data_pagamento: datetime
    forma_pagamento: Optional[str] = None
    status_pagamento: Optional[str] = "Pendente"
    valor_juros: Optional[float] = 0.00

class PagamentoCreate(PagamentoBase):
    id_contrato: UUID

    @field_validator("valor_pago", "valor_juros")
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

# ==========================================
# 8. MÓDULO: FATURAS
# ==========================================

class FaturaBase(BaseModel):
    valor_original: float
    data_vencimento: date
    status: Optional[str] = "Pendente"
    valor_juros_pago: Optional[float] = 0.00

class FaturaCreate(FaturaBase):
    id_contrato: UUID

    @field_validator("valor_original", "valor_juros_pago")
    @classmethod
    def check_valor(cls, v):
        return validate_positive_value(v)

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
# ==========================================
# SUB-SCHEMAS DE SUPORTE PARA COMPATIBILIDADE FRONT-END
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
            return {
                "status": (status_val or "pendente").lower()
            }
        return v