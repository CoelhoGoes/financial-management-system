"""Passwords and tokens. No HTTP here: `api/deps.py` turns these into 401/429."""
import os
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

# 32 bytes é o mínimo recomendado pela RFC 7518 para HS256, e o mesmo limite abaixo do
# qual o PyJWT emite InsecureKeyLengthWarning. `openssl rand -hex 32` dá 64 caracteres.
MIN_SECRET_BYTES = 32

def check_secret(secret: str | None) -> str:
    """Recusa segredo ausente ou curto. Roda no import, então a API não sobe sem ele."""
    if not secret:
        raise RuntimeError(
            "JWT_SECRET não está definida. Sem ela a API assinaria os tokens com um valor "
            "previsível, e qualquer pessoa poderia forjar uma sessão de qualquer usuário. "
            "Gere uma chave com `openssl rand -hex 32` e coloque no .env (veja .env.example)."
        )
    if len(secret.encode()) < MIN_SECRET_BYTES:
        raise RuntimeError(
            f"JWT_SECRET tem {len(secret.encode())} bytes; o mínimo é {MIN_SECRET_BYTES}. "
            "Um segredo curto é quebrável por força bruta, e quem o quebrar forja a sessão de "
            "qualquer usuário. Gere uma chave com `openssl rand -hex 32` e coloque no .env."
        )
    return secret


SECRET = check_secret(os.getenv("JWT_SECRET"))

ALGORITHM = "HS256"
HOURS_VALID = 24 * 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, stored_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), stored_hash.encode())


def create_token(user_id: int) -> str:
    expires = datetime.now(UTC) + timedelta(hours=HOURS_VALID)
    return jwt.encode({"sub": str(user_id), "exp": expires}, SECRET, algorithm=ALGORITHM)


def user_id_from_token(token: str) -> int | None:
    """The user id a valid token carries; None when it is forged, expired or malformed."""
    try:
        return int(jwt.decode(token, SECRET, algorithms=[ALGORITHM])["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
