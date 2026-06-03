import uuid
import datetime
from sqlalchemy import Column, ForeignKey, DATE
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from back.core.database import Base

class ServicoPrestado(Base):
    __tablename__ = "servico_prestado"
    id_vinculo = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_cliente = Column(UUID(as_uuid=True), ForeignKey("empresa_cliente.id_cliente", ondelete="CASCADE"), nullable=False)
    id_servico = Column(UUID(as_uuid=True), ForeignKey("catalogo_servico.id_servico", ondelete="RESTRICT"), nullable=False)
    data_inicio = Column(DATE, default=datetime.date.today, nullable=False)

    empresa = relationship("EmpresaCliente", back_populates="servicos_contratados")
    servico_catalogo = relationship("CatalogoServico", back_populates="vinculos")

    @property
    def tipo_servico(self):
        return self.servico_catalogo.tipo_servico if self.servico_catalogo else None