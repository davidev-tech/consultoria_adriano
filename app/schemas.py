from pydantic import BaseModel, ConfigDict, field_validator, ValidationInfo
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime

# Importação das regras de validação atualizadas e completas
from .validators import (
    validate_cpf, 
    validate_cnpj, 
    validate_not_past_date, 
    validate_not_past_datetime,
    validate_positive_value,
    validate_string_content,
    validate_enum_choice,
    validate_coordinates,
    validate_email,
    validate_phone_br,
    validate_cep
)

# ==========================================
# 1. MÓDULO: EMPRESA CLIENTE
# ==========================================
class EmpresaBase(BaseModel):
    nome_empresa: str
    cnpj: Optional[str] = None
    email: Optional[str] = None  # Novo campo
    cep: Optional[str] = None    # Novo campo para logística
    localizacao: Optional[str] = None
    servico_prestado: Optional[str] = None

    @field_validator("cnpj")
    @classmethod
    def check_cnpj(cls, v):
        return validate_cnpj(v)

    @field_validator("email")
    @classmethod
    def check_email(cls, v):
        return validate_email(v)

    @field_validator("cep")
    @classmethod
    def check_cep(cls, v):
        return validate_cep(v)

    @field_validator("nome_empresa", "localizacao", "servico_prestado")
    @classmethod
    def check_text(cls, v):
        return validate_string_content(v)

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaResponse(EmpresaBase):
    id_cliente: UUID
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 2. MÓDULO: RESPONSÁVEL (Contatos)
# ==========================================
class ResponsavelBase(BaseModel):
    id_cliente: UUID
    nome: str
    cpf: Optional[str] = None
    telefone: Optional[str] = None # Novo campo
    email: Optional[str] = None    # Novo campo
    cargo: Optional[str] = None

    @field_validator("cpf")
    @classmethod
    def check_cpf(cls, v):
        return validate_cpf(v)

    @field_validator("telefone")
    @classmethod
    def check_phone(cls, v):
        return validate_phone_br(v)

    @field_validator("email")
    @classmethod
    def check_email(cls, v):
        return validate_email(v)

    @field_validator("nome", "cargo")
    @classmethod
    def check_text(cls, v):
        return validate_string_content(v)

# ==========================================
# 3. MÓDULO: MODELO DE CONTRATO
# ==========================================
class ModeloContratoBase(BaseModel):
    nome_modelo: str
    periodicidade_cobranca: Optional[str] = None
    descricao_padrao: Optional[str] = None

    @field_validator("nome_modelo", "descricao_padrao")
    @classmethod
    def check_text(cls, v):
        return validate_string_content(v)

# ==========================================
# 4. MÓDULO: PACIENTE (Beneficiário)
# ==========================================
class PacienteBase(BaseModel):
    id_cliente: UUID
    nome: str
    historico_cuidados: Optional[str] = None

    @field_validator("nome", "historico_cuidados")
    @classmethod
    def check_text(cls, v):
        return validate_string_content(v)

# ==========================================
# 5. MÓDULO: CONTRATO
# ==========================================
class ContratoBase(BaseModel):
    id_cliente: UUID
    id_modelo: UUID
    valor_acordado: float
    status_contrato: Optional[str] = "Ativo"
    data_inicio: date
    data_fim: Optional[date] = None

    @field_validator("valor_acordado")
    @classmethod
    def check_valor(cls, v):
        return validate_positive_value(v)

    @field_validator("status_contrato")
    @classmethod
    def check_status(cls, v):
        return validate_enum_choice(v, ["Ativo", "Pausado", "Encerrado"])

    @field_validator("data_inicio")
    @classmethod
    def check_data_inicio(cls, v):
        return validate_not_past_date(v)

    @field_validator("data_fim")
    @classmethod
    def check_data_fim(cls, v, info: ValidationInfo):
        if v:
            validate_not_past_date(v)
            if "data_inicio" in info.data and v < info.data["data_inicio"]:
                raise ValueError("A data de término deve ser posterior à data de início.")
        return v

# ==========================================
# 6. MÓDULO: HISTÓRICO DE INTERAÇÕES
# ==========================================
class HistoricoInteracaoBase(BaseModel):
    id_cliente: UUID
    tipo_interacao: Optional[str] = "Visita"
    data_hora: Optional[datetime] = None
    coordenadas_geo: Optional[str] = None
    feedback_anotacoes: Optional[str] = None

    @field_validator("tipo_interacao")
    @classmethod
    def check_tipo(cls, v):
        return validate_enum_choice(v, ["Visita", "Reunião", "Ligação", "E-mail"])

    @field_validator("data_hora")
    @classmethod
    def check_data_hora(cls, v):
        return validate_not_past_datetime(v)

    @field_validator("coordenadas_geo")
    @classmethod
    def check_coords(cls, v):
        return validate_coordinates(v)

    @field_validator("feedback_anotacoes")
    @classmethod
    def check_text(cls, v):
        return validate_string_content(v, min_length=1, max_length=1000)

# ==========================================
# 7. MÓDULO: ENTREGAS E PRAZOS
# ==========================================
class EntregaPrazoBase(BaseModel): # Corrigido de 'Entreza' para 'Entrega'
    id_contrato: UUID
    descricao_entrega: str
    data_prazo_limite: date
    data_conclusao: Optional[date] = None
    status_entrega: Optional[str] = "Pendente"

    @field_validator("descricao_entrega")
    @classmethod
    def check_descricao(cls, v):
        return validate_string_content(v)

    @field_validator("status_entrega")
    @classmethod
    def check_status(cls, v):
        return validate_enum_choice(v, ["Pendente", "Em Andamento", "Concluído", "Atrasado"])

    @field_validator("data_prazo_limite")
    @classmethod
    def check_prazo_limite(cls, v):
        return validate_not_past_date(v)

# ==========================================
# 8. MÓDULO: PAGAMENTOS
# ==========================================
class PagamentoBase(BaseModel):
    id_contrato: UUID
    id_visita: Optional[UUID] = None
    valor: float
    data_pagamento: Optional[datetime] = None
    forma_pagamento: Optional[str] = None
    status_pagamento: Optional[str] = "Pendente"

    @field_validator("valor")
    @classmethod
    def check_valor(cls, v):
        return validate_positive_value(v)

    @field_validator("status_pagamento")
    @classmethod
    def check_status(cls, v):
        return validate_enum_choice(v, ["Pendente", "Pago", "Atrasado", "Cancelado"])

    @field_validator("data_pagamento")
    @classmethod
    def check_data_pagamento(cls, v):
        return validate_not_past_datetime(v)

# --- CLASSES DE CREATE E RESPONSE ---
# (Herdam automaticamente as validações das classes Base)

class ResponsavelCreate(ResponsavelBase): pass
class ResponsavelResponse(ResponsavelBase):
    id_responsavel: UUID
    model_config = ConfigDict(from_attributes=True)

class ModeloContratoCreate(ModeloContratoBase): pass
class ModeloContratoResponse(ModeloContratoBase):
    id_modelo: UUID
    model_config = ConfigDict(from_attributes=True)

class PacienteCreate(PacienteBase): pass
class PacienteResponse(PacienteBase):
    id_paciente: UUID
    model_config = ConfigDict(from_attributes=True)

class ContratoCreate(ContratoBase): pass
class ContratoResponse(ContratoBase):
    id_contrato: UUID
    model_config = ConfigDict(from_attributes=True)

class HistoricoInteracaoCreate(HistoricoInteracaoBase): pass
class HistoricoInteracaoResponse(HistoricoInteracaoBase):
    id_interacao: UUID
    model_config = ConfigDict(from_attributes=True)

class EntregaPrazoCreate(EntregaPrazoBase): pass
class EntregaPrazoResponse(EntregaPrazoBase):
    id_entrega: UUID
    model_config = ConfigDict(from_attributes=True)

class PagamentoCreate(PagamentoBase): pass
class PagamentoResponse(PagamentoBase):
    id_pagamento: UUID
    model_config = ConfigDict(from_attributes=True)