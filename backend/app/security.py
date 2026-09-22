import os
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_session
from .models import User

# 32 bytes é o mínimo recomendado pela RFC 7518 para HS256, e o mesmo limite abaixo do
# qual o PyJWT emite InsecureKeyLengthWarning. `openssl rand -hex 32` dá 64 caracteres.
MIN_SECRET_BYTES = 32

SECRET = os.getenv("JWT_SECRET")
if not SECRET:
    raise RuntimeError(
        "JWT_SECRET não está definida. Sem ela a API assinaria os tokens com um valor "
        "previsível, e qualquer pessoa poderia forjar uma sessão de qualquer usuário. "
        "Gere uma chave com `openssl rand -hex 32` e coloque no .env (veja .env.example)."
    )
if len(SECRET.encode()) < MIN_SECRET_BYTES:
    raise RuntimeError(
        f"JWT_SECRET tem {len(SECRET.encode())} bytes; o mínimo é {MIN_SECRET_BYTES}. "
        "Um segredo curto é quebrável por força bruta, e quem o quebrar forja a sessão de "
        "qualquer usuário. Gere uma chave com `openssl rand -hex 32` e coloque no .env."
    )

ALGORITHM = "HS256"
HOURS_VALID = 24 * 7

MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW = timedelta(minutes=15)

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Failed logins are kept in memory on purpose: the container runs a single uvicorn
# process, so one dict is enough and nothing new enters requirements.txt. It resets on
# restart and is not shared between workers — revisit if either of those changes.
_failed_logins: dict[str, list[datetime]] = {}


def _recent_failures(key: str, now: datetime) -> list[datetime]:
    recent = [t for t in _failed_logins.get(key, []) if now - t < LOGIN_WINDOW]
    if recent:
        _failed_logins[key] = recent
    else:
        _failed_logins.pop(key, None)
    return recent


def ensure_login_allowed(key: str) -> None:
    """Blocks after MAX_LOGIN_ATTEMPTS failures inside LOGIN_WINDOW."""
    now = datetime.now(UTC)
    recent = _recent_failures(key, now)
    if len(recent) >= MAX_LOGIN_ATTEMPTS:
        retry_after = int((LOGIN_WINDOW - (now - min(recent))).total_seconds())
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Muitas tentativas de login. Espere alguns minutos e tente de novo.",
            headers={"Retry-After": str(max(retry_after, 1))},
        )


def record_failed_login(key: str) -> None:
    _failed_logins.setdefault(key, []).append(datetime.now(UTC))


def clear_failed_logins(key: str) -> None:
    _failed_logins.pop(key, None)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, stored_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), stored_hash.encode())


def create_token(user_id: int) -> str:
    expires = datetime.now(UTC) + timedelta(hours=HOURS_VALID)
    return jwt.encode({"sub": str(user_id), "exp": expires}, SECRET, algorithm=ALGORITHM)


def current_user(
    token: str = Depends(oauth2), session: Session = Depends(get_session)
) -> User:
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sessão inválida ou expirada. Entre novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise error

    user = session.get(User, user_id)
    if user is None:
        raise error
    return user
