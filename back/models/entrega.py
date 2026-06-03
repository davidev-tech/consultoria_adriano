import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DATE
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from back.core.database import Base

class Entrega(Base):
    __tablename__ = "entregas_prazos"
    id_entrega = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_contrato = Column(UUID(as_uuid=True), ForeignKey("contrato.id_contrato", ondelete="CASCADE"), nullable=False)
    descricao_entrega = Column(Text, nullable=False)
    data_prazo_limite = Column(DATE, nullable=True)
    status_entrega = Column(String(50), default="Pendente")
    data_conclusao = Column(DATE, nullable=True)
    contrato = relationship("Contrato", back_populates="entregas")