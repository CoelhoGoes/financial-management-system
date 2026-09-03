from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_session
from ..models import User
from ..schemas import Token, UserConfig, UserCreate, UserOut
from ..security import create_token, current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: UserCreate, session: Session = Depends(get_session)):
    existing = session.scalar(select(User).where(User.email == data.email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Este e-mail já tem conta.")

    user = User(email=data.email, password_hash=hash_password(data.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/token", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.scalar(select(User).where(User.email == form.username))
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha não conferem.")
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
