import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Carrega as senhas do arquivo .env
load_dotenv()

# Busca a URL do banco que você salvou lá
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(SQLALCHEMY_DATABASE_URL)

# ... o resto do código continua igual ...

# Fábrica de sessões para realizar operações (queries, inserts)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe base para a criação dos futuros modelos (tabelas)
Base = declarative_base()

# Dependência para o FastAPI gerir o ciclo de vida das sessões
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()