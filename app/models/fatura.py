import uuid
from sqlalchemy import Column, String, ForeignKey, TIMESTAMP, DATE, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import func
from app.core.database import Base

class Fatura(Base):
    __tablename__ = "faturas"
    id_fatura = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    id_contrato = Column(UUID(as_uuid=True), ForeignKey("contrato.id_contrato", ondelete="CASCADE"), nullable=False)
    valor_original = Column(Numeric(15, 2), nullable=False)
    data_vencimento = Column(DATE, nullable=False)
    status = Column(String(20), default="Pendente")
    data_pagamento = Column(DATE, nullable=True)
    valor_pago = Column(Numeric(15, 2), nullable=True)
    valor_juros_pago = Column(Numeric(15, 2), default=0.00)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    contrato = relationship("Contrato", back_populates="faturas")
    pagamentos = relationship("Pagamento", back_populates="fatura")