import uuid
from sqlalchemy import Column, String, ForeignKey, TIMESTAMP, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Pagamento(Base):
    __tablename__ = "pagamento"
    id_pagamento = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_contrato = Column(UUID(as_uuid=True), ForeignKey("contrato.id_contrato", ondelete="CASCADE"), nullable=False)
    data_pagamento = Column(TIMESTAMP)
    valor = Column(Numeric(15, 2))
    forma_pagamento = Column(String(50))
    status_pagamento = Column(String(50))
    valor_juros = Column(Numeric(15, 2), default=0.00)
    id_fatura = Column(UUID(as_uuid=True), ForeignKey("faturas.id_fatura", ondelete="SET NULL"), nullable=True)
    contrato = relationship("Contrato", back_populates="pagamentos")
    fatura = relationship("Fatura", back_populates="pagamentos")