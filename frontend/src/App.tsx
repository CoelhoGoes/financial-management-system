import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from '@/state/auth-context'
import { LoginScreen } from '@/presentation/pages/LoginScreen'
import { SummaryScreen } from '@/presentation/pages/SummaryScreen'
import { EntryScreen } from '@/presentation/pages/EntryScreen'
import { InvoiceScreen } from '@/presentation/pages/InvoiceScreen'
import { ImportScreen } from '@/presentation/pages/ImportScreen'
import { ConfigScreen } from '@/presentation/pages/ConfigScreen'

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
      <Route
        path="/fatura"
        element={user ? <InvoiceScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/importar"
        element={user ? <ImportScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/configuracoes"
        element={user ? <ConfigScreen /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  )
}

export default App
