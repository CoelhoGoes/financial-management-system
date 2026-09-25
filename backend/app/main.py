import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, finance

# O schema é criado e alterado por migrações do Alembic (`alembic upgrade head`,
# que o CMD do Dockerfile roda antes do servidor). Não use create_all aqui: os dois
# em paralelo fazem o schema do código divergir do banco em silêncio.

app = FastAPI(title="Gestão Financeira", version="1.0.0")

allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(finance.router)


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok"}
