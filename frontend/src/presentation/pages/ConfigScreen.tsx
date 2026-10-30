import { useEffect, useState, type FormEvent } from 'react'
import { RiDeleteBinLine } from '@remixicon/react'
import { api } from '@/data/api'
import { currentMonth, formatCurrency, formatMonthShort } from '@/shared/format'
import type { Income } from '@/shared/types'
import { useAuth } from '@/state/auth-context'
import { getTheme, setTheme, type Theme } from '@/state/theme'
import { Button } from '@/presentation/components/ui/button'
import { Input } from '@/presentation/components/ui/input'
import { Label } from '@/presentation/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/presentation/components/ui/toggle-group'
import { Page } from '@/presentation/components/Page'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
]

export function ConfigScreen() {
  const { user, updateUser, deleteAccount } = useAuth()
  // Sem valor inventado: os defaults reais vivem em models.py e chegam pelo /auth/me.
  // A rota só renderiza com `user` carregado, então na prática estes campos vêm cheios.
  const [closingDay, setClosingDay] = useState(user ? String(user.closing_day) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [theme, setThemeState] = useState(getTheme)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [incomes, setIncomes] = useState<Income[] | null>(null)
  const [incomeAmount, setIncomeAmount] = useState('')
  // o mês atual, para toda conta: num aumento, o padrão não reescreve meses passados
  const [incomeMonth, setIncomeMonth] = useState(currentMonth)
  const [savingIncome, setSavingIncome] = useState(false)
  const [incomeError, setIncomeError] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    api
      .incomes()
      .then((data) => ativo && setIncomes(data))
      .catch((e: Error) => ativo && setIncomeError(e.message))
    return () => {
      ativo = false
    }
  }, [])

  function chooseTheme(next: Theme) {
    setTheme(next)
    setThemeState(next)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await api.saveConfig(Number(closingDay))
      updateUser(updated)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu para salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveIncome(event: FormEvent) {
    event.preventDefault()
    setSavingIncome(true)
    setIncomeError(null)
    try {
      const saved = await api.saveIncome(incomeMonth, incomeAmount)
      // o servidor substitui a do mesmo mês (F6); a lista faz o mesmo e segue em ordem de mês
      setIncomes((list) =>
        [...(list ?? []).filter((i) => i.month !== saved.month), saved].sort((a, b) =>
          a.month.localeCompare(b.month),
        ),
      )
      setIncomeAmount('')
    } catch (e) {
      setIncomeError(e instanceof Error ? e.message : 'Não deu para salvar a renda.')
    } finally {
      setSavingIncome(false)
    }
  }

  async function onRemoveIncome(month: string) {
    setIncomeError(null)
    try {
      await api.removeIncome(month)
      setIncomes((list) => list?.filter((i) => i.month !== month) ?? null)
    } catch (e) {
      setIncomeError(e instanceof Error ? e.message : 'Não deu para apagar a renda.')
    }
  }

  async function onDelete(event: FormEvent) {
    event.preventDefault()
    setDeleting(true)
    setDeleteError(null)
    try {
      // deu certo: o AuthProvider zera o usuário e o App manda para o login
      await deleteAccount(deletePassword)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Não deu para excluir a conta.')
      setDeleting(false)
    }
  }

  return (
    // no desktop: renda e dados à esquerda, aparência e excluir conta empilhados à direita
    <Page active="configuracoes" className="md:grid md:grid-cols-2 md:items-start">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Renda mensal</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={onSaveIncome} className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">
                Valor fixo que você ganha por mês. Não é um lançamento — entra no saldo de cada mês
                a partir do mês escolhido, até a próxima renda registrada.
              </p>
              {/* um campo por linha: lado a lado, o mês por extenso ("outubro de 2026") não cabe */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="income-amount">Valor</Label>
                  <Input
                    id="income-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="income-month">A partir de</Label>
                  <Input
                    id="income-month"
                    type="month"
                    value={incomeMonth}
                    onChange={(e) => setIncomeMonth(e.target.value)}
                    required
                  />
                </div>
              </div>
              {incomeError && <p className="text-sm text-destructive">{incomeError}</p>}
              <Button type="submit" disabled={savingIncome}>
                {savingIncome ? 'Salvando...' : 'Salvar renda'}
              </Button>
            </form>

            {incomes && incomes.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma renda registrada.</p>
            )}
            {incomes && incomes.length > 0 && (
              <ul aria-label="Rendas registradas" className="flex flex-col divide-y border-t">
                {incomes.map((income) => (
                  <li key={income.month} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="text-muted-foreground">
                      A partir de {formatMonthShort(income.month)}
                    </span>
                    <span className="ml-auto tabular-nums">R$ {formatCurrency(income.amount)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Apagar renda a partir de ${formatMonthShort(income.month)}`}
                      title="Apagar"
                      onClick={() => onRemoveIncome(income.month)}
                    >
                      <RiDeleteBinLine />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="closing-day">Dia de fechamento da fatura</Label>
                <Input
                  id="closing-day"
                  type="number"
                  min="1"
                  max="28"
                  step="1"
                  value={closingDay}
                  onChange={(e) => setClosingDay(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  De 1 a 28. Compras feitas antes desse dia entram na fatura do mês seguinte; a
                  partir dele, pulam para a fatura seguinte.
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {saved && !error && (
                <p className="text-sm text-muted-foreground">Configurações salvas.</p>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            <Label id="theme-label">Tema</Label>
            <ToggleGroup
              aria-labelledby="theme-label"
              variant="outline"
              spacing={0}
              value={[theme]}
              // clicar no já escolhido devolve []: o tema nunca fica sem valor
              onValueChange={(v) => v[0] && chooseTheme(v[0] as Theme)}
            >
              {THEMES.map((t) => (
                <ToggleGroupItem key={t.value} value={t.value}>
                  {t.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              Vale só para este aparelho. "Sistema" acompanha o modo claro ou escuro do aparelho.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Excluir conta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onDelete} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                A conta deixa de funcionar na hora e você sai do app. Seus lançamentos não
                aparecem mais em lugar nenhum, e o e-mail fica livre para um cadastro novo, que
                começa vazio.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="delete-password">Confirme com sua senha</Label>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                />
              </div>
              {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
              <Button type="submit" variant="destructive" disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir minha conta'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
