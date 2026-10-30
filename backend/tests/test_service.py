"""Regras de negócio. Nenhum banco, nenhum HTTP — só as funções puras."""
from datetime import date
from decimal import Decimal

import pytest

from app.domain.service import (
    calculate_category_breakdown,
    calculate_invoice,
    calculate_summaries,
    calculate_summary,
    income_for,
    invoice_for_purchase,
    is_income_on_credit,
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


class TestIsIncomeOnCredit:
    @pytest.mark.parametrize("tipo,metodo,esperado", [
        ("entrada", "credito", True),   # o único caso proibido
        ("entrada", "avista", False),
        ("gasto", "credito", False),
        ("gasto", "avista", False),
        ("entrada", None, False),       # linha importada não tem método
    ])
    def test_so_entrada_no_credito_e_proibida(self, tipo, metodo, esperado):
        assert is_income_on_credit(tipo, metodo) is esperado


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
    def test_a_formula_do_saldo_do_mes(self, user, gasto, renda):
        entries = [
            gasto("2026-09-03", "300.00", category="Mercado"),
            gasto("2026-09-10", "900.00", type="entrada", category="Freela"),
            gasto("2026-08-05", "1200.00", method="credito", installments=3, category="Lazer"),
        ]
        s = calculate_summary("2026-09", user, entries, [renda("2026-09", "5000.00")])
        assert s.cash_expenses == Decimal("300.00")
        assert s.extra_income == Decimal("900.00")
        assert s.invoice == Decimal("400.00")
        assert s.total_spent == Decimal("700.00")
        # 5000 + 900 - 300 - 400
        assert s.month_balance == Decimal("5200.00")

    def test_usuario_sem_lancamento_ve_apenas_a_renda(self, user, renda):
        s = calculate_summary("2026-09", user, [], [renda("2026-09", "5000.00")])
        assert s.month_balance == Decimal("5000.00")
        assert s.total_spent == Decimal(0)


class TestIncomeFor:
    def test_vale_a_renda_de_inicio_mais_recente_ate_o_mes(self, renda):
        """UC5: a renda nova vale do seu mês em diante; antes, a anterior."""
        rendas = [renda("2026-10", "2000.00"), renda("2026-08", "1000.00")]
        assert income_for("2026-07", rendas) == Decimal(0)
        assert income_for("2026-08", rendas) == Decimal("1000.00")
        assert income_for("2026-09", rendas) == Decimal("1000.00")
        assert income_for("2027-05", rendas) == Decimal("2000.00")

    def test_sem_renda_registrada_e_zero(self):
        assert income_for("2026-09", []) == Decimal(0)


class TestSaldoAcumulado:
    def _saldos(self, meses, user, entries, rendas):
        return [s.available_balance for s in calculate_summaries(meses, user, entries, rendas)]

    def test_acumulado_e_o_anterior_mais_o_do_mes(self, user, gasto, renda):
        """UC1."""
        entries = [gasto("2026-08-03", "300.00"), gasto("2026-09-03", "500.00")]
        s = calculate_summary("2026-09", user, entries, [renda("2026-08", "1000.00")])
        assert s.month_balance == Decimal("500.00")
        assert s.available_balance == Decimal("1200.00")  # 700 de agosto + 500

    def test_conta_vazia_acumula_zero(self, user):
        """F1: continua cumulativo; nada soma nada."""
        assert self._saldos(["2026-08", "2026-09"], user, [], []) == [Decimal(0), Decimal(0)]

    def test_meses_antes_de_tudo_somam_zero(self, user, gasto, renda):
        """UC2/F2: antes do primeiro lançamento e da primeira renda o acumulado é zero, e o
        primeiro mês com valores não depende de onde a soma começa."""
        entries = [gasto("2026-09-03", "100.00")]
        rendas = [renda("2026-09", "1000.00")]
        assert self._saldos(["2026-07", "2026-08", "2026-09"], user, entries, rendas) == [
            Decimal(0), Decimal(0), Decimal("900.00"),
        ]

    def test_mes_vazio_no_meio_carrega_o_acumulado(self, user, gasto):
        """UC2: x + 0 = x."""
        entries = [gasto("2026-07-03", "100.00", type="entrada")]
        assert self._saldos(["2026-07", "2026-08", "2026-09"], user, entries, []) == [
            Decimal("100.00"), Decimal("100.00"), Decimal("100.00"),
        ]

    def test_negativo_passa_adiante(self, user, gasto, renda):
        """UC3."""
        entries = [gasto("2026-08-03", "1500.00")]
        assert self._saldos(["2026-08", "2026-09"], user, entries, [renda("2026-08", "1000.00")]) == [
            Decimal("-500.00"), Decimal("500.00"),
        ]

    def test_futuro_soma_renda_e_desconta_parcelas(self, user, gasto, renda):
        """UC4: compra em 05/09 com fechamento dia 10 cai nas faturas de out, nov e dez."""
        entries = [gasto("2026-09-05", "300.00", method="credito", installments=3)]
        saldos = self._saldos(["2026-12"], user, entries, [renda("2026-09", "1000.00")])
        assert saldos == [Decimal("3700.00")]  # 4 rendas - 300 de parcelas

    def test_renda_nova_muda_so_dali_em_diante(self, user, renda):
        """UC5."""
        rendas = [renda("2026-08", "1000.00"), renda("2026-10", "2000.00")]
        assert self._saldos(["2026-09", "2026-10"], user, [], rendas) == [
            Decimal("2000.00"), Decimal("4000.00"),
        ]

    def test_apagar_renda_volta_a_anterior(self, user, renda):
        """UC5b: sem a de outubro, outubro usa a de agosto."""
        assert self._saldos(["2026-10"], user, [], [renda("2026-08", "1000.00")]) == [
            Decimal("3000.00"),
        ]

    def test_lancamento_passado_muda_os_seguintes(self, user, gasto):
        """UC8."""
        antes = self._saldos(["2026-09"], user, [], [])
        depois = self._saldos(["2026-09"], user, [gasto("2026-06-03", "100.00")], [])
        assert (antes, depois) == ([Decimal(0)], [Decimal("-100.00")])

    def test_excluir_o_mais_antigo_tira_a_contribuicao_dele(self, user, gasto, renda):
        """F3."""
        rendas = [renda("2026-09", "1000.00")]
        antigo, novo = gasto("2026-07-03", "200.00"), gasto("2026-09-03", "100.00")
        assert self._saldos(["2026-09"], user, [antigo, novo], rendas) == [Decimal("700.00")]
        assert self._saldos(["2026-09"], user, [novo], rendas) == [Decimal("900.00")]

    def test_extrato_antigo_sem_renda_puxa_para_baixo(self, user, gasto, renda):
        """F4: meses antes da primeira renda contam renda zero."""
        entries = [gasto("2026-05-03", "400.00")]
        assert self._saldos(["2026-09"], user, entries, [renda("2026-09", "1000.00")]) == [
            Decimal("600.00"),
        ]

    def test_renda_zero_para_de_somar(self, user, renda):
        """F7."""
        rendas = [renda("2026-08", "1000.00"), renda("2026-09", "0")]
        assert self._saldos(["2026-10"], user, [], rendas) == [Decimal("1000.00")]

    def test_sem_renda_nenhuma_so_os_lancamentos_acumulam(self, user, gasto):
        """F7b."""
        entries = [gasto("2026-08-03", "100.00"), gasto("2026-09-03", "50.00")]
        assert self._saldos(["2026-09"], user, entries, []) == [Decimal("-150.00")]

    def test_totais_do_mes_nao_mudam(self, user, gasto, renda):
        """F12: só o saldo ganha a versão acumulada."""
        entries = [
            gasto("2026-08-03", "999.00"),
            gasto("2026-09-03", "300.00"),
            gasto("2026-08-05", "1200.00", method="credito", installments=3),
        ]
        s = calculate_summary("2026-09", user, entries, [renda("2026-08", "1000.00")])
        assert (s.cash_expenses, s.invoice, s.total_spent) == (
            Decimal("300.00"), Decimal("400.00"), Decimal("700.00"),
        )

    def test_varios_meses_de_uma_vez_batem_com_um_por_vez(self, user, gasto, renda):
        """O /trend pede vários meses numa chamada; cada um precisa dar o mesmo que o /summary."""
        entries = [gasto("2026-06-03", "120.00"), gasto("2026-08-05", "900.00", method="credito",
                                                        installments=3)]
        rendas = [renda("2026-06", "1000.00")]
        meses = ["2026-07", "2026-09", "2026-11"]
        juntos = calculate_summaries(meses, user, entries, rendas)
        assert juntos == [calculate_summary(m, user, entries, rendas) for m in meses]


class TestCategoryBreakdown:
    def test_os_totais_somam_o_total_gasto(self, user, gasto):
        entries = [
            gasto("2026-09-03", "300.00", category="Mercado"),
            gasto("2026-09-04", "80.00", category="Transporte"),
            gasto("2026-08-05", "1200.00", method="credito", installments=3, category="Lazer"),
        ]
        breakdown = calculate_category_breakdown("2026-09", user, entries)
        resumo = calculate_summary("2026-09", user, entries, [])
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
