import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# O código lê a variável que você configurou no Render
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Se por acaso a variável estiver vazia, o Status 1 acontece aqui
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("A variável DATABASE_URL não foi encontrada!")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()