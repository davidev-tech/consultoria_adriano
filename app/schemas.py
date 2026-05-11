from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime

# ==========================================
# MÓDULO: EMPRESA CLIENTE
# ==========================================
class EmpresaBase(BaseModel):
    nome_empresa: str
    cnpj: Optional[str] = None
    localizacao: Optional[str] = None
    servico_prestado: Optional[str] = None

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaResponse(EmpresaBase):
    id_cliente: UUID
    class Config:
        from_attributes = True

# ==========================================
# MÓDULO: RESPONSÁVEL (Contatos)
# ==========================================
class ResponsavelBase(BaseModel):
    id_cliente: UUID
    nome: str
    cpf: Optional[str] = None
    cargo: Optional[str] = None

class ResponsavelCreate(ResponsavelBase):
    pass

class ResponsavelResponse(ResponsavelBase):
    id_responsavel: UUID
    class Config:
        from_attributes = True

# ==========================================
# MÓDULO: MODELO DE CONTRATO
# ==========================================
class ModeloContratoBase(BaseModel):
    nome_modelo: str
    periodicidade_cobranca: Optional[str] = None
    descricao_padrao: Optional[str] = None

class ModeloContratoCreate(ModeloContratoBase):
    pass

class ModeloContratoResponse(ModeloContratoBase):
    id_modelo: UUID
    class Config:
        from_attributes = True

# ==========================================
# MÓDULO: PACIENTE (Beneficiário)
# ==========================================
class PacienteBase(BaseModel):
    id_cliente: UUID
    nome: str
    historico_cuidados: Optional[str] = None

class PacienteCreate(PacienteBase):
    pass

class PacienteResponse(PacienteBase):
    id_paciente: UUID
    class Config:
        from_attributes = True

# ==========================================
# MÓDULO: CONTRATO
# ==========================================
class ContratoBase(BaseModel):
    id_cliente: UUID
    id_modelo: UUID
    data_inicio: date
    data_fim: Optional[date] = None
    valor_mensal: float
    status: Optional[str] = "Ativo"

class ContratoCreate(ContratoBase):
    pass

class ContratoResponse(ContratoBase):
    id_contrato: UUID
    class Config:
        from_attributes = True

# ==========================================
# MÓDULO: HISTÓRICO DE INTERAÇÕES (Visitas)
# ==========================================
class HistoricoInteracaoBase(BaseModel):
    id_contrato: UUID
    id_paciente: Optional[UUID] = None
    data_interacao: datetime = datetime.now()
    descricao: str
    tipo_interacao: Optional[str] = "Visita" # Visita, Reunião, Auditoria

class HistoricoInteracaoCreate(HistoricoInteracaoBase):
    pass

class HistoricoInteracaoResponse(HistoricoInteracaoBase):
    id_interacao: UUID
    class Config:
        from_attributes = True

# ==========================================
# MÓDULO: PAGAMENTOS
# ==========================================
class PagamentoBase(BaseModel):
    id_contrato: UUID
    id_interacao: Optional[UUID] = None
    valor_pago: float
    data_pagamento: date
    status_pagamento: Optional[str] = "Pendente"

class PagamentoCreate(PagamentoBase):
    pass

class PagamentoResponse(PagamentoBase):
    id_pagamento: UUID
    class Config:
        from_attributes = True