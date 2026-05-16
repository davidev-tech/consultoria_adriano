import os
from fastapi import FastAPI, Depends, HTTPException, status, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy import text, func, or_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import engine, get_db
import models
import schemas
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List

# 1. INICIALIZAÇÃO E DOCUMENTAÇÃO
models.Base.metadata.create_all(bind=engine)

def ensure_empresa_cliente_columns() -> None:
    """Cria colunas novas em `empresa_cliente` quando o banco já existe."""
    dialect = engine.dialect.name
    statements = []

    if dialect == "postgresql":
        statements = [
            "ALTER TABLE empresa_cliente ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
            "ALTER TABLE empresa_cliente ADD COLUMN IF NOT EXISTS cep VARCHAR(8)",
        ]
    elif dialect == "sqlite":
        with engine.connect() as conn:
            existing = {
                row[1] for row in conn.execute(text("PRAGMA table_info('empresa_cliente')"))
            }
            if "email" not in existing:
                statements.append("ALTER TABLE empresa_cliente ADD COLUMN email VARCHAR(255)")
            if "cep" not in existing:
                statements.append("ALTER TABLE empresa_cliente ADD COLUMN cep VARCHAR(8)")

    if not statements:
        return

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))

ensure_empresa_cliente_columns()

app = FastAPI(
    title="API - Gestão do Cuidado (PSA)", 
    version="2.0.0",
    description="Backend PSA focado em consultoria B2B, com tracking de visitas e auditoria financeira."
)

# 2. CONFIGURAÇÃO DE SEGURANÇA (CORS)
cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", "").split(",")
    if origin.strip()
]
cors_origin_regex = os.getenv(
    "CORS_ALLOW_ORIGIN_REGEX",
    r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173"], # Adicionado 5173 do Vite comum
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. TRATADOR GLOBAL DE ERROS
@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Erro de integridade: Verifique duplicidade ou IDs inexistentes."}
    )

# 4. ROTA RAIZ / STATUS
@app.get("/", tags=["Status"])
def read_root():
    return {
        "status": "online", 
        "projeto": "Gestão do Cuidado - PSA",
        "versao": "2.0.0",
        "docs": "/docs"
    }

# --- MÓDULO 1: DASHBOARD METRICS ---
@app.get("/dashboard/kpis", tags=["Dashboard"])
def obter_kpis_dashboard(db: Session = Depends(get_db)):
    """Retorna os dados consolidados para os 3 cards superiores do Dashboard."""
    total_empresas = db.query(models.EmpresaCliente).count()
    total_ativos = db.query(models.Contrato).filter(models.Contrato.status_contrato == "Ativo").count()
    soma_receita = db.query(func.sum(models.Contrato.valor_acordado)).filter(models.Contrato.status_contrato == "Ativo").scalar() or 0
    
    return {
        "total_empresas": total_empresas,
        "contratos_ativos": total_ativos,
        "receita_acordada": float(soma_receita)
    }

# --- MÓDULO 2: EMPRESAS ---
@app.post("/empresas", response_model=schemas.EmpresaResponse, tags=["Empresas"])
def criar_empresa(empresa: schemas.EmpresaCreate, db: Session = Depends(get_db)):
    if empresa.cnpj:
        existente = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.cnpj == empresa.cnpj).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este CNPJ já está cadastrado.")
            
    db_obj = models.EmpresaCliente(**empresa.model_dump(exclude_none=True))
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@app.get("/empresas", response_model=List[schemas.EmpresaResponse], tags=["Empresas"])
def listar_empresas(
    skip: int = Query(0),
    limit: int = Query(10, le=100),
    busca: Optional[str] = Query(None, description="Busca por nome ou CNPJ"),
    db: Session = Depends(get_db)
):
    query = db.query(models.EmpresaCliente)
    if busca:
        query = query.filter(or_(
            models.EmpresaCliente.nome_empresa.ilike(f"%{busca}%"),
            models.EmpresaCliente.cnpj.ilike(f"%{busca}%")
        ))
    return query.offset(skip).limit(limit).all()

@app.get("/empresas/{id_cliente}", response_model=schemas.EmpresaResponse, tags=["Empresas"])
def obter_empresa_por_id(id_cliente: UUID, db: Session = Depends(get_db)):
    """Retorna os dados de uma única empresa para abrir a subtela de histórico CRM."""
    empresa = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == id_cliente).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa cliente não encontrada.")
    return empresa

# --- MÓDULO 3: RESPONSÁVEIS (Contatos das Empresas) ---
@app.post("/responsaveis", response_model=schemas.ResponsavelResponse, tags=["Responsáveis"])
def criar_responsavel(obj_in: schemas.ResponsavelCreate, db: Session = Depends(get_db)):
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == obj_in.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa cliente não encontrada.")
    
    if obj_in.cpf:
        existente = db.query(models.Responsavel).filter(models.Responsavel.cpf == obj_in.cpf).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este CPF já cadastrado.")

    novo_obj = models.Responsavel(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/responsaveis/{id_cliente}", response_model=List[schemas.ResponsavelResponse], tags=["Responsáveis"])
def listar_responsaveis_por_cliente(
    id_cliente: UUID, 
    busca: Optional[str] = Query(None, description="Busca por nome ou CPF"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Responsavel).filter(models.Responsavel.id_cliente == id_cliente)
    if busca:
        query = query.filter(or_(
            models.Responsavel.nome.ilike(f"%{busca}%"),
            models.Responsavel.cpf.ilike(f"%{busca}%")
        ))
    return query.all()

# --- MÓDULO 4: MODELOS DE CONTRATO ---
@app.post("/modelos-contrato", response_model=schemas.ModeloContratoResponse, tags=["Modelos de Contrato"])
def criar_modelo(obj_in: schemas.ModeloContratoCreate, db: Session = Depends(get_db)):
    novo_obj = models.ModeloContrato(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/modelos-contrato", response_model=List[schemas.ModeloContratoResponse], tags=["Modelos de Contrato"])
def listar_modelos(
    busca: Optional[str] = Query(None, description="Busca por nome do modelo"),
    db: Session = Depends(get_db)
):
    query = db.query(models.ModeloContrato)
    if busca:
        query = query.filter(models.ModeloContrato.nome_modelo.ilike(f"%{busca}%"))
    return query.all()

# --- MÓDULO 5: CONTRATOS MESTRE ---
@app.post("/contratos", response_model=schemas.ContratoResponse, tags=["Contratos"])
def criar_contrato(obj_in: schemas.ContratoCreate, db: Session = Depends(get_db)):
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == obj_in.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    if not db.query(models.ModeloContrato).filter(models.ModeloContrato.id_modelo == obj_in.id_modelo).first():
        raise HTTPException(status_code=404, detail="Modelo de contrato não encontrado.")
        
    novo_obj = models.Contrato(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/contratos", response_model=List[schemas.ContratoResponse], tags=["Contratos"])
def listar_todos_contratos(
    id_cliente: Optional[UUID] = Query(None, description="Filtrar por empresa específica"),
    busca_status: Optional[str] = Query(None, description="Filtrar por status do contrato"),
    db: Session = Depends(get_db)
):
    """Listagem Geral de Contratos. Suporta o filtro 'Todas as empresas' da tabela do front."""
    query = db.query(models.Contrato)
    if id_cliente:
        query = query.filter(models.Contrato.id_cliente == id_cliente)
    if busca_status:
        query = query.filter(models.Contrato.status_contrato.ilike(f"%{busca_status}%"))
    return query.all()

# --- MÓDULO 6: HISTÓRICO DE INTERAÇÕES (CRM / Feed do Dashboard) ---
@app.post("/interacoes", response_model=schemas.HistoricoInteracaoResponse, tags=["Interações"])
def registrar_interacao(obj_in: schemas.HistoricoInteracaoCreate, db: Session = Depends(get_db)):
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == obj_in.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        
    novo_obj = models.HistoricoInteracoes(**obj_in.model_dump()) 
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/interacoes/recentes", response_model=List[schemas.HistoricoInteracaoResponse], tags=["Interações"])
def listar_interacoes_globais_recentes(limit: int = Query(5, le=20), db: Session = Depends(get_db)):
    """Alimenta o Feed em Tempo Real da página inicial do Dashboard."""
    return db.query(models.HistoricoInteracoes).order_by(models.HistoricoInteracoes.data_hora.desc()).limit(limit).all()

@app.get("/interacoes/cliente/{id_cliente}", response_model=List[schemas.HistoricoInteracaoResponse], tags=["Interações"])
def listar_interacoes_cliente(
    id_cliente: UUID, 
    busca: Optional[str] = Query(None, description="Busca por tipo ou anotações"),
    db: Session = Depends(get_db)
):
    query = db.query(models.HistoricoInteracoes).filter(models.HistoricoInteracoes.id_cliente == id_cliente)
    if busca:
        query = query.filter(or_(
            models.HistoricoInteracoes.tipo_interacao.ilike(f"%{busca}%"),
            models.HistoricoInteracoes.feedback_anotacoes.ilike(f"%{busca}%")
        ))
    return query.all()

# --- MÓDULO 7: VISITAS DE ATENDIMENTO / AUDITORIA ---
@app.post("/visitas", response_model=schemas.VisitaAtendimentoResponse, tags=["Visitas / Auditorias"])
def registrar_visita_campo(obj_in: schemas.VisitaAtendimentoCreate, db: Session = Depends(get_db)):
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == obj_in.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa cliente destino não encontrada.")
    
    novo_obj = models.VisitaAtendimento(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/visitas/cliente/{id_cliente}", response_model=List[schemas.VisitaAtendimentoResponse], tags=["Visitas / Auditorias"])
def listar_visitas_por_cliente(id_cliente: UUID, db: Session = Depends(get_db)):
    return db.query(models.VisitaAtendimento).filter(models.VisitaAtendimento.id_cliente == id_cliente).all()

# --- MÓDULO 8: ENTREGAS E PRAZOS (Milestones do Contrato) ---
@app.post("/entregas", response_model=schemas.EntregaPrazoResponse, tags=["Entregas"])
def criar_entrega(obj_in: schemas.EntregaPrazoCreate, db: Session = Depends(get_db)):
    if not db.query(models.Contrato).filter(models.Contrato.id_contrato == obj_in.id_contrato).first():
        raise HTTPException(status_code=404, detail="Contrato pai não encontrado.")
        
    novo_obj = models.EntregasPrazos(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/entregas/contrato/{id_contrato}", response_model=List[schemas.EntregaPrazoResponse], tags=["Entregas"])
def listar_entregas_contrato(
    id_contrato: UUID, 
    busca: Optional[str] = Query(None, description="Busca por descrição ou status"),
    db: Session = Depends(get_db)
):
    query = db.query(models.EntregasPrazos).filter(models.EntregasPrazos.id_contrato == id_contrato)
    if busca:
        query = query.filter(or_(
            models.EntregasPrazos.descricao_entrega.ilike(f"%{busca}%"),
            models.EntregasPrazos.status_entrega.ilike(f"%{busca}%")
        ))
    return query.all()

# --- MÓDULO 9: PAGAMENTOS ---
@app.post("/pagamentos", response_model=schemas.PagamentoResponse, tags=["Pagamentos"])
def registrar_pagamento(obj_in: schemas.PagamentoCreate, db: Session = Depends(get_db)):
    contrato = db.query(models.Contrato).filter(models.Contrato.id_contrato == obj_in.id_contrato).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato vinculado não encontrado.")
    
    total_pago = db.query(func.sum(models.Pagamento.valor)).filter(
        models.Pagamento.id_contrato == obj_in.id_contrato
    ).scalar() or 0
    
    if (float(total_pago) + obj_in.valor) > contrato.valor_acordado:
        raise HTTPException(
            status_code=400, 
            detail=f"Valor excede o total. Saldo: {contrato.valor_acordado - float(total_pago)}"
        )
        
    novo_obj = models.Pagamento(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/pagamentos/contrato/{id_contrato}", response_model=List[schemas.PagamentoResponse], tags=["Pagamentos"])
def listar_pagamentos_contrato(
    id_contrato: UUID, 
    busca: Optional[str] = Query(None, description="Busca por status ou forma de pagamento"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Pagamento).filter(models.Pagamento.id_contrato == id_contrato)
    if busca:
        query = query.filter(or_(
            models.Pagamento.status_pagamento.ilike(f"%{busca}%"),
            models.Pagamento.forma_pagamento.ilike(f"%{busca}%")
        ))
    return query.all()