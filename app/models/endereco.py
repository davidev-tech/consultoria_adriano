from sqlalchemy import Column, String, Text
from app.core.database import Base

class Endereco(Base):
    __tablename__ = "endereco"
    cep = Column(String(8), primary_key=True)
    bairro = Column(Text, nullable=False)
    cidade = Column(Text, nullable=False)
    estado = Column(String(2), nullable=False)