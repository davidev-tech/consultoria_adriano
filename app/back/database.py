import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("A variável DATABASE_URL não foi encontrada!")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_pre_ping=True,      # Já estava aqui, ótimo para testar conexões caídas
    pool_size=5,             # Mantém no máximo 5 conexões persistentes abertas
    max_overflow=10,         # Permite abrir até 10 conexões extras em picos de acessos
    pool_timeout=30,         # Se o banco estiver lotado, espera até 30s por uma vaga antes de dar erro
    pool_recycle=1800        # Recicla conexões antigas a cada 30 minutos
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()