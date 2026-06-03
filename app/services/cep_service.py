import requests
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.endereco import Endereco

def buscar_e_salvar_endereco(cep: str, db: Session) -> Endereco:
    """Busca o CEP na ViaCEP e salva no banco se ainda não existir."""
    endereco = db.query(Endereco).filter(Endereco.cep == cep).first()
    if endereco:
        return endereco

    try:
        resp = requests.get(f"https://viacep.com.br/ws/{cep}/json/")
        data = resp.json()
        if data.get("erro"):
            raise HTTPException(status_code=400, detail="CEP não encontrado.")
        novo = Endereco(
            cep=cep,
            bairro=data.get("bairro", ""),
            cidade=data.get("localidade", ""),
            estado=data.get("uf", "")
        )
        db.add(novo)
        db.flush()
        return novo
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Erro ao buscar dados do CEP.")