"""Business rules: invoice, balance and trend.

Live on the server on purpose — so the website and a future native app
compute exactly the same thing.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # avoids depending on the DB: the rules below are testable on their own
    from ..infra.models import Entry, Income, User


# Results of the rules below. Plain dataclasses, not Pydantic: the domain does not know
# the API exists. The routers return them as-is and `response_model` turns them into the
# matching schemas in `api/schemas.py`, which keep the same field names.


@dataclass
class InvoiceInstallment:
    entry_id: int
    description: str
    category: str
    purchase_date: date
    installment: int
    total_installments: int
    installment_amount: Decimal


@dataclass
class Invoice:
    month: str
    total: Decimal
    items: list[InvoiceInstallment]


@dataclass
class CategoryItem:
    """One line inside a category. `installment` is None for cash expenses."""

    description: str
    amount: Decimal
    installment: int | None = None
    total_installments: int | None = None


@dataclass
class CategoryBreakdown:
    category: str
    total: Decimal
    share: Decimal
    items: list[CategoryItem]


@dataclass
class Summary:
    """`month_balance` is the month on its own; `available_balance` carries every month
    before it too (the accumulated balance)."""

    month: str
    monthly_income: Decimal
    extra_income: Decimal
    cash_expenses: Decimal
    invoice: Decimal
    total_spent: Decimal
    month_balance: Decimal
    available_balance: Decimal

CENT = Decimal("0.01")
SHARE = Decimal("0.0001")


def month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def month_start(key: str) -> date:
    year, month = map(int, key.split("-"))
    return date(year, month, 1)


def shift_month(key: str, n: int) -> str:
    year, month = map(int, key.split("-"))
    total = year * 12 + (month - 1) + n
    return f"{total // 12:04d}-{total % 12 + 1:02d}"


def is_income_on_credit(entry_type: str, method: str | None) -> bool:
    """An entrada never goes on the credit card — receiving money on it makes no sense here."""
    return entry_type == "entrada" and method == "credito"


def invoice_for_purchase(d: date, closing_day: int) -> str:
    """A purchase before the closing day lands on next month's invoice;
    on/after that day it skips to the month after."""
    return shift_month(month_key(d), 1 if d.day < closing_day else 2)


def split_installments(amount: Decimal, n: int) -> list[Decimal]:
    """Splits without losing a cent: the last installment absorbs the remainder."""
    base = (amount / n).quantize(CENT)
    installments = [base] * (n - 1)
    installments.append(amount - base * (n - 1))
    return installments


def build_invoices(entries: list[Entry], closing_day: int) -> dict[str, list[InvoiceInstallment]]:
    by_month: dict[str, list[InvoiceInstallment]] = defaultdict(list)
    for e in entries:
        if e.method != "credito":
            continue
        start = invoice_for_purchase(e.date, closing_day)
        for i, amount in enumerate(split_installments(Decimal(e.amount), e.installments)):
            by_month[shift_month(start, i)].append(
                InvoiceInstallment(
                    entry_id=e.id,
                    description=e.description,
                    category=e.category,
                    purchase_date=e.date,
                    installment=i + 1,
                    total_installments=e.installments,
                    installment_amount=amount,
                )
            )
    return by_month


def calculate_invoice(month: str, entries: list[Entry], closing_day: int) -> Invoice:
    items = build_invoices(entries, closing_day).get(month, [])
    return Invoice(month=month, total=sum((i.installment_amount for i in items), Decimal(0)), items=items)


def income_for(month: str, incomes: list[Income]) -> Decimal:
    """The income registered with the latest start month up to `month`; zero before the first."""
    started = [i for i in incomes if month_key(i.month) <= month]
    if not started:
        return Decimal(0)
    return Decimal(max(started, key=lambda i: i.month).amount)


def calculate_summaries(
    months: list[str], user: User, entries: list[Entry], incomes: list[Income]
) -> list[Summary]:
    """One summary per month in `months`, each with the balance accumulated up to it."""
    invoices = build_invoices(entries, user.closing_day)
    by_month: dict[str, list[Entry]] = defaultdict(list)
    for e in entries:
        by_month[month_key(e.date)].append(e)

    def month_summary(month: str) -> Summary:
        this_month = by_month.get(month, [])
        income = income_for(month, incomes)
        extra_income = sum(
            (Decimal(e.amount) for e in this_month if e.type == "entrada"), Decimal(0)
        )
        cash_expenses = sum(
            (Decimal(e.amount) for e in this_month if e.type == "gasto" and e.method == "avista"),
            Decimal(0),
        )
        invoice = sum((i.installment_amount for i in invoices.get(month, [])), Decimal(0))
        balance = income + extra_income - cash_expenses - invoice
        return Summary(
            month=month,
            monthly_income=income,
            extra_income=extra_income,
            cash_expenses=cash_expenses,
            invoice=invoice,
            total_spent=cash_expenses + invoice,
            month_balance=balance,
            available_balance=balance,
        )

    # Before the first entry and the first income every month adds zero (an installment always
    # falls after its purchase), so the running sum may start there without changing the result.
    computed: dict[str, Summary] = {}
    starts = [*by_month, *(month_key(i.month) for i in incomes)]
    if starts and months:
        current, total = min(starts), Decimal(0)
        while current <= max(months):
            summary = month_summary(current)
            total += summary.month_balance
            summary.available_balance = total
            computed[current] = summary
            current = shift_month(current, 1)

    # a month before every start accumulates zero, and month_summary already says so
    return [computed.get(month) or month_summary(month) for month in months]


def calculate_summary(
    month: str, user: User, entries: list[Entry], incomes: list[Income]
) -> Summary:
    return calculate_summaries([month], user, entries, incomes)[0]


def calculate_category_breakdown(
    month: str, user: User, entries: list[Entry]
) -> list[CategoryBreakdown]:
    """Spending of the month grouped by category, one line per item.

    Uses the same split as `calculate_summary`: cash expenses made in the month, plus
    the installments of the invoice that falls due in it — which is why a purchase from
    another month shows up here. The totals add up to that month's `total_spent`.
    """
    grouped: dict[str, list[CategoryItem]] = defaultdict(list)

    for e in entries:
        if month_key(e.date) == month and e.type == "gasto" and e.method == "avista":
            grouped[e.category].append(
                CategoryItem(description=e.description, amount=Decimal(e.amount))
            )

    for item in calculate_invoice(month, entries, user.closing_day).items:
        grouped[item.category].append(
            CategoryItem(
                description=item.description,
                amount=item.installment_amount,
                installment=item.installment,
                total_installments=item.total_installments,
            )
        )

    spent = sum((i.amount for items in grouped.values() for i in items), Decimal(0))

    breakdown = []
    for category, items in grouped.items():
        total = sum((i.amount for i in items), Decimal(0))
        breakdown.append(
            CategoryBreakdown(
                category=category,
                total=total,
                share=(total / spent).quantize(SHARE) if spent else Decimal(0),
                items=sorted(items, key=lambda i: i.amount, reverse=True),
            )
        )
    return sorted(breakdown, key=lambda c: c.total, reverse=True)
