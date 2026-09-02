from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import obter_sessao
from ..models import Usuario
from ..schemas import ConfigUsuario, Token, UsuarioEntrada, UsuarioSaida
from ..seguranca import conferir_senha, criar_token, gerar_hash, usuario_atual

router = APIRouter(prefix="/auth", tags=["autenticação"])


@router.post("/registrar", response_model=UsuarioSaida, status_code=201)
def registrar(dados: UsuarioEntrada, sessao: Session = Depends(obter_sessao)):
    existente = sessao.scalar(select(Usuario).where(Usuario.email == dados.email))
    if existente:
        raise HTTPException(status.HTTP_409_CONFLICT, "Este e-mail já tem conta.")

    usuario = Usuario(email=dados.email, senha_hash=gerar_hash(dados.senha))
    sessao.add(usuario)
    sessao.commit()
    sessao.refresh(usuario)
    return usuario


@router.post("/token", response_model=Token)
def entrar(form: OAuth2PasswordRequestForm = Depends(), sessao: Session = Depends(obter_sessao)):
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == form.username))
    if not usuario or not conferir_senha(form.password, usuario.senha_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha não conferem.")
    return Token(access_token=criar_token(usuario.id))


@router.get("/eu", response_model=UsuarioSaida)
def meus_dados(usuario: Usuario = Depends(usuario_atual)):
    return usuario


@router.put("/eu", response_model=UsuarioSaida)
def atualizar_config(
    dados: ConfigUsuario,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    usuario.renda_mensal = dados.renda_mensal
    usuario.dia_fechamento = dados.dia_fechamento
    sessao.commit()
    sessao.refresh(usuario)
    return usuario
