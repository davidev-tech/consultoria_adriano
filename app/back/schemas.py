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
# 1. MÓDULO: EMPRESA CLIENTE
# ==========================================
class EmpresaBase(BaseModel):
    nome_empresa: str
    cnpj: Optional[str] = None
    email: Optional[str] = None
    cep: Optional[str] = None
    localizacao: Optional[str] = None
    servico_prestado: Optional[str] = None

class EmpresaCreate(EmpresaBase):
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

    @field_validator("cep")
    @classmethod
    def check_cep(cls, v):
        if v: return validate_cep(v)
        return v

    @field_validator("nome_empresa", "localizacao", "servico_prestado")
    @classmethod
    def check_text(cls, v):
        if v: return validate_string_content(v)
        return v

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
    telefone: Optional[str] = None
    email: Optional[str] = None
    cargo: Optional[str] = None

class ResponsavelCreate(ResponsavelBase): 
    @field_validator("cpf")
    @classmethod
    def check_cpf(cls, v):
        if v: return validate_cpf(v)
        return v

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
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 3. MÓDULO: MODELO DE CONTRATO
# ==========================================
class ModeloContratoBase(BaseModel):
    nome_modelo: str
    periodicidade_cobranca: Optional[str] = None
    descricao_padrao: Optional[str] = None

class ModeloContratoCreate(ModeloContratoBase): 
    @field_validator("nome_modelo", "descricao_padrao")
    @classmethod
    def check_text(cls, v):
        if v: return validate_string_content(v)
        return v

    # 🌟 NOVO VALIDADOR ADICIONADO AQUI 🌟
    @field_validator("periodicidade_cobranca")
    @classmethod
    def check_periodicidade(cls, v):
        opcoes_validas = [
            "Semanal", "Quinzenal", "Mensal", "Bimestral", 
            "Trimestral", "Semestral", "Anual", "Por Visita"
        ]
        # Aplica .title() para formatar como "Semanal", "Por Visita", etc., e valida
        if v: return validate_enum_choice(v.title(), opcoes_validas)
        return v

class ModeloContratoResponse(ModeloContratoBase):
    id_modelo: UUID
    ativo: Optional[bool] = True  # 🌟 Permite que o BD retorne NULL sem travar
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 4. MÓDULO: CONTRATO
# ==========================================
class ContratoBase(BaseModel):
    id_cliente: UUID
    id_modelo: UUID
    valor_acordado: float
    status_contrato: Optional[str] = "Ativo"
    data_inicio: date
    data_fim: Optional[date] = None

class ContratoCreate(ContratoBase):
    @field_validator("valor_acordado")
    @classmethod
    def check_valor(cls, v):
        return validate_positive_value(v)

    @field_validator("status_contrato")
    @classmethod
    def check_status(cls, v):
        if v: return validate_enum_choice(v.title(), ["Ativo", "Pausado", "Encerrado", "Arquivado"])
        return v

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

class ContratoResponse(ContratoBase):
    id_contrato: UUID
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 5. MÓDULO: HISTÓRICO DE INTERAÇÕES (CRM)
# ==========================================
class HistoricoInteracaoBase(BaseModel):
    id_cliente: UUID
    tipo_interacao: Optional[str] = "Visita"
    data_hora: Optional[datetime] = None
    feedback_anotacoes: Optional[str] = None

class HistoricoInteracaoCreate(HistoricoInteracaoBase):
    @field_validator("tipo_interacao")
    @classmethod
    def check_tipo(cls, v):
        if v: return validate_enum_choice(v.title(), ["Visita", "Reunião", "Mensagem", "Ligação", "E-mail"])
        return v

    @field_validator("feedback_anotacoes")
    @classmethod
    def check_text(cls, v):
        if v: return validate_string_content(v, min_length=1, max_length=1000)
        return v

    @field_validator("data_hora")
    @classmethod
    def check_data_hora(cls, v):
        if v: return validate_not_past_datetime(v)
        return v

class HistoricoInteracaoResponse(HistoricoInteracaoBase):
    id_interacao: UUID
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 6. MÓDULO: VISITAS DE ATENDIMENTO
# ==========================================
class VisitaAtendimentoBase(BaseModel):
    id_contrato: UUID
    id_cliente: UUID 
    data_hora: Optional[datetime] = None
    grau_urgencia: Optional[str] = None
    feedback_anotacoes: Optional[str] = None

class VisitaAtendimentoCreate(VisitaAtendimentoBase):
    @field_validator("feedback_anotacoes")
    @classmethod
    def check_text(cls, v):
        if v: return validate_string_content(v)
        return v

    @field_validator("data_hora")
    @classmethod
    def check_data_hora(cls, v):
        if v: return validate_not_past_datetime(v)
        return v

class VisitaAtendimentoResponse(VisitaAtendimentoBase):
    id_visita: UUID
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 7. MÓDULO: ENTREGAS E PRAZOS
# ==========================================
class EntregaPrazoBase(BaseModel):
    id_contrato: UUID
    descricao_entrega: str
    data_prazo_limite: date
    data_conclusao: Optional[date] = None
    status_entrega: Optional[str] = "Pendente"

class EntregaPrazoCreate(EntregaPrazoBase):
    @field_validator("descricao_entrega")
    @classmethod
    def check_descricao(cls, v):
        if v: return validate_string_content(v)
        return v

    @field_validator("status_entrega")
    @classmethod
    def check_status(cls, v):
        if v: return validate_enum_choice(v.title(), ["Pendente", "Em Andamento", "Concluído", "Atrasado"])
        return v

    @field_validator("data_prazo_limite")
    @classmethod
    def check_prazo_limite(cls, v):
        if v: return validate_not_past_date(v)
        return v

class EntregaPrazoResponse(EntregaPrazoBase):
    id_entrega: UUID
    model_config = ConfigDict(from_attributes=True)

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

class PagamentoCreate(PagamentoBase):
    @field_validator("valor")
    @classmethod
    def check_valor(cls, v):
        return validate_positive_value(v)

    @field_validator("status_pagamento")
    @classmethod
    def check_status(cls, v):
        if v: return validate_enum_choice(v.title(), ["Pendente", "Pago", "Atrasado", "Cancelado"])
        return v

    @field_validator("data_pagamento")
    @classmethod
    def check_data_pagamento(cls, v):
        if v: return validate_not_past_datetime(v)
        return v

class PagamentoResponse(PagamentoBase):
    id_pagamento: UUID
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

# ==========================================
# SCHEMA PRINCIPAL DA EMPRESA ATUALIZADO
# ==========================================
class EmpresaResponseCompleta(EmpresaBase):
    id_cliente: UUID
    interacoes: List[InteracaoFront] = []
    contratos: List[ContratoFront] = []
    financeiro: List[FinanceiroFront] = []
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def convert_to_dict_with_relations(cls, v):
        if not isinstance(v, dict):
            all_payments = []
            for c in getattr(v, "contratos", []) or []:
                for p in getattr(c, "pagamentos", []) or []:
                    all_payments.append(p)
            
            return {
                "id_cliente": v.id_cliente,
                "nome_empresa": v.nome_empresa,
                "cnpj": v.cnpj,
                "email": v.email,
                "cep": v.cep,
                "localizacao": v.localizacao,
                "servico_prestado": v.servico_prestado,
                "interacoes": getattr(v, "interacoes", []) or [],
                "contratos": getattr(v, "contratos", []) or [],
                "financeiro": all_payments
            }
        return v

# ==========================================
# 8. MÓDULO: FATURAS
# ==========================================

class FaturaBase(BaseModel):
    id_contrato: UUID
    valor_original: float
    data_vencimento: date
    status: str = "Pendente"
    data_pagamento: Optional[date] = None
    valor_pago: Optional[float] = None

    @field_validator("valor_original")
    @classmethod
    def check_valor_original(cls, v):
        return validate_positive_value(v)

    @field_validator("valor_pago")
    @classmethod
    def check_valor_pago(cls, v):
        if v is not None:
            return validate_positive_value(v)
        return v

    @field_validator("status")
    @classmethod
    def check_status(cls, v):
        opcoes_validas = ["Pendente", "Pago", "Atrasado", "Cancelada"]
        if v not in opcoes_validas:
            raise ValueError(f"Status da fatura inválido. Opções válidas: {', '.join(opcoes_validas)}")
        return v

class FaturaUpdate(BaseModel):
    """
    Schema usado no endpoint PUT para atualizações parciais.
    Todos os campos são opcionais para permitir atualizar apenas o que mudou.
    """
    valor_original: Optional[float] = None
    data_vencimento: Optional[date] = None
    status: Optional[str] = None
    data_pagamento: Optional[date] = None
    valor_pago: Optional[float] = None

    @field_validator("valor_original")
    @classmethod
    def check_valor_original(cls, v):
        if v is not None:
            return validate_positive_value(v)
        return v

    @field_validator("valor_pago")
    @classmethod
    def check_valor_pago(cls, v):
        if v is not None:
            return validate_positive_value(v)
        return v

    @field_validator("status")
    @classmethod
    def check_status(cls, v):
        if v is not None:
            opcoes_validas = ["Pendente", "Pago", "Atrasado", "Cancelada"]
            if v not in opcoes_validas:
                raise ValueError(f"Status da fatura inválido. Opções válidas: {', '.join(opcoes_validas)}")
        return v

class FaturaCreate(FaturaBase):
    """
    Schema usado no endpoint POST.
    Herda tudo de FaturaBase.
    """
    pass

class FaturaResponse(FaturaBase):
    """
    Schema usado para retornar dados (GET, POST return).
    Inclui o ID gerado pelo banco.
    """
    id_fatura: UUID

    model_config = ConfigDict(from_attributes=True)