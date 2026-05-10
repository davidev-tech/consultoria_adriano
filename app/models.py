# app/models.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from .database import Base

class Visita(Base):
    __tablename__ = "visitas"

    id = Column(Integer, primary_key=True, index=True)
    empresa_nome = Column(String, index=True)
    data_visita = Column(DateTime(timezone=True), server_default=func.now())
    observacoes = Column(String)