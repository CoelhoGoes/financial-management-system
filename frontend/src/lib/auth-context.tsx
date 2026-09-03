import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../../api.js'
import type { Usuario } from '../types'

interface AuthContextValue {
  usuario: Usuario | null
  carregando: boolean
  erro: string | null
  entrar: (email: string, senha: string) => Promise<void>
  registrar: (email: string, senha: string) => Promise<void>
  sair: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!api.autenticado()) {
      setCarregando(false)
      return
    }
    api
      .eu()
      .then((dados: Usuario) => setUsuario(dados))
      .catch(() => api.sair())
      .finally(() => setCarregando(false))
  }, [])

  async function entrar(email: string, senha: string) {
    setErro(null)
    try {
      await api.entrar(email, senha)
      const dados = (await api.eu()) as Usuario
      setUsuario(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para entrar.')
      throw e
    }
  }

  async function registrar(email: string, senha: string) {
    setErro(null)
    try {
      await api.registrar(email, senha)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para cadastrar.')
      throw e
    }
    await entrar(email, senha)
  }

  function sair() {
    api.sair()
    setUsuario(null)
  }

  return (
    <AuthContext.Provider
      value={{ usuario, carregando, erro, entrar, registrar, sair }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuth precisa estar dentro de um AuthProvider')
  }
  return contexto
}
