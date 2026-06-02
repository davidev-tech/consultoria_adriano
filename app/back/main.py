from datetime import date, datetime
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
import requests

# 1. INICIALIZAÇÃO DO BANCO
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gestão do Cuidado (PSA)",
    version="2.0.0",
    description="Backend PSA focado em consultoria B2B, com tracking de visitas e auditoria financeira.",
    redirect_slashes=False
)

# 2. CONFIGURAÇÃO DE SEGURANÇA (CORS)
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

# --- MÓDULO: CATÁLOGO DE SERVIÇOS ---
@app.get("/catalogo-servicos", response_model=List[schemas.ServicoDetalhe], tags=["Catálogo de Serviços"])
def listar_catalogo_servicos(db: Session = Depends(get_db)):
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
    if empresa.cep:
        endereco_existente = db.query(models.Endereco).filter(models.Endereco.cep == empresa.cep).first()
        if not endereco_existente:
            try:
                response = requests.get(f"https://viacep.com.br/ws/{empresa.cep}/json/")
                data = response.json()
                if data.get("erro"):
                    raise HTTPException(status_code=400, detail="CEP não encontrado.")
                novo_endereco = models.Endereco(
                    cep=empresa.cep,
                    bairro=data.get("bairro", ""),
                    cidade=data.get("localidade", ""),
                    estado=data.get("uf", "")
                )
                db.add(novo_endereco)
                db.flush()
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=400, detail="Erro ao buscar dados do CEP. Verifique o formato (apenas números).")
    empresa_data = empresa.model_dump(exclude={"ids_servicos_contratados"}, exclude_none=True)
    db_obj = models.EmpresaCliente(**empresa_data)
    db.add(db_obj)
    db.flush()
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
    limit: int = Query(1000, le=10000),
    busca: Optional[str] = Query(None, description="Busca por nome ou CNPJ"),
    db: Session = Depends(get_db)
):
    query = db.query(models.EmpresaCliente).options(
        joinedload(models.EmpresaCliente.servicos_contratados)
            .joinedload(models.ServicoPrestado.servico_catalogo),
        joinedload(models.EmpresaCliente.interacoes),
        joinedload(models.EmpresaCliente.contratos)
            .joinedload(models.Contrato.pagamentos),
        joinedload(models.EmpresaCliente.contratos)
            .joinedload(models.Contrato.faturas),
        joinedload(models.EmpresaCliente.contratos)
            .joinedload(models.Contrato.entregas),
    )
    if busca:
        query = query.filter(
            models.EmpresaCliente.nome_empresa.ilike(f"%{busca}%") |
            models.EmpresaCliente.cnpj.ilike(f"%{busca}%")
        )
    query = query.order_by(models.EmpresaCliente.nome_empresa)
    return query.offset(skip).limit(limit).all()

@app.get("/empresas/{id_cliente}", response_model=schemas.EmpresaResponse, tags=["Empresas"])
def obter_empresa_por_id(id_cliente: UUID, db: Session = Depends(get_db)):
    empresa = db.query(models.EmpresaCliente).options(
        joinedload(models.EmpresaCliente.servicos_contratados).joinedload(models.ServicoPrestado.servico_catalogo),
        joinedload(models.EmpresaCliente.interacoes),
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
    if empresa_atualizada.cep:
        endereco_existente = db.query(models.Endereco).filter(models.Endereco.cep == empresa_atualizada.cep).first()
        if not endereco_existente:
            try:
                response = requests.get(f"https://viacep.com.br/ws/{empresa_atualizada.cep}/json/")
                data = response.json()
                if data.get("erro"):
                    raise HTTPException(status_code=400, detail="CEP não encontrado.")
                novo_endereco = models.Endereco(
                    cep=empresa_atualizada.cep,
                    bairro=data.get("bairro", ""),
                    cidade=data.get("localidade", ""),
                    estado=data.get("uf", "")
                )
                db.add(novo_endereco)
                db.flush()
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=400, detail="Erro ao buscar dados do CEP. Verifique o formato (apenas números).")
    empresa_data = empresa_atualizada.model_dump(exclude={"ids_servicos_contratados"}, exclude_unset=True)
    for var, value in empresa_data.items():
        if value is not None:
             setattr(empresa_db, var, value)
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

@app.get("/responsaveis/lista", response_model=List[schemas.ResponsavelListResponse], tags=["Responsáveis"])
def listar_todos_responsaveis(
    id_cliente: Optional[UUID] = Query(None, description="Filtrar por empresa"),
    busca: Optional[str] = Query(None, description="Buscar por nome ou CPF"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Responsavel).join(models.EmpresaCliente)
    if id_cliente:
        query = query.filter(models.Responsavel.id_cliente == id_cliente)
    if busca:
        query = query.filter(
            models.Responsavel.nome.ilike(f"%{busca}%") |
            models.Responsavel.cpf.ilike(f"%{busca}%")
        )
    resultados = query.all()
    return [
        {
            "id_responsavel": r.id_responsavel,
            "id_cliente": r.id_cliente,
            "nome": r.nome,
            "cpf": r.cpf,
            "cargo": r.cargo,
            "empresa_nome": r.empresa.nome_empresa
        }
        for r in resultados
    ]

@app.delete("/responsaveis/{id_responsavel}", status_code=status.HTTP_204_NO_CONTENT, tags=["Responsáveis"])
def deletar_responsavel(id_responsavel: UUID, db: Session = Depends(get_db)):
    responsavel = db.query(models.Responsavel).filter(
        models.Responsavel.id_responsavel == id_responsavel
    ).first()
    if not responsavel:
        raise HTTPException(status_code=404, detail="Responsável não encontrado.")
    db.delete(responsavel)
    db.commit()
    return None

@app.put("/responsaveis/{id_responsavel}", response_model=schemas.ResponsavelResponse, tags=["Responsáveis"])
def atualizar_responsavel(id_responsavel: UUID, payload: dict, db: Session = Depends(get_db)):
    responsavel = db.query(models.Responsavel).filter(
        models.Responsavel.id_responsavel == id_responsavel
    ).first()
    if not responsavel:
        raise HTTPException(status_code=404, detail="Responsável não encontrado.")
    if "nome" in payload:
        responsavel.nome = payload["nome"]
    if "cpf" in payload:
        novo_cpf = payload["cpf"]
        if novo_cpf and novo_cpf != responsavel.cpf:
            existente = db.query(models.Responsavel).filter(
                models.Responsavel.cpf == novo_cpf,
                models.Responsavel.id_responsavel != id_responsavel
            ).first()
            if existente:
                raise HTTPException(status_code=400, detail="CPF já cadastrado para outro responsável.")
        responsavel.cpf = novo_cpf or None
    if "cargo" in payload:
        responsavel.cargo = payload["cargo"]
    if "id_cliente" in payload:
        if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == payload["id_cliente"]).first():
            raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        responsavel.id_cliente = payload["id_cliente"]
    try:
        db.commit()
        db.refresh(responsavel)
        return responsavel
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar: {str(e)}")

# --- MÓDULO 4: MODELOS DE CONTRATO ---
@app.post("/modelos-contrato", response_model=schemas.ModeloContratoResponse, tags=["Modelos de Contrato"])
def criar_modelo(obj_in: schemas.ModeloContratoCreate, db: Session = Depends(get_db)):
    novo_obj = models.ModeloContrato(**obj_in.model_dump())
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@app.put("/modelos-contrato/{id_modelo}", response_model=schemas.ModeloContratoResponse, tags=["Modelos de Contrato"])
def atualizar_modelo_completo(id_modelo: UUID, modelo_atualizado: schemas.ModeloContratoCreate, db: Session = Depends(get_db)):
    modelo_db = db.query(models.ModeloContrato).filter(models.ModeloContrato.id_modelo == id_modelo).first()
    if not modelo_db:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    update_data = modelo_atualizado.model_dump(exclude_unset=True)
    for var, value in update_data.items():
        setattr(modelo_db, var, value)
    db.add(modelo_db)
    db.commit()
    db.refresh(modelo_db)
    return modelo_db

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
def arquivar_modelo(id_modelo: UUID, payload: dict = {}, db: Session = Depends(get_db)):
    modelo = db.query(models.ModeloContrato).filter(models.ModeloContrato.id_modelo == id_modelo).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    modelo.ativo = False
    if "motivo_arquivamento" in payload:
        modelo.motivo_arquivamento = payload["motivo_arquivamento"]
    db.commit()
    db.refresh(modelo)
    return {"mensagem": "Modelo arquivado com sucesso", "id_modelo": str(id_modelo)}

@app.patch("/modelos-contrato/{id_modelo}/desarquivar", tags=["Modelos de Contrato"])
def desarquivar_modelo(id_modelo: UUID, db: Session = Depends(get_db)):
    modelo = db.query(models.ModeloContrato).filter(models.ModeloContrato.id_modelo == id_modelo).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    modelo.ativo = True
    db.commit()
    db.refresh(modelo)
    return {"mensagem": "Modelo desarquivado com sucesso!", "id_modelo": str(id_modelo)}

@app.patch("/contratos/{contrato_id}/desarquivar", tags=["Contratos"])
def desarquivar_contrato(contrato_id: UUID, db: Session = Depends(get_db)):
    contrato = db.query(models.Contrato).filter(models.Contrato.id_contrato == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado no banco")
    hoje = date.today()
    if contrato.data_fim and contrato.data_fim < hoje:
        contrato.status_contrato = "Encerrado"
    else:
        contrato.status_contrato = "Ativo"
    db.commit()
    db.refresh(contrato)
    return {"mensagem": "Contrato desarquivado com sucesso!", "id_contrato": str(contrato_id)}

@app.patch("/modelos-contrato/{id_modelo}", tags=["Modelos de Contrato"])
def atualizar_modelo(id_modelo: UUID, payload: dict, db: Session = Depends(get_db)):
    modelo = db.query(models.ModeloContrato).filter(models.ModeloContrato.id_modelo == id_modelo).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    if "motivo_arquivamento" in payload:
        modelo.motivo_arquivamento = payload["motivo_arquivamento"]
        db.commit()
        db.refresh(modelo)
    return {"mensagem": "Modelo atualizado", "id_modelo": str(id_modelo)}

# --- MÓDULO 5: CONTRATOS MESTRE ---
@app.post("/contratos", response_model=schemas.ContratoResponse, tags=["Contratos"])
def criar_novo_contrato(contrato_data: schemas.ContratoCreate, db: Session = Depends(get_db)):
    if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == contrato_data.id_cliente).first():
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    if not db.query(models.ModeloContrato).filter(models.ModeloContrato.id_modelo == contrato_data.id_modelo).first():
        raise HTTPException(status_code=404, detail="Modelo de contrato não encontrado.")
    novo_contrato = models.Contrato(**contrato_data.model_dump())
    db.add(novo_contrato)
    db.flush()
    data_corrente = novo_contrato.data_inicio
    data_fim = novo_contrato.data_fim
    dia_vencimento_escolhido = novo_contrato.dia_vencimento
    if data_fim:
        total_meses = (data_fim.year - data_corrente.year) * 12 + (data_fim.month - data_corrente.month)
        for i in range(total_meses + 1):
            data_alvo = novo_contrato.data_inicio + relativedelta(months=i)
            ultimo_dia_mes = calendar.monthrange(data_alvo.year, data_alvo.month)[1]
            dia_vencimento_real = min(dia_vencimento_escolhido, ultimo_dia_mes)
            vencimento_fatura = date(data_alvo.year, data_alvo.month, dia_vencimento_real)
            if vencimento_fatura >= novo_contrato.data_inicio:
                nova_fatura = models.Fatura(
                    id_contrato=novo_contrato.id_contrato,
                    valor_original=novo_contrato.valor_acordado,
                    data_vencimento=vencimento_fatura,
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
    return db.query(models.Contrato).options(
        joinedload(models.Contrato.pagamentos),
        joinedload(models.Contrato.faturas),
        joinedload(models.Contrato.entregas)
    ).filter(models.Contrato.id_cliente == id_cliente).all()

@app.patch("/contratos/{contrato_id}/arquivar", tags=["Contratos"])
def arquivar_contrato(contrato_id: UUID, payload: dict = {}, db: Session = Depends(get_db)):
    contrato = db.query(models.Contrato).filter(models.Contrato.id_contrato == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado no banco")
    contrato.status_contrato = "Arquivado"
    if "motivo_arquivamento" in payload:
        contrato.motivo_arquivamento = payload["motivo_arquivamento"]
    db.commit()
    db.refresh(contrato)
    return {"mensagem": "Contrato arquivado com sucesso!", "id_contrato": str(contrato_id)}

@app.patch("/contratos/{contrato_id}", tags=["Contratos"])
def atualizar_contrato(contrato_id: UUID, payload: dict, db: Session = Depends(get_db)):
    contrato = db.query(models.Contrato).filter(models.Contrato.id_contrato == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    if "motivo_arquivamento" in payload:
        contrato.motivo_arquivamento = payload["motivo_arquivamento"]
        db.commit()
        db.refresh(contrato)
    return {"mensagem": "Contrato atualizado", "id_contrato": str(contrato_id)}

# --- MÓDULO: ENTREGAS E PRAZOS ---
@app.post("/entregas", response_model=schemas.EntregaResponse, tags=["Entregas"])
def criar_entrega(obj_in: schemas.EntregaCreate, db: Session = Depends(get_db)):
    contrato = db.query(models.Contrato).filter(models.Contrato.id_contrato == obj_in.id_contrato).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado.")
    if obj_in.data_prazo_limite:
        if contrato.data_inicio and obj_in.data_prazo_limite < contrato.data_inicio:
            raise HTTPException(status_code=400, detail="A data da entrega não pode ser anterior ao início do contrato.")
        if contrato.data_fim and obj_in.data_prazo_limite > contrato.data_fim:
            raise HTTPException(status_code=400, detail="A data da entrega não pode ser posterior ao fim do contrato.")
    nova = models.Entrega(**obj_in.model_dump())
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova

@app.get("/entregas", response_model=List[schemas.EntregaResponse], tags=["Entregas"])
def listar_entregas(
    id_contrato: Optional[UUID] = Query(None),
    status_entrega: Optional[str] = Query(None),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Entrega)
    if id_contrato:
        query = query.filter(models.Entrega.id_contrato == id_contrato)
    if status_entrega:
        query = query.filter(models.Entrega.status_entrega == status_entrega)
    if data_inicio:
        query = query.filter(models.Entrega.data_prazo_limite >= data_inicio)
    if data_fim:
        query = query.filter(models.Entrega.data_prazo_limite <= data_fim)
    return query.order_by(models.Entrega.data_prazo_limite.asc()).all()

@app.put("/entregas/{id_entrega}", response_model=schemas.EntregaResponse, tags=["Entregas"])
def atualizar_entrega(id_entrega: UUID, payload: dict, db: Session = Depends(get_db)):
    entrega = db.query(models.Entrega).filter(models.Entrega.id_entrega == id_entrega).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
    if "descricao_entrega" in payload:
        entrega.descricao_entrega = payload["descricao_entrega"]
    if "data_prazo_limite" in payload:
        entrega.data_prazo_limite = payload["data_prazo_limite"]
    if "status_entrega" in payload:
        entrega.status_entrega = payload["status_entrega"]
        if payload["status_entrega"] == "Concluído" and "data_conclusao" not in payload:
            entrega.data_conclusao = date.today()
    if "data_conclusao" in payload and payload["data_conclusao"]:
        try:
            data_str = payload["data_conclusao"]
            if isinstance(data_str, str) and "T" in data_str:
                data_str = data_str.split("T")[0]
            entrega.data_conclusao = date.fromisoformat(data_str)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Formato de data inválido. Use YYYY-MM-DD. Erro: {str(e)}")
    try:
        db.commit()
        db.refresh(entrega)
        return entrega
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/entregas/{id_entrega}", tags=["Entregas"])
def deletar_entrega(id_entrega: UUID, db: Session = Depends(get_db)):
    entrega = db.query(models.Entrega).filter(models.Entrega.id_entrega == id_entrega).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
    db.delete(entrega)
    db.commit()
    return {"mensagem": "Entrega removida com sucesso"}

# --- MÓDULO: PENDÊNCIAS ---
@app.get("/pendencias", response_model=List[schemas.PendenciaResponse], tags=["Pendências"])
def listar_pendencias(
    id_cliente: Optional[UUID] = Query(None, description="Filtrar por empresa"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo: financeira ou entrega"),
    db: Session = Depends(get_db)
):
    resultados = []
    if not tipo or tipo == "financeira":
        faturas_query = db.query(models.Fatura).join(models.Contrato).filter(
            models.Fatura.status.in_(["Pendente", "Atrasado"])
        )
        if id_cliente:
            faturas_query = faturas_query.filter(models.Contrato.id_cliente == id_cliente)
        faturas = faturas_query.all()
        for fatura in faturas:
            contrato = db.query(models.Contrato).filter(models.Contrato.id_contrato == fatura.id_contrato).first()
            empresa = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == contrato.id_cliente).first() if contrato else None
            resultados.append({
                "id": str(fatura.id_fatura),
                "tipo": "financeira",
                "empresa_nome": empresa.nome_empresa if empresa else "—",
                "descricao": f"Fatura #{str(fatura.id_fatura)[:8]} – Vencimento: {fatura.data_vencimento.strftime('%d/%m/%Y')}",
                "status": fatura.status,
                "data_limite": fatura.data_vencimento,
                "valor": float(fatura.valor_original) if fatura.valor_original is not None else 0.0,
                "id_referencia": str(fatura.id_contrato)
            })
    if not tipo or tipo == "entrega":
        entregas_query = db.query(models.Entrega).join(models.Contrato).filter(
            models.Entrega.status_entrega != "Concluído"
        )
        if id_cliente:
            entregas_query = entregas_query.filter(models.Contrato.id_cliente == id_cliente)
        entregas = entregas_query.all()
        for entrega in entregas:
            contrato = db.query(models.Contrato).filter(models.Contrato.id_contrato == entrega.id_contrato).first()
            empresa = db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == contrato.id_cliente).first() if contrato else None
            resultados.append({
                "id": str(entrega.id_entrega),
                "tipo": "entrega",
                "empresa_nome": empresa.nome_empresa if empresa else "—",
                "descricao": f"Entrega: {entrega.descricao_entrega}",
                "status": entrega.status_entrega,
                "data_limite": entrega.data_prazo_limite,
                "valor": None,
                "id_referencia": str(entrega.id_contrato)
            })
    resultados.sort(key=lambda x: x["data_limite"] if x["data_limite"] else date.today())
    return resultados

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

@app.delete("/interacoes/{id_interacao}", tags=["Interações"])
def deletar_interacao(id_interacao: UUID, db: Session = Depends(get_db)):
    db_interacao = db.query(models.HistoricoInteracoes)\
        .filter(models.HistoricoInteracoes.id_interacao == id_interacao)\
        .first()
    if not db_interacao:
        raise HTTPException(status_code=404, detail="Interação não encontrada")
    try:
        db.delete(db_interacao)
        db.commit()
        return {"mensagem": "Interação removida com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao deletar: {str(e)}")

@app.get("/interacoes-pagas", response_model=List[schemas.InteracaoResponse], tags=["Interações"])
def listar_interacoes_pagas(
    id_cliente: Optional[UUID] = Query(None, description="Filtrar por empresa específica"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(models.HistoricoInteracoes)\
            .filter(models.HistoricoInteracoes.status_financeiro == "Paga")
        if id_cliente:
            if not db.query(models.EmpresaCliente).filter(models.EmpresaCliente.id_cliente == id_cliente).first():
                raise HTTPException(status_code=404, detail="Empresa não encontrada.")
            query = query.filter(models.HistoricoInteracoes.id_cliente == id_cliente)
        interacoes = query\
            .order_by(models.HistoricoInteracoes.data_hora.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        return interacoes
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar interações pagas: {str(e)}")

@app.get("/interacoes-pagas/total", tags=["Interações"])
def total_interacoes_pagas(
    id_cliente: Optional[UUID] = Query(None, description="Filtrar por empresa"),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(
            func.count(models.HistoricoInteracoes.id_interacao).label('total_interacoes'),
            func.coalesce(func.sum(models.HistoricoInteracoes.valor_cobrado), 0).label('total_valor')
        ).filter(models.HistoricoInteracoes.status_financeiro == "Paga")
        if id_cliente:
            query = query.filter(models.HistoricoInteracoes.id_cliente == id_cliente)
        resultado = query.first()
        if resultado is None:
            return {"total_interacoes": 0, "total_valor": 0.0}
        return {
            "total_interacoes": resultado.total_interacoes,
            "total_valor": float(resultado.total_valor)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao calcular totais: {str(e)}")

@app.put("/interacoes/{id_interacao}", response_model=schemas.InteracaoResponse, tags=["Interações"])
def atualizar_interacao(id_interacao: UUID, payload: dict, db: Session = Depends(get_db)):
    db_interacao = db.query(models.HistoricoInteracoes).filter(models.HistoricoInteracoes.id_interacao == id_interacao).first()
    if not db_interacao:
        raise HTTPException(status_code=404, detail="Interação não encontrada")
    if "tipo_interacao" in payload and payload["tipo_interacao"]:
        tipo_formatado = payload["tipo_interacao"].strip().lower()
        if tipo_formatado not in ["visita", "reunião", "mensagem", "ligação", "e-mail"]:
            raise HTTPException(status_code=400, detail="Valor inválido. Use: visita, reunião, mensagem, ligação, e-mail")
        db_interacao.tipo_interacao = tipo_formatado
    if "data_hora" in payload:
        db_interacao.data_hora = payload["data_hora"]
    if "feedback_anotacoes" in payload:
        db_interacao.feedback_anotacoes = payload["feedback_anotacoes"]
    if "grau_urgencia" in payload:
        db_interacao.grau_urgencia = payload["grau_urgencia"]
    if "status_financeiro" in payload:
        db_interacao.status_financeiro = payload["status_financeiro"]
    if "valor_cobrado" in payload:
        db_interacao.valor_cobrado = payload["valor_cobrado"]
    if "status_pagamento" in payload:
        db_interacao.status_pagamento = payload["status_pagamento"]
    if "nota" in payload:
        db_interacao.nota = payload["nota"]
    try:
        db.commit()
        db.refresh(db_interacao)
        return db_interacao
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar: {str(e)}")

# --- MÓDULO 7: PAGAMENTOS ---
@app.post("/pagamentos", response_model=schemas.PagamentoResponse, tags=["Pagamentos"])
def criar_pagamento(pagamento_in: schemas.PagamentoCreate, db: Session = Depends(get_db)):
    try:
        if pagamento_in.id_fatura:
            fatura = db.query(models.Fatura).filter(models.Fatura.id_fatura == pagamento_in.id_fatura).first()
            if not fatura:
                raise HTTPException(status_code=404, detail="Fatura não encontrada.")
        novo_pago = models.Pagamento(**pagamento_in.model_dump())
        db.add(novo_pago)
        db.commit()
        db.refresh(novo_pago)
        return novo_pago
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar pagamento: {str(e)}")

@app.put("/pagamentos/{id_pagamento}", response_model=schemas.PagamentoResponse, tags=["Pagamentos"])
def atualizar_pagamento(id_pagamento: UUID, pagamento_in: schemas.PagamentoCreate, db: Session = Depends(get_db)):
    try:
        pagamento = db.query(models.Pagamento).filter(models.Pagamento.id_pagamento == id_pagamento).first()
        if not pagamento:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        for var, value in pagamento_in.model_dump(exclude_unset=True).items():
            setattr(pagamento, var, value)
        db.commit()
        db.refresh(pagamento)
        return pagamento
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar pagamento: {str(e)}")

@app.delete("/pagamentos/{id_pagamento}", tags=["Pagamentos"])
def deletar_pagamento(id_pagamento: UUID, db: Session = Depends(get_db)):
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
def get_pagamentos_por_contrato(id_contrato: UUID, db: Session = Depends(get_db)):
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
def listar_faturas(id_contrato: UUID = None, db: Session = Depends(get_db)):
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
def atualizar_fatura(id_fatura: UUID, fatura_in: schemas.FaturaCreate, db: Session = Depends(get_db)):
    fatura = db.query(models.Fatura).filter(models.Fatura.id_fatura == id_fatura).first()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada.")
    for var, value in fatura_in.model_dump(exclude_unset=True).items():
        setattr(fatura, var, value)
    db.commit()
    db.refresh(fatura)
    return fatura

@app.delete("/faturas/{id_fatura}", tags=["Faturas"])
def deletar_fatura(id_fatura: UUID, db: Session = Depends(get_db)):
    fatura = db.query(models.Fatura).filter(models.Fatura.id_fatura == id_fatura).first()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada.")
    db.delete(fatura)
    db.commit()
    return {"mensagem": "Fatura removida com sucesso"}