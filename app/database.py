import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Localiza o arquivo .env subindo um nível a partir da pasta 'app'
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Gerenciador de conexão para as rotas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()