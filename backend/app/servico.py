"""Regras de negócio: fatura, saldo e tendência.

Ficam no servidor de propósito — assim o site e um futuro app nativo
calculam exatamente a mesma coisa.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from .schemas import Fatura, ParcelaFatura, Resumo

if TYPE_CHECKING:  # evita depender do banco: as regras abaixo são testáveis sozinhas
    from .models import Lancamento, Usuario

CENTAVO = Decimal("0.01")


def chave_mes(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def desloca_mes(chave: str, n: int) -> str:
    ano, mes = map(int, chave.split("-"))
    total = ano * 12 + (mes - 1) + n
    return f"{total // 12:04d}-{total % 12 + 1:02d}"


def fatura_da_compra(d: date, dia_fechamento: int) -> str:
    """Compra antes do fechamento cai na fatura do mês seguinte;
    a partir do fechamento, pula para a subsequente."""
    return desloca_mes(chave_mes(d), 1 if d.day < dia_fechamento else 2)


def dividir_parcelas(valor: Decimal, n: int) -> list[Decimal]:
    """Divide sem perder centavo: a última parcela absorve o resto."""
    base = (valor / n).quantize(CENTAVO)
    parcelas = [base] * (n - 1)
    parcelas.append(valor - base * (n - 1))
    return parcelas


def montar_faturas(lancamentos: list[Lancamento], dia_fechamento: int) -> dict[str, list[ParcelaFatura]]:
    mapa: dict[str, list[ParcelaFatura]] = defaultdict(list)
    for l in lancamentos:
        if l.forma != "credito":
            continue
        inicio = fatura_da_compra(l.data, dia_fechamento)
        for i, valor in enumerate(dividir_parcelas(Decimal(l.valor), l.parcelas)):
            mapa[desloca_mes(inicio, i)].append(
                ParcelaFatura(
                    lancamento_id=l.id,
                    descricao=l.descricao,
                    categoria=l.categoria,
                    data_compra=l.data,
                    parcela=i + 1,
                    total_parcelas=l.parcelas,
                    valor_parcela=valor,
                )
            )
    return mapa


def calcular_fatura(mes: str, lancamentos: list[Lancamento], dia_fechamento: int) -> Fatura:
    itens = montar_faturas(lancamentos, dia_fechamento).get(mes, [])
    return Fatura(mes=mes, total=sum((i.valor_parcela for i in itens), Decimal(0)), itens=itens)


def calcular_resumo(mes: str, usuario: Usuario, lancamentos: list[Lancamento]) -> Resumo:
    renda = Decimal(usuario.renda_mensal)
    do_mes = [l for l in lancamentos if chave_mes(l.data) == mes]

    entradas = sum((Decimal(l.valor) for l in do_mes if l.tipo == "entrada"), Decimal(0))
    avista = sum(
        (Decimal(l.valor) for l in do_mes if l.tipo == "gasto" and l.forma == "avista"),
        Decimal(0),
    )

    fatura = calcular_fatura(mes, lancamentos, usuario.dia_fechamento)

    categorias: dict[str, Decimal] = defaultdict(Decimal)
    for l in do_mes:
        if l.tipo == "gasto" and l.forma == "avista":
            categorias[l.categoria] += Decimal(l.valor)
    for item in fatura.itens:
        categorias[item.categoria] += item.valor_parcela

    return Resumo(
        mes=mes,
        renda_mensal=renda,
        entradas_extras=entradas,
        gastos_avista=avista,
        fatura=fatura.total,
        gasto_total=avista + fatura.total,
        saldo_disponivel=renda + entradas - avista - fatura.total,
        por_categoria=dict(sorted(categorias.items(), key=lambda x: x[1], reverse=True)),
    )
