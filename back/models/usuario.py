import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from back.core.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)