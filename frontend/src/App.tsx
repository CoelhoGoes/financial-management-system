import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api.js'
import { useAuth } from './lib/auth-context'
import type { Resumo } from './types'

function mesAtual() {
  const hoje = new Date()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  return `${hoje.getFullYear()}-${mes}`
}

function formatarMoeda(valor: string) {
  return Number(valor).toFixed(2)
}

function TelaLogin() {
  const { entrar, registrar, erro } = useAuth()
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    try {
      if (modo === 'entrar') {
        await entrar(email, senha)
      } else {
        await registrar(email, senha)
      }
    } catch {
      // erro já fica exposto via useAuth().erro
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <form
        onSubmit={aoEnviar}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6"
      >
        <h1 className="text-xl font-medium text-foreground">
          {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
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
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={modo === 'cadastrar' ? 8 : undefined}
          className="rounded-md border border-input bg-background px-3 py-2 text-foreground"
        />
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-50"
        >
          {enviando
            ? 'Enviando...'
            : modo === 'entrar'
              ? 'Entrar'
              : 'Cadastrar'}
        </button>
        <button
          type="button"
          onClick={() =>
            setModo((m) => (m === 'entrar' ? 'cadastrar' : 'entrar'))
          }
          className="text-sm text-muted-foreground underline"
        >
          {modo === 'entrar'
            ? 'Não tem conta? Cadastre-se'
            : 'Já tem conta? Entrar'}
        </button>
      </form>
    </div>
  )
}

function TelaResumo() {
  const { usuario, sair } = useAuth()
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api
      .resumo(mesAtual())
      .then((dados: Resumo) => setResumo(dados))
      .catch((e: Error) => setErro(e.message))
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-background p-6">
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-foreground">{usuario?.email}</p>
        <button
          type="button"
          onClick={sair}
          className="rounded-md border border-border px-3 py-1 text-sm text-foreground"
        >
          Sair
        </button>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {resumo && (
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-foreground">
          <h1 className="mb-4 text-xl font-medium">Resumo — {resumo.mes}</h1>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Renda mensal</dt>
              <dd>R$ {formatarMoeda(resumo.renda_mensal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Gasto total</dt>
              <dd>R$ {formatarMoeda(resumo.gasto_total)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Saldo disponível</dt>
              <dd>R$ {formatarMoeda(resumo.saldo_disponivel)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}

function App() {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
        Carregando...
      </div>
    )
  }

  return usuario ? <TelaResumo /> : <TelaLogin />
}

export default App
