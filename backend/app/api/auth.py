from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..infra.database import get_session
from ..infra.models import User
from ..infra.security import create_token, hash_password, verify_password
from .deps import (
    clear_failed_logins,
    current_user,
    ensure_login_allowed,
    record_failed_login,
)
from .schemas import AccountDelete, Token, UserConfig, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _active_user(session: Session, email: str) -> User | None:
    # Conta excluída libera o e-mail, então pode haver mais de uma linha com ele: só a
    # ativa conta.
    return session.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))


def _attempt_key(request: Request, email: str) -> str:
    # Keyed by origin *and* account: one attacker cannot lock every account out, and one
    # account cannot be hammered from a single origin.
    origin = request.client.host if request.client else "unknown"
    return f"{origin}|{email.strip().lower()}"


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: UserCreate, session: Session = Depends(get_session)):
    if _active_user(session, data.email):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Não foi possível criar a conta com esses dados."
        )

    user = User(email=data.email, password_hash=hash_password(data.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/token", response_model=Token)
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    attempt_key = _attempt_key(request, form.username)
    ensure_login_allowed(attempt_key)

    user = _active_user(session, form.username)
    if not user or not verify_password(form.password, user.password_hash):
        record_failed_login(attempt_key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha não conferem.")

    clear_failed_logins(attempt_key)
    return Token(access_token=create_token(user.id))


@router.get("/me", response_model=UserOut)
def my_data(user: User = Depends(current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_config(
    data: UserConfig,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    user.monthly_income = data.monthly_income
    user.closing_day = data.closing_day
    session.commit()
    session.refresh(user)
    return user


@router.delete("/me", status_code=204)
def delete_account(
    data: AccountDelete,
    request: Request,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    # Mesmo limitador do login: quem tem o token não ganha um segundo lote de tentativas.
    attempt_key = _attempt_key(request, user.email)
    ensure_login_allowed(attempt_key)
    if not verify_password(data.password, user.password_hash):
        record_failed_login(attempt_key)
        # 403, não 401: o 401 faz o frontend derrubar a sessão por um erro de digitação
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Senha não confere.")

    user.deleted_at = datetime.now(UTC)
    session.commit()
