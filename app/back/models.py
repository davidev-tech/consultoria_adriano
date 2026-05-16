import uuid
from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP, DATE, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base

# ==========================================
# 1. TABELAS MESTRE (ENTIDADES BASE)
# ==========================================

class EmpresaCliente(Base):
    __tablename__ = "empresa_cliente"
    
    id_cliente = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome_empresa = Column(String(255), nullable=False)
    cnpj = Column(String(20), unique=True)
    email = Column(String(255))
    cep = Column(String(8))
    localizacao = Column(Text)
    servico_prestado = Column(Text)

    # Relacionamentos corrigidos (Removido 'pacientes', adicionado 'visitas')
    responsaveis = relationship("Responsavel", back_populates="empresa", cascade="all, delete-orphan")
    contratos = relationship("Contrato", back_populates="empresa", cascade="all, delete-orphan")
    interacoes = relationship("HistoricoInteracoes", back_populates="empresa", cascade="all, delete-orphan")
    visitas = relationship("VisitaAtendimento", back_populates="empresa", cascade="all, delete-orphan")


class ModeloContrato(Base):
    __tablename__ = "modelo_contrato"
    
    id_modelo = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome_modelo = Column(String(255), nullable=False)
    periodicidade_cobranca = Column(String(50))
    descricao_padrao = Column(Text)
    
    # Relacionamentos
    contratos = relationship("Contrato", back_populates="modelo")


# ==========================================
# 2. PRIMEIRO NÍVEL DE DEPENDÊNCIA
# ==========================================

class Responsavel(Base):
    __tablename__ = "responsavel"
    
    id_responsavel = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_cliente = Column(UUID(as_uuid=True), ForeignKey("empresa_cliente.id_cliente", ondelete="CASCADE"))
    nome = Column(String(255), nullable=False)
    cpf = Column(String(14), unique=True)
    cargo = Column(String(100))
    
    empresa = relationship("EmpresaCliente", back_populates="responsaveis")


class HistoricoInteracoes(Base):
    __tablename__ = "historico_interacoes"
    
    id_interacao = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_cliente = Column(UUID(as_uuid=True), ForeignKey("empresa_cliente.id_cliente", ondelete="CASCADE"))
    tipo_interacao = Column(String(100))
    data_hora = Column(TIMESTAMP)
    coordenadas_geo = Column(String(100))
    feedback_anotacoes = Column(Text)
    
    empresa = relationship("EmpresaCliente", back_populates="interacoes")


class Contrato(Base):
    __tablename__ = "contrato"
    
    id_contrato = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_cliente = Column(UUID(as_uuid=True), ForeignKey("empresa_cliente.id_cliente", ondelete="CASCADE"))
    id_modelo = Column(UUID(as_uuid=True), ForeignKey("modelo_contrato.id_modelo"))
    valor_acordado = Column(Numeric(15, 2))
    status_contrato = Column(String(50))
    data_inicio = Column(DATE)
    data_fim = Column(DATE)
    
    empresa = relationship("EmpresaCliente", back_populates="contratos")
    modelo = relationship("ModeloContrato", back_populates="contratos")
    visitas = relationship("VisitaAtendimento", back_populates="contrato", cascade="all, delete-orphan")
    entregas = relationship("EntregasPrazos", back_populates="contrato", cascade="all, delete-orphan")


# ==========================================
# 3. SEGUNDO E TERCEIRO NÍVEL (DETALHES)
# ==========================================

class EntregasPrazos(Base):
    __tablename__ = "entregas_prazos"
    
    id_entrega = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_contrato = Column(UUID(as_uuid=True), ForeignKey("contrato.id_contrato", ondelete="CASCADE"))
    descricao_entrega = Column(Text, nullable=False)
    data_prazo_limite = Column(DATE)
    data_conclusao = Column(DATE)
    status_entrega = Column(String(50))
    
    contrato = relationship("Contrato", back_populates="entregas")


class VisitaAtendimento(Base):
    __tablename__ = "visita_atendimento"
    
    id_visita = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_contrato = Column(UUID(as_uuid=True), ForeignKey("contrato.id_contrato"))
    id_cliente = Column(UUID(as_uuid=True), ForeignKey("empresa_cliente.id_cliente", ondelete="CASCADE"))
    data_hora = Column(TIMESTAMP)
    grau_urgencia = Column(String(50))
    feedback_anotacoes = Column(Text)
    
    contrato = relationship("Contrato", back_populates="visitas")
    empresa = relationship("EmpresaCliente", back_populates="visitas") # <- Corrigido para EmpresaCliente
    pagamentos = relationship("Pagamento", back_populates="visita", cascade="all, delete-orphan")


class Pagamento(Base):
    __tablename__ = "pagamento"
    
    id_pagamento = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_contrato = Column(UUID(as_uuid=True), ForeignKey("contrato.id_contrato", ondelete="CASCADE"))
    id_visita = Column(UUID(as_uuid=True), ForeignKey("visita_atendimento.id_visita"))
    data_pagamento = Column(TIMESTAMP)
    valor = Column(Numeric(15, 2))
    forma_pagamento = Column(String(50))
    condicao_pagamento = Column(Text)
    status_pagamento = Column(String(50))
    
    visita = relationship("VisitaAtendimento", back_populates="pagamentos")