import uuid
from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP, DATE, Numeric, INTEGER, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import datetime

# ==========================================
# 0. CATÁLOGO E VÍNCULOS DE SERVIÇOS
# ==========================================

class CatalogoServico(Base):
    __tablename__ = "catalogo_servico"
    id_servico = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo_servico = Column(Text)  # ✅ ALINHADO: text, não String(255)    descricao_servico = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)  # ✅ timestampt
    vinculos = relationship("ServicoPrestado", back_populates="servico_catalogo")

class ServicoPrestado(Base):
    __tablename__ = "servico_prestado"
    id_vinculo = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_cliente = Column(UUID(as_uuid=True), ForeignKey("empresa_cliente.id_cliente", ondelete="CASCADE"))
    id_servico = Column(UUID(as_uuid=True), ForeignKey("catalogo_servico.id_servico", ondelete="RESTRICT"))
    data_inicio = Column(DATE, default=datetime.date.today)  # ✅ CORRIGIDO: DATE, não TIMESTAMP
    
    empresa = relationship("EmpresaCliente", back_populates="servicos_contratados")
    servico_catalogo = relationship("CatalogoServico", back_populates="vinculos")

    @property
    def tipo_servico(self):
        return self.servico_catalogo.tipo_servico if self.servico_catalogo else None

# ==========================================
# 1. TABELAS MESTRE
# ==========================================

class EmpresaCliente(Base):
    __tablename__ = "empresa_cliente"
    id_cliente = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome_empresa = Column(String(255), nullable=False)
    cnpj = Column(String(20), unique=True)
    cep = Column(String(8), ForeignKey("endereco.cep"), nullable=True)  # 👈 novo
    segmento = Column(String(50))
    porte = Column(String(50))

    endereco = relationship("Endereco")  # 👈 novo

    servicos_contratados = relationship("ServicoPrestado", back_populates="empresa", cascade="all, delete-orphan")
    responsaveis = relationship("Responsavel", back_populates="empresa", cascade="all, delete-orphan")
    contratos = relationship("Contrato", back_populates="empresa", cascade="all, delete-orphan")
    interacoes = relationship("HistoricoInteracoes", back_populates="empresa", cascade="all, delete-orphan")


class Endereco(Base):
    __tablename__ = "endereco"
    cep = Column(String(8), primary_key=True)
    bairro = Column(Text, nullable=False)
    cidade = Column(Text, nullable=False)
    estado = Column(String(2), nullable=False)

class ModeloContrato(Base):
    __tablename__ = "modelo_contrato"
    id_modelo = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome_modelo = Column(String(255), nullable=False)
    periodicidade_cobranca = Column(String(50))
    descricao_padrao = Column(Text)
    ativo = Column(Boolean, default=True) 
    contratos = relationship("Contrato", back_populates="modelo")
    motivo_arquivamento = Column(String, nullable=True)

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
    grau_urgencia = Column(String(50))
    status_financeiro = Column(String(50), default="Não Paga")
    valor_cobrado = Column(Numeric(15, 2), nullable=True)
    feedback_anotacoes = Column(Text)
    status_pagamento = Column(String(50), nullable=True, default="Pendente")
    empresa = relationship("EmpresaCliente", back_populates="interacoes")
    nota = Column(INTEGER, nullable=True)
    
    # ✅ Apenas UMA definição de cada campo

class Contrato(Base):
    __tablename__ = "contrato"
    id_contrato = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_cliente = Column(UUID(as_uuid=True), ForeignKey("empresa_cliente.id_cliente", ondelete="CASCADE"))
    id_modelo = Column(UUID(as_uuid=True), ForeignKey("modelo_contrato.id_modelo"))
    valor_acordado = Column(Numeric(15, 2))
    status_contrato = Column(String(50))
    data_inicio = Column(DATE)
    data_fim = Column(DATE)
    cobra_juros = Column(Boolean, default=False)
    taxa_juros = Column(Numeric(5, 2), default=0.00)
    motivo_arquivamento = Column(String(100), nullable=True)
    data_criacao = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)

    empresa = relationship("EmpresaCliente", back_populates="contratos")
    modelo = relationship("ModeloContrato", back_populates="contratos")
    entregas = relationship("Entrega", back_populates="contrato", cascade="all, delete-orphan")
    pagamentos = relationship("Pagamento", cascade="all, delete-orphan")
    faturas = relationship("Fatura", back_populates="contrato", cascade="all, delete-orphan")

# ==========================================
# 3. SEGUNDO E TERCEIRO NÍVEL
# ==========================================

class Entrega(Base):
    __tablename__ = "entregas_prazos"

    id_entrega = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_contrato = Column(UUID(as_uuid=True), ForeignKey("contrato.id_contrato"), nullable=False)
    descricao_entrega = Column(Text, nullable=False)
    data_prazo_limite = Column(DATE, nullable=False)
    status_entrega = Column(String(50), default="Pendente")
    data_conclusao = Column(DateTime, nullable=True)

    contrato = relationship("Contrato", back_populates="entregas") # 👈 Agora `Date` está definido


class Pagamento(Base):
    __tablename__ = "pagamento"
    id_pagamento = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_contrato = Column(UUID(as_uuid=True), ForeignKey("contrato.id_contrato", ondelete="CASCADE"))
    data_pagamento = Column(TIMESTAMP)
    valor = Column(Numeric(15, 2))
    forma_pagamento = Column(String(50))
    status_pagamento = Column(String(50))
    data_vencimento = Column(DATE, nullable=True) 
    valor_juros = Column(Numeric(15, 2), default=0.00) 

    contrato = relationship("Contrato", back_populates="pagamentos")

class Fatura(Base): 
    __tablename__ = "faturas"
    id_fatura = Column(UUID(as_uuid=True),default=uuid.uuid4, primary_key=True, index=True)
    id_contrato = Column(UUID(as_uuid=True), ForeignKey("contrato.id_contrato", ondelete="CASCADE"))
    valor_original = Column(Numeric(15, 2), nullable=False)
    data_vencimento = Column(DATE, nullable=False)
    status = Column(String(20), default="Pendente")
    data_pagamento = Column(DATE, nullable=True)
    valor_pago = Column(Numeric(15, 2), nullable=True)
    valor_juros_pago = Column(Numeric(15, 2), default=0.00)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    contrato = relationship("Contrato", back_populates="faturas")