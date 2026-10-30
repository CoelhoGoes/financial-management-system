import { useState, type FormEvent } from 'react'
import { api } from '@/data/api'
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
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthly_income ?? '')
  const [closingDay, setClosingDay] = useState(user ? String(user.closing_day) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [theme, setThemeState] = useState(getTheme)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
      const updated = await api.saveConfig(monthlyIncome, Number(closingDay))
      updateUser(updated)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu para salvar.')
    } finally {
      setSaving(false)
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
    // no desktop: dados à esquerda, aparência e excluir conta empilhados à direita
    <Page active="configuracoes" className="md:grid md:grid-cols-2 md:items-start">
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monthly-income">Renda mensal</Label>
              <Input
                id="monthly-income"
                type="number"
                step="0.01"
                min="0"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Valor fixo que você ganha por mês. Não é um lançamento — entra automaticamente
                no saldo de todo mês.
              </p>
            </div>

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
