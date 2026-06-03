import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class EmpresaCliente(Base):
    __tablename__ = "empresa_cliente"
    id_cliente = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome_empresa = Column(String(255), nullable=False)
    cnpj = Column(String(20), unique=True)
    cep = Column(String(8), ForeignKey("endereco.cep"), nullable=True)
    segmento = Column(String(50))
    porte = Column(String(50))

    endereco = relationship("Endereco")
    servicos_contratados = relationship("ServicoPrestado", back_populates="empresa", cascade="all, delete-orphan")
    responsaveis = relationship("Responsavel", back_populates="empresa", cascade="all, delete-orphan")
    contratos = relationship("Contrato", back_populates="empresa", cascade="all, delete-orphan")
    interacoes = relationship("HistoricoInteracoes", back_populates="empresa", cascade="all, delete-orphan")