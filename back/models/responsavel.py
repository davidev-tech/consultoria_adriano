import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from back.core.database import Base

class Responsavel(Base):
    __tablename__ = "responsavel"
    id_responsavel = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_cliente = Column(UUID(as_uuid=True), ForeignKey("empresa_cliente.id_cliente", ondelete="CASCADE"), nullable=False)
    nome = Column(String(255), nullable=False)
    cpf = Column(String(14), unique=True)
    cargo = Column(String(100))
    empresa = relationship("EmpresaCliente", back_populates="responsaveis")