from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioEntrada(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=8)


class ConfigUsuario(BaseModel):
    renda_mensal: Decimal = Field(ge=0)
    dia_fechamento: int = Field(ge=1, le=28)


class UsuarioSaida(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    renda_mensal: Decimal
    dia_fechamento: int


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LancamentoEntrada(BaseModel):
    tipo: Literal["gasto", "entrada"]
    valor: Decimal = Field(gt=0, decimal_places=2)
    descricao: str = Field(min_length=1, max_length=200)
    categoria: str = Field(min_length=1, max_length=50)
    data: date
    forma: Literal["avista", "credito"] = "avista"
    parcelas: int = Field(default=1, ge=1, le=48)


class LancamentoSaida(LancamentoEntrada):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ParcelaFatura(BaseModel):
    lancamento_id: int
    descricao: str
    categoria: str
    data_compra: date
    parcela: int
    total_parcelas: int
    valor_parcela: Decimal


class Fatura(BaseModel):
    mes: str
    total: Decimal
    itens: list[ParcelaFatura]


class Resumo(BaseModel):
    mes: str
    renda_mensal: Decimal
    entradas_extras: Decimal
    gastos_avista: Decimal
    fatura: Decimal
    gasto_total: Decimal
    saldo_disponivel: Decimal
    por_categoria: dict[str, Decimal]
