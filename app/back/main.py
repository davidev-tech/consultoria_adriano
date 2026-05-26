from datetime import date
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
from dateutil.relativedelta import relativedelta
import calendar

# 1. INICIALIZAÇÃO DO BANCO
models.Base.metadata.create_all(bind=engine)

def ensure_empresa_cliente_columns() -> None:
    dialect = engine.dialect.name
    statements = []
    
    if dialect == "postgresql":
        statements = [
            "ALTER TABLE empresa_cliente ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
            "ALTER TABLE empresa_cliente ADD COLUMN IF NOT EXISTS cep VARCHAR(8)",
            "ALTER TABLE empresa_cliente ADD COLUMN IF NOT EXISTS estado VARCHAR(2)",
            "ALTER TABLE empresa_cliente ADD COLUMN IF NOT EXISTS cidade VARCHAR(100)",
            "ALTER TABLE empresa_cliente ADD COLUMN IF NOT EXISTS bairro VARCHAR(100)",
            "ALTER TABLE empresa_cliente ADD COLUMN IF NOT EXISTS logradouro VARCHAR(255)",
        ]
    elif dialect == "sqlite":
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info('empresa_cliente')")).mappings()
            existing = [row["name"] for row in result]
            for col, tipo in [("email", "VARCHAR(255)"), ("cep", "VARCHAR(8)"), ("estado", "VARCHAR(2)"), ("cidade", "VARCHAR(100)"), ("bairro", "VARCHAR(100)"), ("logradouro", "VARCHAR(255)")]:
                if col not in existing:
                    statements.append(f"ALTER TABLE empresa_cliente ADD COLUMN {col} {tipo}")
                
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

# --- MÓDULO: CATÁLOGO DE SERVIÇOS (NOVO) ---
@app.get("/catalogo-servicos", response_model=List[schemas.ServicoDetalhe], tags=["Catálogo de Serviços"])
def listar_catalogo_servicos(db: Session = Depends(get_db)):
    """ Retorna todos os serviços disponíveis para popular os selects/dropdowns do front-end. """
    return db.query(models.CatalogoServico).all()

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
    if empresa.cnpj:
        existente = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.cnpj == empresa.cnpj).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este CNPJ já está cadastrado.")
        
    # Separa os dados atômicos da empresa das listas de relacionamento
    empresa_data = empresa.model_dump(exclude={"ids_servicos_contratados"}, exclude_none=True)
    db_obj = models.EmpresaCliente(**empresa_data)
    
    db.add(db_obj)
    db.flush() # Gera o ID do cliente necessário para a tabela associativa
    
    # Orquestra a inserção na tabela associativa O(N)
    if empresa.ids_servicos_contratados:
        for id_serv in empresa.ids_servicos_contratados:
            novo_vinculo = models.ServicoPrestado(
                id_cliente=db_obj.id_cliente,
                id_servico=id_serv
            )
            db.add(novo_vinculo)
            
    db.commit()
    db.refresh(db_obj)
    return db_obj

@app.get("/empresas", response_model=List[schemas.EmpresaResponse], tags=["Empresas"])
def listar_empresas(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, le=100),
    busca: Optional[str] = Query(None, description="Busca por nome ou CNPJ"),
    db: Session = Depends(get_db)
):
    # O joinedload desce pelas hierarquias para evitar queries em loop (N+1)
    query = db.query(models.EmpresaCliente).options(
        joinedload(models.EmpresaCliente.servicos_contratados).joinedload(models.ServicoPrestado.servico_catalogo),
        joinedload(models.EmpresaCliente.interacoes),
        # AQUI: Carregando os contratos com seus pagamentos E com suas faturas
        joinedload(models.EmpresaCliente.contratos).joinedload(models.Contrato.pagamentos),
        joinedload(models.EmpresaCliente.contratos).joinedload(models.Contrato.faturas)
    )
    
    if busca:
        query = query.filter(
            models.EmpresaCliente.nome_empresa.ilike(f"%{busca}%") |
            models.EmpresaCliente.cnpj.ilike(f"%{busca}%")
        )
        
    return query.offset(skip).limit(limit).all()

@app.get("/empresas/{id_cliente}", response_model=schemas.EmpresaResponse, tags=["Empresas"])
def obter_empresa_por_id(id_cliente: UUID, db: Session = Depends(get_db)):
    empresa = db.query(models.EmpresaCliente).options(
        joinedload(models.EmpresaCliente.servicos_contratados).joinedload(models.ServicoPrestado.servico_catalogo),
        joinedload(models.EmpresaCliente.interacoes),
        # AQUI: Carregando os contratos com seus pagamentos E com suas faturas
        joinedload(models.EmpresaCliente.contratos).joinedload(models.Contrato.pagamentos),
        joinedload(models.EmpresaCliente.contratos).joinedload(models.Contrato.faturas)
    ).filter(models.EmpresaCliente.id_cliente == id_cliente).first()
    
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa cliente não encontrada.")
    return empresa

@app.put("/empresas/{id_cliente}", response_model=schemas.EmpresaResponse, tags=["Empresas"])
def atualizar_empresa(id_cliente: UUID, empresa_atualizada: schemas.EmpresaCreate, db: Session = Depends(get_db)):
    empresa_db = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == id_cliente).first()
    if not empresa_db:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    if empresa_atualizada.cnpj and empresa_atualizada.cnpj != empresa_db.cnpj:
        existente = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.cnpj == empresa_atualizada.cnpj).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este CNPJ já está sendo usado por outra empresa.")

    empresa_data = empresa_atualizada.model_dump(exclude={"ids_servicos_contratados"}, exclude_unset=True)
    for var, value in empresa_data.items():
        if value is not None:
             setattr(empresa_db, var, value)
             
    # Atualiza vínculos de serviço se enviados na payload
    if empresa_atualizada.ids_servicos_contratados is not None:
        db.query(models.ServicoPrestado).filter(models.ServicoPrestado.id_cliente == id_cliente).delete()
        for id_serv in empresa_atualizada.ids_servicos_contratados:
            novo_vinculo = models.ServicoPrestado(id_cliente=id_cliente, id_servico=id_serv)
            db.add(novo_vinculo)
             
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
    responsavel_data = obj_in.model_dump(exclude_none=True)
    cpf = responsavel_data.get("cpf")
    if cpf:
        existente = db.query(models.Responsavel).filter(models.Responsavel.cpf == cpf).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este CPF já cadastrado.")
            
    novo_obj = models.Responsavel(**responsavel_data)
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
    query = db.query(models.ModeloContrato)
    if busca:
        query = query.filter(models.ModeloContrato.nome_modelo.ilike(f"%{busca}%"))
    return query.all()

@app.patch("/modelos-contrato/{id_modelo}/arquivar", tags=["Modelos de Contrato"])
def arquivar_modelo(id_modelo: UUID, db: Session = Depends(get_db)):
    modelo_query = db.query(models.ModeloContrato).filter(models.ModeloContrato.id_modelo == id_modelo)
    if not modelo_query.first():
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    
    modelo_query.update({"Ativo": False})
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
def criar_novo_contrato(contrato_data: schemas.ContratoCreate, db: Session = Depends(get_db)):
    # Rota unificada: Salva o contrato e gera as faturas
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == contrato_data.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    if not db.query(models.ModeloContrato).filter(models.ModeloContrato.id_modelo == contrato_data.id_modelo).first():
        raise HTTPException(status_code=404, detail="Modelo de contrato não encontrado.")

    novo_contrato = models.Contrato(**contrato_data.model_dump())
    db.add(novo_contrato)
    db.flush() 

    # Lógica de geração de faturas mês a mês
    # Lógica de geração de faturas mês a mês vinculada à tabela de Faturas
    data_corrente = novo_contrato.data_inicio
    data_fim = novo_contrato.data_fim
    
    # CORREÇÃO DA LINHA 305: Usa o dia do início do contrato como base de vencimento
    dia_vencimento_escolhido = novo_contrato.data_inicio.day

    if data_fim:
        # Calcula o total de meses de duração do contrato
        total_meses = (data_fim.year - data_corrente.year) * 12 + (data_fim.month - data_corrente.month)
        
        for i in range(total_meses + 1):
            data_alvo = novo_contrato.data_inicio + relativedelta(months=i)
            ultimo_dia_mes = calendar.monthrange(data_alvo.year, data_alvo.month)[1]
            dia_vencimento_real = min(dia_vencimento_escolhido, ultimo_dia_mes)
            
            vencimento_fatura = date(data_alvo.year, data_alvo.month, dia_vencimento_real)

            if vencimento_fatura >= novo_contrato.data_inicio:
                # Aqui a lógica alimenta estritamente a tabela de Fatura/Pagamento
                nova_fatura = models.Fatura(
                    id_contrato=novo_contrato.id_contrato,
                    valor_original=novo_contrato.valor_acordado, 
                    data_vencimento=vencimento_fatura,  # Data calculada vai para cá!
                    status="Pendente"
                )
                db.add(nova_fatura)

        db.commit()
        db.refresh(novo_contrato)
    return novo_contrato

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
@app.post("/interacoes", response_model=schemas.InteracaoResponse, tags=["Interações"])
def criar_interacao(obj_in: schemas.InteracaoCreate, db: Session = Depends(get_db)):
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == obj_in.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        
    novo_obj = models.HistoricoInteracoes(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.get("/interacoes/{id_cliente}", response_model=List[schemas.InteracaoResponse], tags=["Interações"])
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

@app.put("/interacoes/{id_interacao}", response_model=schemas.InteracaoResponse, tags=["Interações"])
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
    
    if "grau_urgencia" in payload:
        db_interacao.grau_urgencia = payload["grau_urgencia"]
        
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
## --- MÓDULO 7: PAGAMENTOS ---
## --- MÓDULO 7: PAGAMENTOS ---
@app.post("/pagamentos", response_model=schemas.PagamentoResponse, tags=["Pagamentos"])
def criar_pagamento(pagamento_in: schemas.PagamentoCreate, db: Session = Depends(get_db)):
    try:
        novo_pago = models.Pagamento(**pagamento_in.model_dump())
        db.add(novo_pago)
        db.commit()
        db.refresh(novo_pago)
        return novo_pago
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar pagamento: {str(e)}")

@app.put("/pagamentos/{id_pagamento}", response_model=schemas.PagamentoResponse, tags=["Pagamentos"])
def atualizar_pagamento(id_pagamento: UUID, pagamento_in: schemas.PagamentoCreate, db: Session = Depends(get_db)):
    try:
        # 1. Correção do filtro adicionando .id_pagamento
        pagamento = db.query(models.Pagamento).filter(models.Pagamento.id_pagamento == id_pagamento).first()
        if not pagamento:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        
        # 2. Loop automático correto (substitui todos os 'if' manuais de forma segura)
        for var, value in pagamento_in.model_dump(exclude_unset=True).items():
            setattr(pagamento, var, value)
            
        db.commit()
        db.refresh(pagamento)
        return pagamento
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar pagamento: {str(e)}")
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

# --- MÓDULO 9: FATURAS ---
@app.get("/faturas", response_model=list[schemas.FaturaResponse], tags=["Faturas"])
def listar_faturas(id_contrato: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Fatura)
    if id_contrato:
        query = query.filter(models.Fatura.id_contrato == id_contrato)
    return query.all()

@app.post("/faturas", response_model=schemas.FaturaResponse, tags=["Faturas"])
def criar_fatura(fatura_in: schemas.FaturaCreate, db: Session = Depends(get_db)):
    nova_fatura = models.Fatura(**fatura_in.model_dump())
    db.add(nova_fatura)
    db.commit()
    db.refresh(nova_fatura)
    return nova_fatura

@app.put("/faturas/{id_fatura}", response_model=schemas.FaturaResponse, tags=["Faturas"])
def atualizar_fatura(id_fatura: int, fatura_in: schemas.FaturaCreate, db: Session = Depends(get_db)):
    fatura = db.query(models.Fatura).filter(models.Fatura.id_fatura == id_fatura).first()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada.")
    
    for var, value in fatura_in.model_dump(exclude_unset=True).items():
        setattr(fatura, var, value)
        
    db.commit()
    db.refresh(fatura)
    return fatura

@app.delete("/faturas/{id_fatura}", status_code=204, tags=["Faturas"])
def deletar_fatura(id_fatura: int, db: Session = Depends(get_db)):
    fatura = db.query(models.Fatura).filter(models.Fatura.id_fatura == id_fatura).first()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada.")
    
    db.delete(fatura)
    db.commit()
    return {"mensagem": "Fatura removida com sucesso"}