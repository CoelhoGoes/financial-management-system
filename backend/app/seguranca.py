import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import obter_sessao
from .models import Usuario

SEGREDO = os.getenv("SEGREDO_JWT", "troque_este_segredo_em_producao")
ALGORITMO = "HS256"
HORAS_VALIDADE = 24 * 7

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/token")


def gerar_hash(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def conferir_senha(senha: str, hash_salvo: str) -> bool:
    return bcrypt.checkpw(senha.encode(), hash_salvo.encode())


def criar_token(usuario_id: int) -> str:
    expira = datetime.now(timezone.utc) + timedelta(hours=HORAS_VALIDADE)
    return jwt.encode({"sub": str(usuario_id), "exp": expira}, SEGREDO, algorithm=ALGORITMO)


def usuario_atual(
    token: str = Depends(oauth2), sessao: Session = Depends(obter_sessao)
) -> Usuario:
    erro = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sessão inválida ou expirada. Entre novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        dados = jwt.decode(token, SEGREDO, algorithms=[ALGORITMO])
        usuario_id = int(dados["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise erro

    usuario = sessao.get(Usuario, usuario_id)
    if usuario is None:
        raise erro
    return usuario
