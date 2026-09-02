from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import obter_sessao
from ..models import Lancamento, Usuario
from ..schemas import Fatura, LancamentoEntrada, LancamentoSaida, Resumo
from ..seguranca import usuario_atual
from ..servico import calcular_fatura, calcular_resumo, chave_mes, desloca_mes

router = APIRouter(tags=["finanças"])

MES = r"^\d{4}-(0[1-9]|1[0-2])$"


def _todos(sessao: Session, usuario: Usuario) -> list[Lancamento]:
    return list(sessao.scalars(select(Lancamento).where(Lancamento.usuario_id == usuario.id)))


@router.post("/lancamentos", response_model=LancamentoSaida, status_code=201)
def criar(
    dados: LancamentoEntrada,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    if dados.tipo == "entrada" and dados.forma == "credito":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Entrada não vai no crédito.")

    lanc = Lancamento(usuario_id=usuario.id, **dados.model_dump())
    sessao.add(lanc)
    sessao.commit()
    sessao.refresh(lanc)
    return lanc


@router.get("/lancamentos", response_model=list[LancamentoSaida])
def listar(
    mes: str | None = Query(None, pattern=MES),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    consulta = select(Lancamento).where(Lancamento.usuario_id == usuario.id)
    if mes:
        ano, m = map(int, mes.split("-"))
        inicio = date(ano, m, 1)
        fim = date(ano + (m == 12), (m % 12) + 1, 1)
        consulta = consulta.where(Lancamento.data >= inicio, Lancamento.data < fim)
    return list(sessao.scalars(consulta.order_by(Lancamento.data.desc(), Lancamento.id.desc())))


@router.delete("/lancamentos/{lancamento_id}", status_code=204)
def remover(
    lancamento_id: int,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    lanc = sessao.get(Lancamento, lancamento_id)
    if not lanc or lanc.usuario_id != usuario.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lançamento não encontrado.")
    sessao.delete(lanc)
    sessao.commit()


@router.get("/resumo/{mes}", response_model=Resumo)
def resumo(
    mes: str,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    return calcular_resumo(mes, usuario, _todos(sessao, usuario))


@router.get("/faturas/{mes}", response_model=Fatura)
def fatura(
    mes: str,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    return calcular_fatura(mes, _todos(sessao, usuario), usuario.dia_fechamento)


@router.get("/tendencia", response_model=list[Resumo])
def tendencia(
    meses: int = Query(6, ge=1, le=24),
    ate: str | None = Query(None, pattern=MES),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    fim = ate or chave_mes(date.today())
    lancs = _todos(sessao, usuario)
    return [calcular_resumo(desloca_mes(fim, -i), usuario, lancs) for i in range(meses - 1, -1, -1)]
