from fastapi import APIRouter
from .v1 import health, batteries, custody, decisions, integrations, auth, qpiai_opt, qpiai_quantum, verification

# 1. Direct /api router strictly matching Master Prompt 3 required contracts
api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(batteries.router)
api_router.include_router(custody.router)
api_router.include_router(decisions.router)
api_router.include_router(integrations.router)
api_router.include_router(auth.router)
api_router.include_router(verification.router)
api_router.include_router(qpiai_opt.router)
api_router.include_router(qpiai_quantum.router)

# 2. /api/v1 router maintaining backwards-compatibility for existing UI paths
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(health.router)
v1_router.include_router(batteries.router)
v1_router.include_router(custody.router)
v1_router.include_router(decisions.router)
v1_router.include_router(integrations.router)
v1_router.include_router(auth.router)
v1_router.include_router(verification.router)
v1_router.include_router(qpiai_opt.router)
v1_router.include_router(qpiai_quantum.router)
