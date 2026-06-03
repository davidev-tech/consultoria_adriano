import uuid
from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP, Numeric, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class HistoricoInteracoes(Base):
    __tablename__ = "historico_interacoes"
    id_interacao = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_cliente = Column(UUID(as_uuid=True), ForeignKey("empresa_cliente.id_cliente", ondelete="CASCADE"), nullable=False)
    tipo_interacao = Column(String(100))
    data_hora = Column(TIMESTAMP)
    grau_urgencia = Column(String(50), default="")
    status_financeiro = Column(String(50), default="Não Cobrado")
    valor_cobrado = Column(Numeric(15, 2), nullable=True)
    feedback_anotacoes = Column(Text)
    status_pagamento = Column(String(50), nullable=True, default="Pendente")
    nota = Column(Integer, nullable=True)
    empresa = relationship("EmpresaCliente", back_populates="interacoes")