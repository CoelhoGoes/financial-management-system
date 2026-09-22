import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { ConfigScreen } from './ConfigScreen'

vi.mock('../../api.js', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    saveConfig: vi.fn(),
    logout: vi.fn(),
  },
}))
const { api } = await import('../../api.js')

const USUARIO = { id: 1, email: 'a@b.co', monthly_income: '6500.00', closing_day: 15 }

// O App.tsx só monta esta tela com `user` já carregado; o formulário lê os valores
// iniciais uma vez, no useState. O teste espelha esse mesmo portão.
function SomenteComUsuario() {
  const { user } = useAuth()
  return user ? <ConfigScreen /> : null
}

function montar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SomenteComUsuario />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ConfigScreen', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue(USUARIO)
    vi.mocked(api.saveConfig).mockResolvedValue(USUARIO)
  })

  it('começa com os valores atuais do usuário, não com um padrão inventado', async () => {
    montar()
    await waitFor(() => expect(screen.getByLabelText('Renda mensal')).toHaveValue(6500))
    expect(screen.getByLabelText('Dia de fechamento da fatura')).toHaveValue(15)
  })

  it('salva os dois campos e confirma na tela', async () => {
    const user = userEvent.setup()
    montar()
    await waitFor(() => expect(screen.getByLabelText('Renda mensal')).toHaveValue(6500))

    const renda = screen.getByLabelText('Renda mensal')
    await user.clear(renda)
    await user.type(renda, '7200')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(api.saveConfig).toHaveBeenCalledWith('7200', 15))
    expect(await screen.findByText('Configurações salvas.')).toBeInTheDocument()
  })

  it('manda o dia de fechamento como número, não como texto', async () => {
    const user = userEvent.setup()
    montar()
    await waitFor(() => expect(screen.getByLabelText('Renda mensal')).toHaveValue(6500))

    const dia = screen.getByLabelText('Dia de fechamento da fatura')
    await user.clear(dia)
    await user.type(dia, '5')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(api.saveConfig).toHaveBeenCalled())
    const [, diaEnviado] = vi.mocked(api.saveConfig).mock.calls[0]
    expect(diaEnviado).toBe(5)
    expect(typeof diaEnviado).toBe('number')
  })

  it('limita o dia de fechamento a 1–28, como o backend', async () => {
    montar()
    await waitFor(() => expect(screen.getByLabelText('Renda mensal')).toHaveValue(6500))
    const dia = screen.getByLabelText('Dia de fechamento da fatura')
    expect(dia).toHaveAttribute('min', '1')
    expect(dia).toHaveAttribute('max', '28')
    expect(screen.getByLabelText('Renda mensal')).toHaveAttribute('min', '0')
  })

  it('mostra o erro quando o servidor recusa', async () => {
    const user = userEvent.setup()
    vi.mocked(api.saveConfig).mockRejectedValue(new Error('Sessão expirada.'))
    montar()
    await waitFor(() => expect(screen.getByLabelText('Renda mensal')).toHaveValue(6500))

    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Sessão expirada.')).toBeInTheDocument()
    expect(screen.queryByText('Configurações salvas.')).not.toBeInTheDocument()
  })
})
