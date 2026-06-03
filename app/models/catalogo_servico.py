import uuid
from sqlalchemy import Column, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import func
from app.core.database import Base

class CatalogoServico(Base):
    __tablename__ = "catalogo_servico"
    id_servico = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo_servico = Column(Text)
    descricao_servico = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    vinculos = relationship("ServicoPrestado", back_populates="servico_catalogo")