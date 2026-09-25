from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserConfig(BaseModel):
    monthly_income: Decimal = Field(ge=0)
    closing_day: int = Field(ge=1, le=28)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    monthly_income: Decimal
    closing_day: int


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EntryCreate(BaseModel):
    type: Literal["gasto", "entrada"]
    amount: Decimal = Field(gt=0, decimal_places=2)
    description: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=50)
    date: date
    method: Literal["avista", "credito"] = "avista"
    installments: int = Field(default=1, ge=1, le=48)


class EntryOut(EntryCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class InvoiceInstallment(BaseModel):
    entry_id: int
    description: str
    category: str
    purchase_date: date
    installment: int
    total_installments: int
    installment_amount: Decimal


class Invoice(BaseModel):
    month: str
    total: Decimal
    items: list[InvoiceInstallment]


class CategoryItem(BaseModel):
    """One line inside a category. `installment` is null for cash expenses."""

    description: str
    amount: Decimal
    installment: int | None = None
    total_installments: int | None = None


class CategoryBreakdown(BaseModel):
    category: str
    total: Decimal
    share: Decimal
    items: list[CategoryItem]


class Summary(BaseModel):
    month: str
    monthly_income: Decimal
    extra_income: Decimal
    cash_expenses: Decimal
    invoice: Decimal
    total_spent: Decimal
    available_balance: Decimal


class ImportPreviewItem(BaseModel):
    """Uma linha lida do extrato, antes de virar lançamento.

    Sem `category`: quem importa escolhe na revisão. `already_imported` marca o que já
    entrou numa importação anterior — a linha aparece na tela, riscada, em vez de sumir
    em silêncio.
    """

    type: Literal["gasto", "entrada"]
    amount: Decimal
    description: str
    date: date
    import_id: str
    already_imported: bool


class EntryImport(EntryCreate):
    """Linha revisada, voltando para gravação. `import_id` é o que impede duplicata."""

    import_id: str = Field(min_length=1, max_length=120)


class ImportResult(BaseModel):
    """`skipped` conta o que o servidor recusou por já existir, não o que você desmarcou."""

    created: list[EntryOut]
    skipped: int
