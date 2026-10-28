from fastapi import APIRouter
from .v1 import auth, passports, custody, verification, qpiai_opt, qpiai_quantum

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(passports.router)
api_router.include_router(custody.router)
api_router.include_router(verification.router)
api_router.include_router(qpiai_opt.router)
api_router.include_router(qpiai_quantum.router)
