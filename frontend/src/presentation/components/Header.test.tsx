import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/state/auth-context'
import { Header } from './Header'

vi.mock('@/data/api', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    logout: vi.fn(),
  },
}))
const { api } = await import('@/data/api')

function Rota() {
  return <p data-testid="rota">{useLocation().pathname}</p>
}

function montar(active: Parameters<typeof Header>[0]['active'] = 'resumo') {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Header active={active} />
        <Routes>
          <Route path="*" element={<Rota />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Header', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue({ id: 1, email: 'a@b.co', monthly_income: '0', closing_day: 10 })
  })

  // UC6: as quatro abas ficam sempre na barra, inclusive a da tela aberta
  it('mostra todas as abas e marca só a ativa', () => {
    montar('fatura')
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(nav).toBeInTheDocument()

    for (const nome of ['Resumo', 'Lançamentos', 'Importar']) {
      expect(screen.getByRole('button', { name: nome })).not.toHaveAttribute('aria-current')
    }
    expect(screen.getByRole('button', { name: 'Fatura' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Configurações' })).not.toHaveAttribute('aria-current')
  })

  it('a engrenagem é a aba ativa em Configurações', () => {
    montar('configuracoes')
    expect(screen.getByRole('button', { name: 'Configurações' })).toHaveAttribute('aria-current', 'page')
  })

  it('cada aba leva à sua rota', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: 'Lançamentos' }))
    expect(screen.getByTestId('rota')).toHaveTextContent('/lancamentos')
    await user.click(screen.getByRole('button', { name: 'Fatura' }))
    expect(screen.getByTestId('rota')).toHaveTextContent('/fatura')
    await user.click(screen.getByRole('button', { name: 'Importar' }))
    expect(screen.getByTestId('rota')).toHaveTextContent('/importar')
    await user.click(screen.getByRole('button', { name: 'Configurações' }))
    expect(screen.getByTestId('rota')).toHaveTextContent('/configuracoes')
    await user.click(screen.getByRole('button', { name: 'Resumo' }))
    expect(screen.getByTestId('rota')).toHaveTextContent(/^\/$/)
  })

  it('mostra o e-mail de quem está logado', async () => {
    montar()
    await waitFor(() => expect(screen.getByText('a@b.co')).toBeInTheDocument())
  })

  it('Sair encerra a sessão e vai para o login', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: 'Sair' }))
    expect(api.logout).toHaveBeenCalled()
    expect(screen.getByTestId('rota')).toHaveTextContent('/login')
  })
})
