from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime

# ==========================================
# 1. MÓDULO: EMPRESA CLIENTE
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
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 2. MÓDULO: RESPONSÁVEL (Contatos)
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
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 3. MÓDULO: MODELO DE CONTRATO
# ==========================================
class ModeloContratoBase(BaseModel):
    nome_modelo: str
    periodicidade_cobranca: Optional[str] = None
    descricao_padrao: Optional[str] = None

class ModeloContratoCreate(ModeloContratoBase):
    pass

class ModeloContratoResponse(ModeloContratoBase):
    id_modelo: UUID
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 4. MÓDULO: PACIENTE (Beneficiário)
# ==========================================
class PacienteBase(BaseModel):
    id_cliente: UUID
    nome: str
    historico_cuidados: Optional[str] = None

class PacienteCreate(PacienteBase):
    pass

class PacienteResponse(PacienteBase):
    id_paciente: UUID
    
    model_config = ConfigDict(from_attributes=True)

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

class ContratoCreate(ContratoBase):
    pass

class ContratoResponse(ContratoBase):
    id_contrato: UUID
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 6. MÓDULO: HISTÓRICO DE INTERAÇÕES
# ==========================================
class HistoricoInteracaoBase(BaseModel):
    id_cliente: UUID
    tipo_interacao: Optional[str] = "Visita"
    data_hora: Optional[datetime] = None
    coordenadas_geo: Optional[str] = None
    feedback_anotacoes: Optional[str] = None

class HistoricoInteracaoCreate(HistoricoInteracaoBase):
    pass

class HistoricoInteracaoResponse(HistoricoInteracaoBase):
    id_interacao: UUID
    
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
    pass

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
    pass

class PagamentoResponse(PagamentoBase):
    id_pagamento: UUID
    
    model_config = ConfigDict(from_attributes=True)