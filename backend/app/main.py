from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from .core.config import settings
from .api.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Cross-Enterprise EV Battery Passport platform compliant with EU 2023/1542, featuring cryptographic hash chaining, RBAC, Supabase persistence, and QpiAI Opt & Quantum SDK modules.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API V1
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", include_in_schema=False)
async def root_redirect():
    return RedirectResponse(url="/docs")

@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "memory_db": settings.USE_MEMORY_DB,
        "qpiai_opt_configured": bool(settings.QPIAI_OPT_API_KEY.strip()),
        "qpiai_quantum_configured": bool(settings.QPIAI_QUANTUM_API_KEY.strip())
    }
