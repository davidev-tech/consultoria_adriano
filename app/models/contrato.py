import uuid
from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP, DATE, Numeric, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import func
from app.core.database import Base

class Contrato(Base):
    __tablename__ = "contrato"
    id_contrato = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_cliente = Column(UUID(as_uuid=True), ForeignKey("empresa_cliente.id_cliente", ondelete="CASCADE"), nullable=False)
    id_modelo = Column(UUID(as_uuid=True), ForeignKey("modelo_contrato.id_modelo"))
    valor_acordado = Column(Numeric(15, 2))
    status_contrato = Column(String(50))
    data_inicio = Column(DATE)
    data_fim = Column(DATE)
    cobra_juros = Column(Boolean, default=False)
    taxa_juros = Column(Numeric(5, 2), default=0.00)
    motivo_arquivamento = Column(Text, nullable=True)
    data_criacao = Column(TIMESTAMP(timezone=True), server_default=func.now())
    dia_vencimento = Column(Integer, default=5)

    empresa = relationship("EmpresaCliente", back_populates="contratos")
    modelo = relationship("ModeloContrato", back_populates="contratos")
    entregas = relationship("Entrega", back_populates="contrato", cascade="all, delete-orphan")
    pagamentos = relationship("Pagamento", cascade="all, delete-orphan")
    faturas = relationship("Fatura", back_populates="contrato", cascade="all, delete-orphan")