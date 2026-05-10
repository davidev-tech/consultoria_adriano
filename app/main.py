from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models  # Importante para o SQLAlchemy encontrar as tabelas

# Cria as tabelas no banco de dados automaticamente
Base.metadata.create_all(bind=engine)

# Inicialização da aplicação
app = FastAPI(
    title="API - Gestão do Cuidado",
    description="Backend para consultoria e gestão operacional do Adriano.",
    version="1.0.0"
)

# Configuração de CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rota básica de verificação (Health Check)
@app.get("/")
def read_root():
    return {
        "status": "online",
        "projeto": "Gestão do Cuidado",
        "mensagem": "Motor FastAPI a funcionar corretamente!"
    }