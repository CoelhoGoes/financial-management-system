from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "usuarios"
    # e-mail único só entre contas ativas: uma conta excluída libera o e-mail para recadastro
    __table_args__ = (
        Index(
            "uq_usuarios_email_ativo",
            "email",
            unique=True,
            postgresql_where=text("excluido_em IS NULL"),
            sqlite_where=text("excluido_em IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column("senha_hash", String(255))
    closing_day: Mapped[int] = mapped_column("dia_fechamento", Integer, default=25)
    created_at: Mapped[datetime] = mapped_column(
        "criado_em", DateTime(timezone=True), server_default=func.now()
    )
    # Exclusão lógica: preenchida, a conta some para a API, mas usuário e lançamentos ficam
    # no banco. Desfazer é só por SQL (ver docs/dominio.md).
    deleted_at: Mapped[datetime | None] = mapped_column(
        "excluido_em", DateTime(timezone=True), nullable=True, default=None
    )

    entries: Mapped[list["Entry"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    incomes: Mapped[list["Income"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Income(Base):
    """Renda mensal a partir de um mês. Vale até o mês anterior à próxima renda registrada."""

    __tablename__ = "rendas"
    __table_args__ = (UniqueConstraint("usuario_id", "mes", name="uq_renda_mes"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        "usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    # sempre o dia 1: a renda vale por mês, o dia não carrega significado
    month: Mapped[date] = mapped_column("mes", Date)
    amount: Mapped[float] = mapped_column("valor", Numeric(12, 2))

    user: Mapped["User"] = relationship(back_populates="incomes")


class Entry(Base):
    __tablename__ = "lancamentos"
    # reimportar o mesmo extrato não pode duplicar; nulos não conflitam no Postgres
    __table_args__ = (UniqueConstraint("usuario_id", "id_importacao", name="uq_lancamento_importacao"),)

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
    # Origem quando veio de importação: "BANKID:ACCTID:FITID" do OFX. O FITID é único
    # por conta, não globalmente, por isso o prefixo. Nulo em lançamento digitado.
    import_id: Mapped[str | None] = mapped_column(
        "id_importacao", String(120), nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        "criado_em", DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="entries")
