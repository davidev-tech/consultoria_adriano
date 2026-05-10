from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from . import models, schemas
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # No futuro, coloque apenas a URL do seu Lovable aqui
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. INICIALIZAÇÃO E BANCO
# Garante que todas as 9 tabelas existam no Supabase
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API - Gestão do Cuidado", version="1.1.0")

# 2. ROTAS GERAIS
@app.get("/")
def read_root():
    return {"status": "online", "projeto": "Gestão do Cuidado - Adriano"}

# ---------------------------------------------------------
# 3. MÓDULO: EMPRESAS (Entidade Mestre)
# ---------------------------------------------------------
@app.post("/empresas", response_model=schemas.EmpresaResponse)
def criar_empresa(empresa: schemas.EmpresaCreate, db: Session = Depends(get_db)):
    db_empresa = models.EmpresaCliente(**empresa.model_dump())
    db.add(db_empresa)
    db.commit()
    db.refresh(db_empresa)
    return db_empresa

@app.get("/empresas")
def listar_empresas(db: Session = Depends(get_db)):
    return db.query(models.EmpresaCliente).all()

# ---------------------------------------------------------
# 4. MÓDULO: RESPONSÁVEIS (Contatos)
# ---------------------------------------------------------
@app.post("/responsaveis", response_model=schemas.ResponsavelResponse)
def criar_responsavel(obj_in: schemas.ResponsavelCreate, db: Session = Depends(get_db)):
    novo_obj = models.Responsavel(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/responsaveis/{id_cliente}")
def listar_responsaveis_por_cliente(id_cliente: UUID, db: Session = Depends(get_db)):
    return db.query(models.Responsavel).filter(models.Responsavel.id_cliente == id_cliente).all()

# ---------------------------------------------------------
# 5. MÓDULO: MODELOS DE CONTRATO
# ---------------------------------------------------------
@app.post("/modelos-contrato", response_model=schemas.ModeloContratoResponse)
def criar_modelo(obj_in: schemas.ModeloContratoCreate, db: Session = Depends(get_db)):
    novo_obj = models.ModeloContrato(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/modelos-contrato")
def listar_modelos(db: Session = Depends(get_db)):
    return db.query(models.ModeloContrato).all()

# ---------------------------------------------------------
# 6. MÓDULO: PACIENTES
# ---------------------------------------------------------
@app.post("/pacientes", response_model=schemas.PacienteResponse)
def criar_paciente(obj_in: schemas.PacienteCreate, db: Session = Depends(get_db)):
    novo_obj = models.PacienteBeneficiario(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

# ---------------------------------------------------------
# 7. MÓDULO: CONTRATOS
# ---------------------------------------------------------
@app.post("/contratos", response_model=schemas.ContratoResponse)
def criar_contrato(obj_in: schemas.ContratoCreate, db: Session = Depends(get_db)):
    # Dica de engenharia: Aqui poderíamos validar se a data_fim é maior que data_inicio
    novo_obj = models.Contrato(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/contratos/{id_cliente}")
def listar_contratos_por_empresa(id_cliente: UUID, db: Session = Depends(get_db)):
    return db.query(models.Contrato).filter(models.Contrato.id_cliente == id_cliente).all()

# ---------------------------------------------------------
# 8. MÓDULO: HISTÓRICO DE INTERAÇÕES
# ---------------------------------------------------------
@app.post("/interacoes", response_model=schemas.HistoricoInteracaoResponse)
def registrar_interacao(obj_in: schemas.HistoricoInteracaoCreate, db: Session = Depends(get_db)):
    novo_obj = models.HistoricoInteracao(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/interacoes/{id_contrato}")
def listar_historico_contrato(id_contrato: UUID, db: Session = Depends(get_db)):
    return db.query(models.HistoricoInteracao).filter(models.HistoricoInteracao.id_contrato == id_contrato).all()

# ---------------------------------------------------------
# 9. MÓDULO: PAGAMENTOS
# ---------------------------------------------------------
@app.post("/pagamentos", response_model=schemas.PagamentoResponse)
def registrar_pagamento(obj_in: schemas.PagamentoCreate, db: Session = Depends(get_db)):
    novo_obj = models.Pagamento(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/pagamentos/contrato/{id_contrato}")
def listar_pagamentos_contrato(id_contrato: UUID, db: Session = Depends(get_db)):
    return db.query(models.Pagamento).filter(models.Pagamento.id_contrato == id_contrato).all()