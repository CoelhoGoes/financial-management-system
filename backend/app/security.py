import os
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_session
from .models import User

SECRET = os.getenv("JWT_SECRET")
if not SECRET:
    raise RuntimeError(
        "JWT_SECRET não está definida. Sem ela a API assinaria os tokens com um valor "
        "previsível, e qualquer pessoa poderia forjar uma sessão de qualquer usuário. "
        "Gere uma chave com `openssl rand -hex 32` e coloque no .env (veja .env.example)."
    )

ALGORITHM = "HS256"
HOURS_VALID = 24 * 7

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/token")


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
