from back.core.database import SessionLocal
from back.models.usuario import Usuario
from back.core.security import get_password_hash

def criar_admin():
    db = SessionLocal()
    try:
        # Verifica se já existe um admin
        existente = db.query(Usuario).filter(Usuario.username == "admin").first()
        if existente:
            print("Usuário admin já existe. Pule esta etapa.")
            return

        admin = Usuario(
            username="admin",
            hashed_password=get_password_hash("123456")
        )
        db.add(admin)
        db.commit()
        print("✅ Admin criado com sucesso!")
        print("   Login: admin")
        print("   Senha: 123456")
    finally:
        db.close()

if __name__ == "__main__":
    criar_admin()