from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from back.core.database import get_db
from back.models.responsavel import Responsavel
from back.models.empresa_cliente import EmpresaCliente
from back.schemas.responsavel import ResponsavelCreate, ResponsavelResponse, ResponsavelListResponse

router = APIRouter(prefix="/responsaveis", tags=["Responsáveis"])

@router.post("", response_model=ResponsavelResponse, status_code=status.HTTP_201_CREATED)
def criar_responsavel(obj_in: ResponsavelCreate, db: Session = Depends(get_db)):
    responsavel_data = obj_in.model_dump(exclude_none=True)
    cpf = responsavel_data.get("cpf")
    if cpf:
        existente = db.query(Responsavel).filter(Responsavel.cpf == cpf).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este CPF já cadastrado.")
    novo_obj = Responsavel(**responsavel_data)
    db.add(novo_obj)
    db.commit()
    db.refresh(novo_obj)
    return novo_obj

@router.get("/lista", response_model=List[ResponsavelListResponse])
def listar_todos_responsaveis(
    id_cliente: Optional[UUID] = Query(None),
    busca: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Responsavel).join(EmpresaCliente)
    if id_cliente:
        query = query.filter(Responsavel.id_cliente == id_cliente)
    if busca:
        query = query.filter(
            Responsavel.nome.ilike(f"%{busca}%") |
            Responsavel.cpf.ilike(f"%{busca}%")
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

@router.delete("/{id_responsavel}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_responsavel(id_responsavel: UUID, db: Session = Depends(get_db)):
    responsavel = db.query(Responsavel).filter(Responsavel.id_responsavel == id_responsavel).first()
    if not responsavel:
        raise HTTPException(status_code=404, detail="Responsável não encontrado.")
    db.delete(responsavel)
    db.commit()
    return None

@router.put("/{id_responsavel}", response_model=ResponsavelResponse)
def atualizar_responsavel(id_responsavel: UUID, payload: dict, db: Session = Depends(get_db)):
    responsavel = db.query(Responsavel).filter(Responsavel.id_responsavel == id_responsavel).first()
    if not responsavel:
        raise HTTPException(status_code=404, detail="Responsável não encontrado.")
    if "nome" in payload:
        responsavel.nome = payload["nome"]
    if "cpf" in payload:
        novo_cpf = payload["cpf"]
        if novo_cpf and novo_cpf != responsavel.cpf:
            existente = db.query(Responsavel).filter(
                Responsavel.cpf == novo_cpf,
                Responsavel.id_responsavel != id_responsavel
            ).first()
            if existente:
                raise HTTPException(status_code=400, detail="CPF já cadastrado para outro responsável.")
        responsavel.cpf = novo_cpf or None
    if "cargo" in payload:
        responsavel.cargo = payload["cargo"]
    if "id_cliente" in payload:
        if not db.query(EmpresaCliente).filter(EmpresaCliente.id_cliente == payload["id_cliente"]).first():
            raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        responsavel.id_cliente = payload["id_cliente"]
    try:
        db.commit()
        db.refresh(responsavel)
        return responsavel
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar: {str(e)}")