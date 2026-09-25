"""Leitura de extrato bancário em OFX.

Puro: recebe os bytes do arquivo e devolve lançamentos propostos. Não abre sessão de
banco, não grava nada e não escolhe categoria — quem importa revisa antes de gravar.

Escopo deliberado: **extrato de conta**, nunca fatura de cartão. A fatura é calculada
pelo app a partir dos lançamentos no crédito (ver `service.py`); importá-la contaria o
mesmo gasto duas vezes. Arquivo de cartão é recusado com mensagem explicando isso.
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING
from zoneinfo import ZoneInfo

from ofxtools.models import CCSTMTRS, STMTRS
from ofxtools.Parser import OFXTree

if TYPE_CHECKING:
    from ofxtools.models import STMTTRN

# O OFX declara o fuso em que o banco emitiu o extrato (`[-03:EST]`), mas o ofxtools
# normaliza tudo para UTC e descarta o offset. Uma compra de 30/09 22:00 vira
# 01/10 01:00 UTC e, reduzida para data, cairia no mês seguinte — deslocando fatura e
# resumo. O dia que importa é o do calendário de quem gastou, então convertemos para o
# fuso local antes do `.date()`.
LOCAL_TZ = ZoneInfo("America/Sao_Paulo")

# Mesmo limite de Entry.description; truncar aqui evita estourar a coluna na gravação.
MAX_DESCRIPTION = 200


class OFXError(ValueError):
    """Arquivo ilegível ou fora do escopo. A mensagem é exibida ao usuário."""


@dataclass(frozen=True)
class ImportedEntry:
    """Lançamento proposto por uma importação, antes de virar `Entry`.

    Sem `category` (quem importa escolhe na revisão) e sem `method`/`installments`:
    extrato de conta é sempre à vista, em parcela única.
    """

    type: str  # gasto | entrada
    amount: Decimal  # sempre positivo; o sinal virou `type`
    description: str
    date: date
    import_id: str  # BANKID:ACCTID:FITID — o FITID é único só dentro da conta


def parse_statement(content: bytes) -> list[ImportedEntry]:
    """Lê um extrato OFX e devolve os lançamentos propostos, na ordem do arquivo."""
    tree = OFXTree()
    try:
        tree.parse(io.BytesIO(content))
        document = tree.convert()
    except Exception as exc:  # o ofxtools levanta um zoológico de erros por arquivo torto
        raise OFXError(
            "Não foi possível ler este arquivo como OFX. Baixe o extrato de novo pelo "
            "app do banco, no formato OFX."
        ) from exc

    statements = document.statements or []
    accounts = [s for s in statements if isinstance(s, STMTRS)]
    if not accounts:
        if any(isinstance(s, CCSTMTRS) for s in statements):
            raise OFXError(
                "Este arquivo é uma fatura de cartão, não um extrato de conta. A fatura "
                "já é calculada aqui a partir dos lançamentos no crédito — importá-la "
                "contaria o mesmo gasto duas vezes."
            )
        raise OFXError("Este arquivo não contém nenhum extrato de conta.")

    entries: list[ImportedEntry] = []
    for statement in accounts:
        # O FITID é único por conta, não globalmente: sem o prefixo, duas contas com a
        # mesma numeração de transação colidiriam na deduplicação.
        prefix = f"{statement.account.bankid}:{statement.account.acctid}"
        for transaction in statement.transactions or []:
            amount = transaction.trnamt
            if not amount:
                # Valor zero não é gasto nem entrada — normalmente é estorno já casado.
                continue
            entries.append(
                ImportedEntry(
                    # O sinal de TRNAMT é que manda, não TRNTYPE: o tipo é descritivo
                    # (POS, XFER, PAYMENT…) e varia demais entre bancos para confiar.
                    type="gasto" if amount < 0 else "entrada",
                    amount=abs(amount),
                    description=_describe(transaction),
                    date=transaction.dtposted.astimezone(LOCAL_TZ).date(),
                    import_id=f"{prefix}:{transaction.fitid}",
                )
            )
    return entries


def _describe(transaction: STMTTRN) -> str:
    """MEMO é onde Itaú e Nubank põem o texto; NAME é o fallback do padrão."""
    text = (transaction.memo or transaction.name or "").strip()
    return text[:MAX_DESCRIPTION] or "Lançamento importado"
