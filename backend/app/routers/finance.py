from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_session
from ..models import Entry, User
from ..schemas import EntryCreate, EntryOut, Invoice, Summary
from ..security import current_user
from ..service import calculate_invoice, calculate_summary, month_key, shift_month

router = APIRouter(tags=["finance"])

MONTH = r"^\d{4}-(0[1-9]|1[0-2])$"


def _all(session: Session, user: User) -> list[Entry]:
    return list(session.scalars(select(Entry).where(Entry.user_id == user.id)))


@router.post("/entries", response_model=EntryOut, status_code=201)
def create(
    data: EntryCreate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    if data.type == "entrada" and data.method == "credito":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Entrada não vai no crédito.")

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
    end = until or month_key(date.today())
    entries = _all(session, user)
    return [calculate_summary(shift_month(end, -i), user, entries) for i in range(months - 1, -1, -1)]
