"""Testes do parser de OFX. Nenhum banco de dados, nenhum arquivo real.

Os fixtures são montados como string aqui dentro, de propósito: `*.ofx` está no
`.gitignore` (extrato é dado bancário, não entra no repositório), então um fixture em
arquivo não seria versionado. Todos os dados abaixo são inventados.
"""

from decimal import Decimal

import pytest

from app.ofx import OFXError, parse_statement

HEADER = """OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE
"""


def transaction(
    trntype="DEBIT",
    amount="-42.50",
    posted="20260915100000[-03:EST]",
    fitid="AAA001",
    memo="COMPRA TESTE",
):
    """`memo=None` omite a tag — MEMO é opcional no padrão, e é assim que um
    lançamento chega sem descrição. MEMO em branco não existe: o SGML do OFX não
    distingue tag vazia de tag ausente."""
    linha_memo = f"\n<MEMO>{memo}" if memo is not None else ""
    return f"""<STMTTRN>
<TRNTYPE>{trntype}
<DTPOSTED>{posted}
<TRNAMT>{amount}
<FITID>{fitid}{linha_memo}
</STMTTRN>"""


def account_statement(transactions=(), bankid="9999", acctid="1234567890"):
    """Extrato de conta corrente (BANKMSGSRSV1/STMTRS) com as transações dadas."""
    return f"""{HEADER}
<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20260930220000[-03:EST]
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>{bankid}
<ACCTID>{acctid}
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260901100000[-03:EST]
<DTEND>20260930220000[-03:EST]
{"".join(transactions)}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1000.00
<DTASOF>20260930220000[-03:EST]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
""".encode()


def card_statement():
    """Fatura de cartão (CREDITCARDMSGSRSV1/CCSTMTRS) — fora do escopo, deve ser recusada."""
    return f"""{HEADER}
<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20260930220000[-03:EST]
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<CCSTMTRS>
<CURDEF>BRL
<CCACCTFROM>
<ACCTID>4444333322221111
</CCACCTFROM>
<BANKTRANLIST>
<DTSTART>20260901100000[-03:EST]
<DTEND>20260930220000[-03:EST]
{transaction()}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>-500.00
<DTASOF>20260930220000[-03:EST]
</LEDGERBAL>
</CCSTMTRS>
</CCSTMTTRNRS>
</CREDITCARDMSGSRSV1>
</OFX>
""".encode()


def test_debito_vira_gasto_com_valor_positivo():
    (entry,) = parse_statement(account_statement([transaction(amount="-42.50")]))

    assert entry.type == "gasto"
    assert entry.amount == Decimal("42.50")


def test_credito_vira_entrada():
    (entry,) = parse_statement(
        account_statement([transaction(trntype="CREDIT", amount="1500.00", memo="SALARIO")])
    )

    assert entry.type == "entrada"
    assert entry.amount == Decimal("1500.00")
    assert entry.description == "SALARIO"


def test_valor_e_decimal_nunca_float():
    (entry,) = parse_statement(account_statement([transaction(amount="-0.10")]))

    assert isinstance(entry.amount, Decimal)
    # 0.10 em float não é 0.10; se o parser passar por float, esta soma falha.
    assert entry.amount * 3 == Decimal("0.30")


def test_data_usa_o_fuso_local_e_nao_utc():
    """22:00 de 30/09 em -03:00 é 01:00 de 01/10 em UTC. O lançamento é de setembro."""
    (entry,) = parse_statement(
        account_statement([transaction(posted="20260930220000[-03:EST]")])
    )

    assert entry.date.isoformat() == "2026-09-30"


def test_data_no_comeco_do_dia_nao_recua():
    (entry,) = parse_statement(
        account_statement([transaction(posted="20260901010000[-03:EST]")])
    )

    assert entry.date.isoformat() == "2026-09-01"


def test_import_id_combina_banco_conta_e_fitid():
    (entry,) = parse_statement(
        account_statement([transaction(fitid="XYZ9")], bankid="0341", acctid="2939936478")
    )

    assert entry.import_id == "0341:2939936478:XYZ9"


def test_mesmo_fitid_em_contas_diferentes_nao_colide():
    (uma,) = parse_statement(account_statement([transaction(fitid="1")], acctid="111"))
    (outra,) = parse_statement(account_statement([transaction(fitid="1")], acctid="222"))

    assert uma.import_id != outra.import_id


def test_preserva_a_ordem_do_arquivo():
    entries = parse_statement(
        account_statement(
            [
                transaction(fitid="A", memo="PRIMEIRA"),
                transaction(fitid="B", memo="SEGUNDA"),
                transaction(fitid="C", memo="TERCEIRA"),
            ]
        )
    )

    assert [e.description for e in entries] == ["PRIMEIRA", "SEGUNDA", "TERCEIRA"]


def test_lancamento_de_valor_zero_e_ignorado():
    entries = parse_statement(
        account_statement([transaction(amount="0.00"), transaction(fitid="B")])
    )

    assert [e.import_id for e in entries] == ["9999:1234567890:B"]


def test_descricao_e_truncada_no_limite_da_coluna():
    """O padrão permite MEMO de até 255 caracteres; a coluna aceita 200."""
    (entry,) = parse_statement(account_statement([transaction(memo="X" * 255)]))

    assert len(entry.description) == 200


def test_lancamento_sem_memo_ganha_descricao_padrao():
    (entry,) = parse_statement(account_statement([transaction(memo=None)]))

    assert entry.description == "Lançamento importado"


def test_extrato_sem_transacoes_devolve_lista_vazia():
    assert parse_statement(account_statement([])) == []


def test_fatura_de_cartao_e_recusada_explicando_o_motivo():
    with pytest.raises(OFXError, match="fatura de cartão"):
        parse_statement(card_statement())


def test_arquivo_que_nao_e_ofx_e_recusado():
    with pytest.raises(OFXError, match="OFX"):
        parse_statement(b"isto aqui e um PDF, nao um extrato")


def test_arquivo_vazio_e_recusado():
    with pytest.raises(OFXError):
        parse_statement(b"")
