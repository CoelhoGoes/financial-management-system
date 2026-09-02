from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    renda_mensal: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    dia_fechamento: Mapped[int] = mapped_column(Integer, default=25)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lancamentos: Mapped[list["Lancamento"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )


class Lancamento(Base):
    __tablename__ = "lancamentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)

    tipo: Mapped[str] = mapped_column(String(10))          # gasto | entrada
    valor: Mapped[float] = mapped_column(Numeric(12, 2))
    descricao: Mapped[str] = mapped_column(String(200))
    categoria: Mapped[str] = mapped_column(String(50))
    data: Mapped[date] = mapped_column(Date, index=True)
    forma: Mapped[str] = mapped_column(String(10), default="avista")  # avista | credito
    parcelas: Mapped[int] = mapped_column(Integer, default=1)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    usuario: Mapped["Usuario"] = relationship(back_populates="lancamentos")
