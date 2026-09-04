import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api.js'
import { useAuth } from './lib/auth-context'
import type { Summary } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function currentMonth() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${today.getFullYear()}-${month}`
}

function formatCurrency(value: string) {
  return Number(value).toFixed(2)
}

function LoginScreen() {
  const { login, register, error } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch {
      // erro já fica exposto via useAuth().error
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <form onSubmit={onSubmit}>
          <CardHeader>
            <CardTitle>{mode === 'login' ? 'Entrar' : 'Criar conta'}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 8 : undefined}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting
                ? 'Enviando...'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Cadastrar'}
            </Button>
            <Button
              type="button"
              variant="link"
              className="px-0"
              onClick={() =>
                setMode((m) => (m === 'login' ? 'register' : 'login'))
              }
            >
              {mode === 'login'
                ? 'Não tem conta? Cadastre-se'
                : 'Já tem conta? Entrar'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

function SummaryScreen() {
  const { user, logout } = useAuth()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .summary(currentMonth())
      .then((data: Summary) => setSummary(data))
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-background p-6">
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-foreground">{user?.email}</p>
        <Button type="button" variant="outline" size="sm" onClick={logout}>
          Sair
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary && (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Resumo — {summary.month}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Renda mensal</dt>
                <dd>R$ {formatCurrency(summary.monthly_income)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Gasto total</dt>
                <dd>R$ {formatCurrency(summary.total_spent)}</dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>Saldo disponível</dt>
                <dd>R$ {formatCurrency(summary.available_balance)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
        Carregando...
      </div>
    )
  }

  return user ? <SummaryScreen /> : <LoginScreen />
}

export default App
