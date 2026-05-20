from fastapi import FastAPI, Depends, HTTPException, status, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, text
from database import engine, get_db
import models
import schemas
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
import time
import jwt
from fastapi import APIRouter

# 1. INICIALIZAÇÃO DO BANCO
models.Base.metadata.create_all(bind=engine)

def ensure_empresa_cliente_columns() -> None:
    dialect = engine.dialect.name
    statements = []
    
    if dialect == "postgresql":
        statements = [
            "ALTER TABLE empresa_cliente ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
            "ALTER TABLE empresa_cliente ADD COLUMN IF NOT EXISTS cep VARCHAR(8)",
        ]
    elif dialect == "sqlite":
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info('empresa_cliente')")).mappings()
            existing = [row["name"] for row in result]
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
    title="Gestão do Cuidado (PSA)",
    version="2.0.0",
    description="Backend PSA focado em consultoria B2B, com tracking de visitas e auditoria financeira."
)

# 2. CONFIGURACAO DE SEGURANCA (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False, 
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(tags=["Metabase"])

METABASE_SECRET_KEY = "1f9325def9abf761d543eb8b1e61f77cc4a43dec7fada58d0f9d26c37db3bb7f"
METABASE_RESOURCES: Dict[str, dict] = {
    "contratos": {"dashboard": 34},
    "financeiro": {"dashboard": 35},  
    "interacoes": {"dashboard": 36},  
}
METABASE_SITE_URL = "http://localhost:3000"

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
        "version": "2.0.0",
        "docs": "/docs"
    }

# --- MÓDULO 1: DASHBOARD METRICS ---
@app.get("/dashboard/kpis", tags=["Dashboard"])
def obter_kpis_dashboard(db: Session = Depends(get_db)):
    total_empresas = db.query(models.EmpresaCliente).count()
    total_ativos = db.query(models.Contrato).filter(models.Contrato.status_contrato == "Ativo").count()
    soma_receita = db.query(func.sum(models.Contrato.valor_acordado)).filter(models.Contrato.status_contrato == "Ativo").scalar() or 0
    
    return {
        "empresas_total": total_empresas,
        "contratos_ativos": total_ativos,
        "receita_acordada": float(soma_receita)
    }

# --- MÓDULO 2: EMPRESAS ---
@app.post("/empresas", response_model=schemas.EmpresaResponse, tags=["Empresas"])
def criar_empresa(empresa: schemas.EmpresaCreate, db: Session = Depends(get_db)):
    existente = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.cnpj == empresa.cnpj).first()
    if existente:
        raise HTTPException(status_code=400, detail="Este CNPJ já está cadastrado.")
        
    db_obj = models.EmpresaCliente(**empresa.model_dump(exclude_none=True))
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@app.get("/empresas", response_model=List[schemas.EmpresaResponseCompleta], tags=["Empresas"])
def listar_empresas(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, le=100),
    busca: Optional[str] = Query(None, description="Busca por nome ou CNPJ"),
    db: Session = Depends(get_db)
):
    query = db.query(models.EmpresaCliente).options(
        joinedload(models.EmpresaCliente.interacoes),
        joinedload(models.EmpresaCliente.contratos).joinedload(models.Contrato.pagamentos)
    )
    
    if busca:
        query = query.filter(
            models.EmpresaCliente.nome_empresa.ilike(f"%{busca}%") |
            models.EmpresaCliente.cnpj.ilike(f"%{busca}%")
        )
        
    return query.offset(skip).limit(limit).all()

@app.get("/empresas/{id_cliente}", response_model=schemas.EmpresaResponseCompleta, tags=["Empresas"])
def obter_empresa_por_id(id_cliente: UUID, db: Session = Depends(get_db)):
    empresa = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == id_cliente).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa cliente não encontrada.")
    return empresa

@app.put("/empresas/{id_cliente}", response_model=schemas.EmpresaResponse, tags=["Empresas"])
def atualizar_empresa(id_cliente: UUID, empresa_atualizada: schemas.EmpresaCreate, db: Session = Depends(get_db)):
    empresa_db = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == id_cliente).first()
    if not empresa_db:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    if empresa_atualizada.cnpj != empresa_db.cnpj:
        existente = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.cnpj == empresa_atualizada.cnpj).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este CNPJ já está sendo usado por outra empresa.")

    for var, value in vars(empresa_atualizada).items():
        if value is not None:
             setattr(empresa_db, var, value)
             
    db.add(empresa_db)
    db.commit()
    db.refresh(empresa_db)
    return empresa_db

@app.delete("/empresas/{id_cliente}", status_code=status.HTTP_204_NO_CONTENT, tags=["Empresas"])
def excluir_empresa(id_cliente: UUID, db: Session = Depends(get_db)):
    empresa_db = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == id_cliente).first()
    if not empresa_db:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        
    db.delete(empresa_db)
    db.commit()
    return None

# --- MÓDULO 3: RESPONSÁVEIS ---
@app.post("/responsaveis", response_model=schemas.ResponsavelResponse, tags=["Responsáveis"])
def criar_responsavel(obj_in: schemas.ResponsavelCreate, db: Session = Depends(get_db)):
    if obj_in.cpf:
        existente = db.query(models.Responsavel).filter(models.Responsavel.cpf == obj_in.cpf).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este CPF já cadastrado.")
            
    novo_obj = models.Responsavel(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/responsaveis", response_model=List[schemas.ResponsavelResponse], tags=["Responsáveis"])
def listar_responsaveis(
    id_cliente: UUID,
    busca: Optional[str] = Query(None, description="Busca por nome ou CPF"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Responsavel).filter(models.Responsavel.id_cliente == id_cliente)
    if busca:
        query = query.filter(
            models.Responsavel.nome.ilike(f"%{busca}%") |
            models.Responsavel.cpf.ilike(f"%{busca}%")
        )
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
    # REMOVIDO o filtro de ativo==True para que o front consiga ver os arquivados
    query = db.query(models.ModeloContrato)
    if busca:
        query = query.filter(models.ModeloContrato.nome_modelo.ilike(f"%{busca}%"))
    return query.all()

@app.patch("/modelos-contrato/{id_modelo}/arquivar", tags=["Modelos de Contrato"])
def arquivar_modelo(id_modelo: UUID, db: Session = Depends(get_db)):
    modelo_query = db.query(models.ModeloContrato).filter(models.ModeloContrato.id_modelo == id_modelo)
    if not modelo_query.first():
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    
    modelo_query.update({"ativo": False})
    db.commit()
    return {"mensagem": "Modelo arquivado com sucesso"}

@app.patch("/modelos-contrato/{modelo_id}/desarquivar", tags=["Modelos de Contrato"])
def desarquivar_modelo(modelo_id: str, db: Session = Depends(get_db)):
    modelo = db.query(models.ModeloContrato).filter(models.ModeloContrato.id_modelo == modelo_id).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    
    modelo.ativo = True
    db.commit()
    db.refresh(modelo)
    return {"mensagem": "Modelo desarquivado com sucesso!", "id_modelo": modelo_id}


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

# 👇 ESSA É A ROTA QUE ESTAVA FALTANDO E FEZ TUDO SUMIR! 👇
@app.get("/contratos", response_model=List[schemas.ContratoResponse], tags=["Contratos"])
def listar_todos_contratos(
    id_cliente: Optional[UUID] = Query(None, description="Filtrar por empresa"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Contrato)
    if id_cliente:
        query = query.filter(models.Contrato.id_cliente == id_cliente)
    if status:
        query = query.filter(models.Contrato.status_contrato == status)
    return query.all()

@app.get("/contratos/{id_cliente}", response_model=List[schemas.ContratoResponse], tags=["Contratos"])
def listar_contratos_por_empresa(id_cliente: UUID, db: Session = Depends(get_db)):
    return db.query(models.Contrato).filter(models.Contrato.id_cliente == id_cliente).all()

@app.patch("/contratos/{contrato_id}/arquivar", tags=["Contratos"])
def arquivar_contrato(contrato_id: str, db: Session = Depends(get_db)):
    contrato = db.query(models.Contrato).filter(models.Contrato.id_contrato == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado no banco")
    
    contrato.status_contrato = "Arquivado"
    db.commit()
    db.refresh(contrato)
    return {"mensagem": "Contrato arquivado com sucesso!", "id_contrato": contrato_id}

@app.patch("/contratos/{contrato_id}/desarquivar", tags=["Contratos"])
def desarquivar_contrato(contrato_id: str, db: Session = Depends(get_db)):
    contrato = db.query(models.Contrato).filter(models.Contrato.id_contrato == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado no banco")
    
    contrato.status_contrato = "Ativo"
    db.commit()
    db.refresh(contrato)
    return {"mensagem": "Contrato desarquivado com sucesso!", "id_contrato": contrato_id}

# --- MÓDULO 6: HISTÓRICO DE INTERAÇÕES (CRM) ---
@app.post("/interacoes", response_model=schemas.HistoricoInteracaoResponse, tags=["Interações"])
def criar_interacao(obj_in: schemas.HistoricoInteracaoCreate, db: Session = Depends(get_db)):
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == obj_in.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        
    novo_obj = models.HistoricoInteracoes(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/interacoes/{id_cliente}", response_model=List[schemas.HistoricoInteracaoResponse], tags=["Interações"])
def get_interacoes_por_cliente(id_cliente: UUID, db: Session = Depends(get_db)):
    try:
        interacoes = (
            db.query(models.HistoricoInteracoes)
            .filter(models.HistoricoInteracoes.id_cliente == id_cliente)
            .order_by(models.HistoricoInteracoes.data_hora.desc())
            .all()
        )
        return interacoes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar interações: {str(e)}")

@app.put("/interacoes/{id_interacao}", response_model=schemas.HistoricoInteracaoResponse, tags=["Interações"])
def atualizar_interacao(id_interacao: UUID, payload: dict, db: Session = Depends(get_db)):
    db_interacao = db.query(models.HistoricoInteracoes).filter(models.HistoricoInteracoes.id_interacao == id_interacao).first()
    
    if not db_interacao:
        raise HTTPException(status_code=404, detail="Interação não encontrada")
    
    if "tipo_interacao" in payload and payload["tipo_interacao"]:
        tipo_formatado = payload["tipo_interacao"].strip().title()
        if tipo_formatado not in ["Visita", "Reunião", "Mensagem", "Ligação", "E-mail"]:
            raise HTTPException(status_code=400, detail="Valor inválido. Use: Visita, Reunião, Mensagem, Ligação, E-mail")
        db_interacao.tipo_interacao = tipo_formatado
        
    if "data_hora" in payload:
        db_interacao.data_hora = payload["data_hora"]
    if "feedback_anotacoes" in payload:
        db_interacao.feedback_anotacoes = payload["feedback_anotacoes"]
        
    try:
        db.commit()
        db.refresh(db_interacao)
        return db_interacao
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar: {str(e)}")

@app.delete("/interacoes/{id_interacao}", tags=["Interações"])
def deletar_interacao(id_interacao: UUID, db: Session = Depends(get_db)):
    db_interacao = db.query(models.HistoricoInteracoes).filter(models.HistoricoInteracoes.id_interacao == id_interacao).first()
    if not db_interacao:
        raise HTTPException(status_code=404, detail="Interação não encontrada")
    try:
        db.delete(db_interacao)
        db.commit()
        return {"mensagem": "Interação removida com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao deletar: {str(e)}")

## --- MÓDULO 7: PAGAMENTOS ---

@app.post("/pagamentos", tags=["Pagamentos"])
def criar_pagamento(payload: dict, db: Session = Depends(get_db)):
    try:
        novo_pago = models.Pagamento(
            id_contrato=payload.get("id_contrato"),
            valor=payload.get("valor"),
            forma_pagamento=payload.get("forma_pagamento"),
            status_pagamento=payload.get("status_pagamento"),
            data_pagamento=payload.get("data_pagamento")
        )
        db.add(novo_pago)
        db.commit()
        db.refresh(novo_pago)
        return novo_pago
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar pagamento: {str(e)}")

@app.put("/pagamentos/{id_pagamento}", tags=["Pagamentos"])
def atualizar_pagamento(id_pagamento: str, payload: dict, db: Session = Depends(get_db)):
    try:
        pagamento = db.query(models.Pagamento).filter(models.Pagamento.id_pagamento == id_pagamento).first()
        if not pagamento:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        
        # Trata caso o hook envie envelopado em 'data' ou diretamente no body
        dados = payload.get("data", payload) if "data" in payload and len(payload) == 1 else payload
        
        if "valor" in dados: pagamento.valor = dados["valor"]
        if "forma_pagamento" in dados: pagamento.forma_pagamento = dados["forma_pagamento"]
        if "status_pagamento" in dados: pagamento.status_pagamento = dados["status_pagamento"]
        if "data_pagamento" in dados: pagamento.data_pagamento = dados["data_pagamento"]
        
        db.commit()
        db.refresh(pagamento)
        return pagamento
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar: {str(e)}")

@app.delete("/pagamentos/{id_pagamento}", tags=["Pagamentos"])
def deletar_pagamento(id_pagamento: str, db: Session = Depends(get_db)):
    try:
        pagamento = db.query(models.Pagamento).filter(models.Pagamento.id_pagamento == id_pagamento).first()
        if not pagamento:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        
        db.delete(pagamento)
        db.commit()
        return {"mensagem": "Pagamento removido com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/pagamentos/contrato/{id_contrato}", tags=["Pagamentos"])
def get_pagamentos_por_contrato(id_contrato: str, db: Session = Depends(get_db)):
    try:
        pagamentos = (
            db.query(models.Pagamento)
            .filter(models.Pagamento.id_contrato == id_contrato)
            .order_by(models.Pagamento.data_pagamento.desc()) 
            .all()
        )
        return pagamentos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar pagamentos: {str(e)}")

# --- MÓDULO 8: METABASE INTEGRATION ---
@app.get("/metabase/token/contratos", tags=["Metabase"])
def obter_token_metabase():
    try:
        payload = {
            "resource": {"dashboard": 1}, 
            "params": {},
            "exp": round(time.time()) + (60 * 10) 
        }
        token = jwt.encode(payload, METABASE_SECRET_KEY, algorithm="HS256")
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar token: {str(e)}")