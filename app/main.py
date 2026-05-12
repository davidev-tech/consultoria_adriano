from fastapi import FastAPI, Depends, HTTPException, status, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from .database import engine, get_db
from . import models, schemas
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware

# 1. INICIALIZAÇÃO E DOCUMENTAÇÃO
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API - Gestão do Cuidado", 
    version="1.5.0",
    description="Backend de alta integridade com paginação e blindagem financeira lógica."
)

# 2. TRATADOR GLOBAL DE ERROS (Defensive Programming)
@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Erro de integridade: Verifique duplicidade ou IDs inexistentes."}
    )

# 3. CONFIGURAÇÃO DE SEGURANÇA (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MÓDULO 1: EMPRESAS (Com Paginação) ---
@app.post("/empresas", response_model=schemas.EmpresaResponse, tags=["Empresas"])
def criar_empresa(empresa: schemas.EmpresaCreate, db: Session = Depends(get_db)):
    if empresa.cnpj:
        existente = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.cnpj == empresa.cnpj).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este CNPJ já está cadastrado.")
    
    db_obj = models.EmpresaCliente(**empresa.model_dump())
    db.add(db_obj); db.commit(); db.refresh(db_obj)
    return db_obj

@app.get("/empresas", response_model=list[schemas.EmpresaResponse], tags=["Empresas"])
def listar_empresas(
    skip: int = Query(0, description="Registros a pular"),
    limit: int = Query(10, description="Registros a retornar (max 100)", le=100),
    db: Session = Depends(get_db)
):
    return db.query(models.EmpresaCliente).offset(skip).limit(limit).all()

# --- MÓDULO 2: RESPONSÁVEIS ---
@app.post("/responsaveis", response_model=schemas.ResponsavelResponse, tags=["Responsáveis"])
def criar_responsavel(obj_in: schemas.ResponsavelCreate, db: Session = Depends(get_db)):
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == obj_in.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa cliente não encontrada.")
    
    if obj_in.cpf:
        if db.query(models.Responsavel).filter(models.Responsavel.cpf == obj_in.cpf).first():
            raise HTTPException(status_code=400, detail="Este CPF já está cadastrado.")

    novo_obj = models.Responsavel(**obj_in.model_dump())
    db.add(novo_obj); db.commit(); db.refresh(novo_obj)
    return novo_obj

@app.get("/responsaveis/{id_cliente}", response_model=list[schemas.ResponsavelResponse], tags=["Responsáveis"])
def listar_responsaveis_por_cliente(id_cliente: UUID, db: Session = Depends(get_db)):
    return db.query(models.Responsavel).filter(models.Responsavel.id_cliente == id_cliente).all()

# --- MÓDULO 3: MODELOS DE CONTRATO ---
@app.post("/modelos-contrato", response_model=schemas.ModeloContratoResponse, tags=["Modelos de Contrato"])
def criar_modelo(obj_in: schemas.ModeloContratoCreate, db: Session = Depends(get_db)):
    novo_obj = models.ModeloContrato(**obj_in.model_dump())
    db.add(novo_obj); db.commit(); db.refresh(novo_obj)
    return novo_obj

@app.get("/modelos-contrato", response_model=list[schemas.ModeloContratoResponse], tags=["Modelos de Contrato"])
def listar_modelos(db: Session = Depends(get_db)):
    return db.query(models.ModeloContrato).all()

# --- MÓDULO 4: PACIENTES ---
@app.post("/pacientes", response_model=schemas.PacienteResponse, tags=["Pacientes"])
def criar_paciente(obj_in: schemas.PacienteCreate, db: Session = Depends(get_db)):
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == obj_in.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa cliente não encontrada.")
        
    novo_obj = models.PacienteBeneficiario(**obj_in.model_dump())
    db.add(novo_obj); db.commit(); db.refresh(novo_obj)
    return novo_obj

@app.get("/pacientes/{id_cliente}", response_model=list[schemas.PacienteResponse], tags=["Pacientes"])
def listar_pacientes_por_empresa(id_cliente: UUID, db: Session = Depends(get_db)):
    return db.query(models.PacienteBeneficiario).filter(models.PacienteBeneficiario.id_cliente == id_cliente).all()

# --- MÓDULO 5: CONTRATOS ---
@app.post("/contratos", response_model=schemas.ContratoResponse, tags=["Contratos"])
def criar_contrato(obj_in: schemas.ContratoCreate, db: Session = Depends(get_db)):
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == obj_in.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    if not db.query(models.ModeloContrato).filter(models.ModeloContrato.id_modelo == obj_in.id_modelo).first():
        raise HTTPException(status_code=404, detail="Modelo de contrato não encontrado.")
        
    novo_obj = models.Contrato(**obj_in.model_dump())
    db.add(novo_obj); db.commit(); db.refresh(novo_obj)
    return novo_obj

@app.get("/contratos/{id_cliente}", response_model=list[schemas.ContratoResponse], tags=["Contratos"])
def listar_contratos_por_empresa(id_cliente: UUID, db: Session = Depends(get_db)):
    return db.query(models.Contrato).filter(models.Contrato.id_cliente == id_cliente).all()

# --- MÓDULO 6: HISTÓRICO DE INTERAÇÕES ---
@app.post("/interacoes", response_model=schemas.HistoricoInteracaoResponse, tags=["Interações"])
def registrar_interacao(obj_in: schemas.HistoricoInteracaoCreate, db: Session = Depends(get_db)):
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == obj_in.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        
    novo_obj = models.HistoricoInteracoes(**obj_in.model_dump()) 
    db.add(novo_obj); db.commit(); db.refresh(novo_obj)
    return novo_obj

@app.get("/interacoes/{id_cliente}", response_model=list[schemas.HistoricoInteracaoResponse], tags=["Interações"])
def listar_interacoes_cliente(id_cliente: UUID, db: Session = Depends(get_db)):
    return db.query(models.HistoricoInteracoes).filter(models.HistoricoInteracoes.id_cliente == id_cliente).all()

# --- MÓDULO 7: ENTREGAS E PRAZOS ---
@app.post("/entregas", response_model=schemas.EntregaPrazoResponse, tags=["Entregas"])
def criar_entrega(obj_in: schemas.EntregaPrazoCreate, db: Session = Depends(get_db)):
    if not db.query(models.Contrato).filter(models.Contrato.id_contrato == obj_in.id_contrato).first():
        raise HTTPException(status_code=404, detail="Contrato pai não encontrado.")
        
    novo_obj = models.EntregaPrazo(**obj_in.model_dump())
    db.add(novo_obj); db.commit(); db.refresh(novo_obj)
    return novo_obj

@app.get("/entregas/contrato/{id_contrato}", response_model=list[schemas.EntregaPrazoResponse], tags=["Entregas"])
def listar_entregas_contrato(id_contrato: UUID, db: Session = Depends(get_db)):
    return db.query(models.EntregaPrazo).filter(models.EntregaPrazo.id_contrato == id_contrato).all()

# --- MÓDULO 8: PAGAMENTOS (Com Blindagem Financeira) ---
@app.post("/pagamentos", response_model=schemas.PagamentoResponse, tags=["Pagamentos"])
def registrar_pagamento(obj_in: schemas.PagamentoCreate, db: Session = Depends(get_db)):
    # 1. Check de Existência
    contrato = db.query(models.Contrato).filter(models.Contrato.id_contrato == obj_in.id_contrato).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato vinculado não encontrado.")
    
    # 2. Validação Lógica Financeira
    pagamentos_atuais = db.query(models.Pagamento).filter(models.Pagamento.id_contrato == obj_in.id_contrato).all()
    total_pago = sum(p.valor for p in pagamentos_atuais)
    
    if (total_pago + obj_in.valor) > contrato.valor_acordado:
        raise HTTPException(
            status_code=400, 
            detail=f"Valor excede o total do contrato. Saldo restante: {contrato.valor_acordado - total_pago}"
        )
        
    novo_obj = models.Pagamento(**obj_in.model_dump())
    db.add(novo_obj); db.commit(); db.refresh(novo_obj)
    return novo_obj

@app.get("/pagamentos/contrato/{id_contrato}", response_model=list[schemas.PagamentoResponse], tags=["Pagamentos"])
def listar_pagamentos_contrato(id_contrato: UUID, db: Session = Depends(get_db)):
    return db.query(models.Pagamento).filter(models.Pagamento.id_contrato == id_contrato).all()