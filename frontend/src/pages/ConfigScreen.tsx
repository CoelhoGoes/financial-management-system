import { useState, type FormEvent } from 'react'
import { api } from '../../api.js'
import { useAuth } from '@/lib/auth-context'
import type { User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/Header'

export function ConfigScreen() {
  const { user, updateUser } = useAuth()
  // Sem valor inventado: os defaults reais vivem em models.py e chegam pelo /auth/me.
  // A rota só renderiza com `user` carregado, então na prática estes campos vêm cheios.
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthly_income ?? '')
  const [closingDay, setClosingDay] = useState(user ? String(user.closing_day) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = (await api.saveConfig(monthlyIncome, Number(closingDay))) as User
      updateUser(updated)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu para salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-background p-6">
      <Header active="configuracoes" className="max-w-md" />

      <Card className="w-full max-w-md">
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
    </div>
  )
}
