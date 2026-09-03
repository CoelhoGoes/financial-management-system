import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api.js'
import { useAuth } from './lib/auth-context'
import type { Summary } from './types'

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
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6"
      >
        <h1 className="text-xl font-medium text-foreground">
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h1>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-md border border-input bg-background px-3 py-2 text-foreground"
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === 'register' ? 8 : undefined}
          className="rounded-md border border-input bg-background px-3 py-2 text-foreground"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting
            ? 'Enviando...'
            : mode === 'login'
              ? 'Entrar'
              : 'Cadastrar'}
        </button>
        <button
          type="button"
          onClick={() =>
            setMode((m) => (m === 'login' ? 'register' : 'login'))
          }
          className="text-sm text-muted-foreground underline"
        >
          {mode === 'login'
            ? 'Não tem conta? Cadastre-se'
            : 'Já tem conta? Entrar'}
        </button>
      </form>
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
        <button
          type="button"
          onClick={logout}
          className="rounded-md border border-border px-3 py-1 text-sm text-foreground"
        >
          Sair
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary && (
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-foreground">
          <h1 className="mb-4 text-xl font-medium">Resumo — {summary.month}</h1>
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
        </div>
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
