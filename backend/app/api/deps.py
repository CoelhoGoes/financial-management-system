"""FastAPI dependencies shared by the routers: who is calling, and may they try to log in."""
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ..infra.database import get_session
from ..infra.models import User
from ..infra.security import user_id_from_token

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


def current_user(
    token: str = Depends(oauth2), session: Session = Depends(get_session)
) -> User:
    user_id = user_id_from_token(token)
    user = session.get(User, user_id) if user_id is not None else None
    if user is None or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada. Entre novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
