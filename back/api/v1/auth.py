from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from back.core.database import get_db
from back.core.security import get_password_hash, verify_password, create_access_token, Token
from back.models.usuario import Usuario
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Autenticação"])

class UserCreate(BaseModel):
    username: str
    password: str

@router.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(Usuario).filter(Usuario.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Usuário já existe")
    hashed = get_password_hash(user.password)
    novo = Usuario(username=user.username, hashed_password=hashed)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(Usuario).filter(Usuario.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}