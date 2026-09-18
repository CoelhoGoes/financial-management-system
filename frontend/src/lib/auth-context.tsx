import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../../api.js'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  /** Aplica o usuário devolvido por um PUT /auth/me, sem refazer o GET. */
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!api.isAuthenticated()) {
      setLoading(false)
      return
    }
    api
      .me()
      .then((data: User) => setUser(data))
      .catch(() => api.logout())
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    setError(null)
    try {
      await api.login(email, password)
      const data = (await api.me()) as User
      setUser(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu para entrar.')
      throw e
    }
  }

  async function register(email: string, password: string) {
    setError(null)
    try {
      await api.register(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu para cadastrar.')
      throw e
    }
    await login(email, password)
  }

  function logout() {
    api.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, register, logout, updateUser: setUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth precisa estar dentro de um AuthProvider')
  }
  return context
}
