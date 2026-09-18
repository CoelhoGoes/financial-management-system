"""Business rules: invoice, balance and trend.

Live on the server on purpose — so the website and a future native app
compute exactly the same thing.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from .schemas import (
    CategoryBreakdown,
    CategoryItem,
    Invoice,
    InvoiceInstallment,
    Summary,
)

if TYPE_CHECKING:  # avoids depending on the DB: the rules below are testable on their own
    from .models import Entry, User

CENT = Decimal("0.01")
SHARE = Decimal("0.0001")


def month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def shift_month(key: str, n: int) -> str:
    year, month = map(int, key.split("-"))
    total = year * 12 + (month - 1) + n
    return f"{total // 12:04d}-{total % 12 + 1:02d}"


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


def calculate_summary(month: str, user: User, entries: list[Entry]) -> Summary:
    income = Decimal(user.monthly_income)
    this_month = [e for e in entries if month_key(e.date) == month]

    extra_income = sum((Decimal(e.amount) for e in this_month if e.type == "entrada"), Decimal(0))
    cash_expenses = sum(
        (Decimal(e.amount) for e in this_month if e.type == "gasto" and e.method == "avista"),
        Decimal(0),
    )

    invoice = calculate_invoice(month, entries, user.closing_day)

    categories: dict[str, Decimal] = defaultdict(Decimal)
    for e in this_month:
        if e.type == "gasto" and e.method == "avista":
            categories[e.category] += Decimal(e.amount)
    for item in invoice.items:
        categories[item.category] += item.installment_amount

    return Summary(
        month=month,
        monthly_income=income,
        extra_income=extra_income,
        cash_expenses=cash_expenses,
        invoice=invoice.total,
        total_spent=cash_expenses + invoice.total,
        available_balance=income + extra_income - cash_expenses - invoice.total,
        by_category=dict(sorted(categories.items(), key=lambda x: x[1], reverse=True)),
    )


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
