from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.models.empresa_cliente import EmpresaCliente
from app.models.servico_prestado import ServicoPrestado
from app.models.contrato import Contrato
from app.schemas.empresa import EmpresaCreate, EmpresaResponse
from app.services.cep_service import buscar_e_salvar_endereco

router = APIRouter(prefix="/empresas", tags=["Empresas"])


@router.get("", response_model=List[EmpresaResponse])
def listar_empresas(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, le=10000),
    busca: Optional[str] = Query(None, description="Busca por nome ou CNPJ"),
    db: Session = Depends(get_db)
):
    query = db.query(EmpresaCliente).options(
        joinedload(EmpresaCliente.servicos_contratados)
            .joinedload(ServicoPrestado.servico_catalogo),
        joinedload(EmpresaCliente.interacoes),
        joinedload(EmpresaCliente.contratos)
            .joinedload(Contrato.pagamentos),
        joinedload(EmpresaCliente.contratos)
            .joinedload(Contrato.faturas),
        joinedload(EmpresaCliente.contratos)
            .joinedload(Contrato.entregas),
    )

    if busca:
        query = query.filter(
            EmpresaCliente.nome_empresa.ilike(f"%{busca}%") |
            EmpresaCliente.cnpj.ilike(f"%{busca}%")
        )

    query = query.order_by(EmpresaCliente.nome_empresa)
    return query.offset(skip).limit(limit).all()


@router.get("/{id_cliente}", response_model=EmpresaResponse)
def obter_empresa_por_id(id_cliente: UUID, db: Session = Depends(get_db)):
    empresa = db.query(EmpresaCliente).options(
        joinedload(EmpresaCliente.servicos_contratados).joinedload(ServicoPrestado.servico_catalogo),
        joinedload(EmpresaCliente.interacoes),
        joinedload(EmpresaCliente.contratos).joinedload(Contrato.pagamentos),
        joinedload(EmpresaCliente.contratos).joinedload(Contrato.faturas)
    ).filter(EmpresaCliente.id_cliente == id_cliente).first()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa cliente não encontrada.")
    return empresa


@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
def criar_empresa(empresa: EmpresaCreate, db: Session = Depends(get_db)):
    if empresa.cnpj:
        existente = db.query(EmpresaCliente).filter(EmpresaCliente.cnpj == empresa.cnpj).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este CNPJ já está cadastrado.")

    # garantir que o CEP exista na tabela endereco
    if empresa.cep:
        buscar_e_salvar_endereco(empresa.cep, db)

    empresa_data = empresa.model_dump(exclude={"ids_servicos_contratados"}, exclude_none=True)
    db_obj = EmpresaCliente(**empresa_data)

    db.add(db_obj)
    db.flush()

    if empresa.ids_servicos_contratados:
        for id_serv in empresa.ids_servicos_contratados:
            novo_vinculo = ServicoPrestado(
                id_cliente=db_obj.id_cliente,
                id_servico=id_serv
            )
            db.add(novo_vinculo)

    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.put("/{id_cliente}", response_model=EmpresaResponse)
def atualizar_empresa(id_cliente: UUID, empresa_atualizada: EmpresaCreate, db: Session = Depends(get_db)):
    empresa_db = db.query(EmpresaCliente).filter(EmpresaCliente.id_cliente == id_cliente).first()
    if not empresa_db:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    if empresa_atualizada.cnpj and empresa_atualizada.cnpj != empresa_db.cnpj:
        existente = db.query(EmpresaCliente).filter(EmpresaCliente.cnpj == empresa_atualizada.cnpj).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este CNPJ já está sendo usado por outra empresa.")

    # garantir que o CEP exista na tabela endereco
    if empresa_atualizada.cep:
        buscar_e_salvar_endereco(empresa_atualizada.cep, db)

    empresa_data = empresa_atualizada.model_dump(exclude={"ids_servicos_contratados"}, exclude_unset=True)
    for var, value in empresa_data.items():
        if value is not None:
            setattr(empresa_db, var, value)

    if empresa_atualizada.ids_servicos_contratados is not None:
        db.query(ServicoPrestado).filter(ServicoPrestado.id_cliente == id_cliente).delete()
        for id_serv in empresa_atualizada.ids_servicos_contratados:
            novo_vinculo = ServicoPrestado(id_cliente=id_cliente, id_servico=id_serv)
            db.add(novo_vinculo)

    db.add(empresa_db)
    db.commit()
    db.refresh(empresa_db)
    return empresa_db


@router.delete("/{id_cliente}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_empresa(id_cliente: UUID, db: Session = Depends(get_db)):
    empresa_db = db.query(EmpresaCliente).filter(EmpresaCliente.id_cliente == id_cliente).first()
    if not empresa_db:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    db.delete(empresa_db)
    db.commit()
    return None