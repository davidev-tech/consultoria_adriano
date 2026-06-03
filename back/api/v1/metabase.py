import time
import jwt
from fastapi import APIRouter, HTTPException
from back.core.config import settings

router = APIRouter(prefix="/metabase", tags=["Metabase"])

@router.get("/token/contratos")
def obter_token_metabase():
    try:
        payload = {
            "resource": {"dashboard": 1},
            "params": {},
            "exp": round(time.time()) + (60 * 10)
        }
        token = jwt.encode(payload, settings.METABASE_SECRET_KEY, algorithm="HS256")
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar token: {str(e)}")