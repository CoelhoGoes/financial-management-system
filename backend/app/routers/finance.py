from dataclasses import asdict
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_session
from ..models import Entry, User
from ..ofx import OFXError, parse_statement
from ..schemas import (
    CategoryBreakdown,
    EntryCreate,
    EntryImport,
    EntryOut,
    ImportPreviewItem,
    ImportResult,
    Invoice,
    Summary,
)
from ..security import current_user
from ..service import (
    calculate_category_breakdown,
    calculate_invoice,
    calculate_summary,
    month_key,
    shift_month,
)

router = APIRouter(tags=["finance"])

MONTH = r"^\d{4}-(0[1-9]|1[0-2])$"

# Um extrato OFX de um mês tem alguns KB. O limite existe para que um upload grande não
# vire memória do processo antes de qualquer validação, não porque 2 MB seja apertado.
MAX_UPLOAD_BYTES = 2 * 1024 * 1024


def _all(session: Session, user: User) -> list[Entry]:
    return list(session.scalars(select(Entry).where(Entry.user_id == user.id)))


def _reject_income_on_credit(data: EntryCreate) -> None:
    """Invariante de domínio. Vive aqui, e não em cada endpoint, porque toda rota que
    cria lançamento precisa dele — inclusive a importação."""
    if data.type == "entrada" and data.method == "credito":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Entrada não vai no crédito.")


def _known_import_ids(session: Session, user: User, ids: list[str]) -> set[str]:
    """Quais desses `import_id` este usuário já importou antes."""
    if not ids:
        return set()
    return set(
        session.scalars(
            select(Entry.import_id).where(Entry.user_id == user.id, Entry.import_id.in_(ids))
        )
    )


@router.post("/entries", response_model=EntryOut, status_code=201)
def create(
    data: EntryCreate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    _reject_income_on_credit(data)

    entry = Entry(user_id=user.id, **data.model_dump())
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.get("/entries", response_model=list[EntryOut])
def list_entries(
    month: str | None = Query(None, pattern=MONTH),
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    query = select(Entry).where(Entry.user_id == user.id)
    if month:
        year, m = map(int, month.split("-"))
        start = date(year, m, 1)
        end = date(year + (m == 12), (m % 12) + 1, 1)
        query = query.where(Entry.date >= start, Entry.date < end)
    return list(session.scalars(query.order_by(Entry.date.desc(), Entry.id.desc())))


@router.delete("/entries/{entry_id}", status_code=204)
def remove(
    entry_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    entry = session.get(Entry, entry_id)
    if not entry or entry.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lançamento não encontrado.")
    session.delete(entry)
    session.commit()


@router.get("/summary/{month}", response_model=Summary)
def summary(
    month: str,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    return calculate_summary(month, user, _all(session, user))


@router.get("/summary/{month}/categories", response_model=list[CategoryBreakdown])
def category_breakdown(
    month: str,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    return calculate_category_breakdown(month, user, _all(session, user))


@router.get("/invoices/{month}", response_model=Invoice)
def invoice(
    month: str,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    return calculate_invoice(month, _all(session, user), user.closing_day)


@router.get("/trend", response_model=list[Summary])
def trend(
    months: int = Query(6, ge=1, le=24),
    until: str | None = Query(None, pattern=MONTH),
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    # UTC is declared rather than inherited from the container's clock: the fallback
    # must not change meaning if a deployment happens to set TZ. Clients that care
    # about their own region send `until` instead of relying on this.
    end = until or month_key(datetime.now(UTC).date())
    entries = _all(session, user)
    return [calculate_summary(shift_month(end, -i), user, entries) for i in range(months - 1, -1, -1)]


@router.post("/imports/preview", response_model=list[ImportPreviewItem])
def preview_import(
    file: UploadFile,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """Lê o extrato e devolve o que ele contém. Não grava nada."""
    # Um byte a mais que o limite já é recusa; assim o arquivo inteiro nunca é carregado
    # só para descobrir que era grande demais.
    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"Arquivo maior que {MAX_UPLOAD_BYTES // 1024 // 1024} MB. Um extrato OFX não "
            "chega perto disso — confira se o arquivo é o certo.",
        )

    try:
        lines = parse_statement(content)
    except OFXError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    known = _known_import_ids(session, user, [line.import_id for line in lines])
    return [
        ImportPreviewItem(**asdict(line), already_imported=line.import_id in known)
        for line in lines
    ]


@router.post("/imports", response_model=ImportResult, status_code=201)
def confirm_import(
    data: list[EntryImport],
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """Grava as linhas revisadas, pulando o que já existe."""
    known = _known_import_ids(session, user, [item.import_id for item in data])

    created: list[Entry] = []
    seen: set[str] = set()
    for item in data:
        _reject_income_on_credit(item)
        # `seen` cobre o duplicado dentro do próprio lote; `known`, o de importação
        # anterior. Sem os dois, a restrição única estoura como erro 500.
        if item.import_id in known or item.import_id in seen:
            continue
        seen.add(item.import_id)
        entry = Entry(user_id=user.id, **item.model_dump())
        session.add(entry)
        created.append(entry)

    session.commit()
    for entry in created:
        session.refresh(entry)
    return ImportResult(created=created, skipped=len(data) - len(created))
