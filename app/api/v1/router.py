from fastapi import APIRouter
from . import (
    empresas, responsaveis, modelos_contrato, contratos,
    entregas, interacoes, pagamentos, faturas,
    catalogo_servicos, dashboard, pendencias, metabase
)

router = APIRouter()
router.include_router(empresas.router)
router.include_router(responsaveis.router)
router.include_router(modelos_contrato.router)
router.include_router(contratos.router)
router.include_router(entregas.router)
router.include_router(interacoes.router)
router.include_router(pagamentos.router)
router.include_router(faturas.router)
router.include_router(catalogo_servicos.router)
router.include_router(dashboard.router)
router.include_router(pendencias.router)
router.include_router(metabase.router)