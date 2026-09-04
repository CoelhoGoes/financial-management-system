import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from '@/lib/auth-context'
import { LoginScreen } from '@/pages/LoginScreen'
import { SummaryScreen } from '@/pages/SummaryScreen'
import { EntryScreen } from '@/pages/EntryScreen'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
        Carregando...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginScreen />} />
      <Route path="/" element={user ? <SummaryScreen /> : <Navigate to="/login" replace />} />
      <Route
        path="/lancamentos"
        element={user ? <EntryScreen /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  )
}

export default App
