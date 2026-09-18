"""Regras de negócio. Nenhum banco, nenhum HTTP — só as funções puras."""
from datetime import date
from decimal import Decimal

import pytest

from app.service import (
    calculate_category_breakdown,
    calculate_invoice,
    calculate_summary,
    invoice_for_purchase,
    shift_month,
    split_installments,
)


class TestShiftMonth:
    @pytest.mark.parametrize("inicio,n,esperado", [
        ("2026-09", 1, "2026-10"),
        ("2026-12", 1, "2027-01"),   # vira o ano
        ("2026-01", -1, "2025-12"),  # volta o ano
        ("2026-09", 0, "2026-09"),
        ("2026-01", -13, "2024-12"), # mais de um ano para trás
        ("2026-12", 12, "2027-12"),
    ])
    def test_atravessa_a_virada_de_ano(self, inicio, n, esperado):
        assert shift_month(inicio, n) == esperado

    def test_ida_e_volta_sempre_retorna_ao_mesmo_mes(self):
        for n in range(-30, 31):
            assert shift_month(shift_month("2026-06", n), -n) == "2026-06"


class TestInvoiceForPurchase:
    """docs/dominio.md: antes do fechamento cai na fatura do mês seguinte;
    no dia do fechamento ou depois, pula para a subsequente."""

    @pytest.mark.parametrize("compra,esperado", [
        ("2026-09-05", "2026-10"),  # antes do dia 10
        ("2026-09-09", "2026-10"),  # véspera
        ("2026-09-10", "2026-11"),  # no dia do fechamento -> pula
        ("2026-09-11", "2026-11"),  # depois
    ])
    def test_a_fronteira_e_o_proprio_dia_de_fechamento(self, compra, esperado):
        assert invoice_for_purchase(date.fromisoformat(compra), 10) == esperado

    def test_dezembro_empurra_para_o_ano_seguinte(self):
        assert invoice_for_purchase(date(2026, 12, 5), 10) == "2027-01"
        assert invoice_for_purchase(date(2026, 12, 20), 10) == "2027-02"


class TestSplitInstallments:
    """A razão de existir desta função é não perder centavo."""

    @pytest.mark.parametrize("valor,n", [
        ("100.00", 3), ("0.01", 1), ("0.05", 3), ("1000.00", 7),
        ("3600.00", 9), ("999.99", 48), ("0.02", 3),
    ])
    def test_a_soma_das_parcelas_e_sempre_o_valor_original(self, valor, n):
        parcelas = split_installments(Decimal(valor), n)
        assert sum(parcelas) == Decimal(valor)
        assert len(parcelas) == n

    def test_a_ultima_parcela_absorve_a_sobra(self):
        assert split_installments(Decimal("100.00"), 3) == [
            Decimal("33.33"), Decimal("33.33"), Decimal("33.34")
        ]

    def test_parcela_unica_devolve_o_valor_inteiro(self):
        assert split_installments(Decimal("42.42"), 1) == [Decimal("42.42")]


class TestCalculateInvoice:
    def test_mes_sem_parcela_devolve_total_zero_e_lista_vazia(self, user):
        fatura = calculate_invoice("2030-01", [], user.closing_day)
        assert fatura.total == Decimal(0)
        assert fatura.items == []

    def test_compra_parcelada_aparece_em_meses_consecutivos(self, user, gasto):
        tv = gasto("2026-09-05", "300.00", method="credito", installments=3, description="TV")
        meses = [calculate_invoice(m, [tv], user.closing_day) for m in ("2026-10", "2026-11", "2026-12")]
        assert [f.total for f in meses] == [Decimal("100.00")] * 3
        assert [f.items[0].installment for f in meses] == [1, 2, 3]
        assert all(f.items[0].total_installments == 3 for f in meses)

    def test_gasto_a_vista_nao_entra_em_fatura(self, user, gasto):
        avista = gasto("2026-09-05", "300.00", method="avista")
        assert calculate_invoice("2026-10", [avista], user.closing_day).total == Decimal(0)


class TestCalculateSummary:
    def test_a_formula_do_saldo(self, user, gasto):
        entries = [
            gasto("2026-09-03", "300.00", category="Mercado"),
            gasto("2026-09-10", "900.00", type="entrada", category="Freela"),
            gasto("2026-08-05", "1200.00", method="credito", installments=3, category="Lazer"),
        ]
        s = calculate_summary("2026-09", user, entries)
        assert s.cash_expenses == Decimal("300.00")
        assert s.extra_income == Decimal("900.00")
        assert s.invoice == Decimal("400.00")
        assert s.total_spent == Decimal("700.00")
        # 5000 + 900 - 300 - 400
        assert s.available_balance == Decimal("5200.00")

    def test_usuario_sem_lancamento_ve_apenas_a_renda(self, user):
        s = calculate_summary("2026-09", user, [])
        assert s.available_balance == Decimal("5000.00")
        assert s.total_spent == Decimal(0)


class TestCategoryBreakdown:
    def test_os_totais_somam_o_total_gasto(self, user, gasto):
        entries = [
            gasto("2026-09-03", "300.00", category="Mercado"),
            gasto("2026-09-04", "80.00", category="Transporte"),
            gasto("2026-08-05", "1200.00", method="credito", installments=3, category="Lazer"),
        ]
        breakdown = calculate_category_breakdown("2026-09", user, entries)
        resumo = calculate_summary("2026-09", user, entries)
        assert sum(c.total for c in breakdown) == resumo.total_spent

    def test_vem_ordenado_do_maior_para_o_menor(self, user, gasto):
        entries = [
            gasto("2026-09-03", "80.00", category="Transporte"),
            gasto("2026-09-04", "300.00", category="Mercado"),
        ]
        assert [c.category for c in calculate_category_breakdown("2026-09", user, entries)] == [
            "Mercado", "Transporte"
        ]

    def test_parcela_de_compra_antiga_carrega_o_numero_da_parcela(self, user, gasto):
        tv = gasto("2026-08-05", "1200.00", method="credito", installments=3,
                   category="Lazer", description="TV")
        item = calculate_category_breakdown("2026-09", user, [tv])[0].items[0]
        assert (item.description, item.installment, item.total_installments) == ("TV", 1, 3)

    def test_mes_sem_gasto_nao_devolve_categoria(self, user):
        assert calculate_category_breakdown("2030-01", user, []) == []
