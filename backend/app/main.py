import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import autenticacao, financas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gestão Financeira", version="1.0.0")

origens = [o.strip() for o in os.getenv("ORIGENS_PERMITIDAS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origens,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(autenticacao.router)
app.include_router(financas.router)


@app.get("/saude", tags=["infra"])
def saude():
    return {"status": "ok"}
