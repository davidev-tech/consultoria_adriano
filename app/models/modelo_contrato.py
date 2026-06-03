import uuid
from sqlalchemy import Column, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class ModeloContrato(Base):
    __tablename__ = "modelo_contrato"
    id_modelo = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome_modelo = Column(String(255), nullable=False)
    periodicidade_cobranca = Column(String(50))
    descricao_padrao = Column(Text)
    ativo = Column(Boolean, default=True)
    motivo_arquivamento = Column(String, nullable=True)
    contratos = relationship("Contrato", back_populates="modelo")