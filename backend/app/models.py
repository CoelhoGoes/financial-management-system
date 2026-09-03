from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column("senha_hash", String(255))
    monthly_income: Mapped[float] = mapped_column("renda_mensal", Numeric(12, 2), default=0)
    closing_day: Mapped[int] = mapped_column("dia_fechamento", Integer, default=25)
    created_at: Mapped[datetime] = mapped_column(
        "criado_em", DateTime(timezone=True), server_default=func.now()
    )

    entries: Mapped[list["Entry"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Entry(Base):
    __tablename__ = "lancamentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        "usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )

    type: Mapped[str] = mapped_column("tipo", String(10))          # gasto | entrada
    amount: Mapped[float] = mapped_column("valor", Numeric(12, 2))
    description: Mapped[str] = mapped_column("descricao", String(200))
    category: Mapped[str] = mapped_column("categoria", String(50))
    date: Mapped[date] = mapped_column("data", Date, index=True)
    method: Mapped[str] = mapped_column("forma", String(10), default="avista")  # avista | credito
    installments: Mapped[int] = mapped_column("parcelas", Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(
        "criado_em", DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="entries")
