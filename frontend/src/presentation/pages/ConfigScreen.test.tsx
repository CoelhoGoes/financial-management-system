import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '@/state/auth-context'
import { ConfigScreen } from './ConfigScreen'

vi.mock('@/data/api', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    saveConfig: vi.fn(),
    deleteAccount: vi.fn(),
    logout: vi.fn(),
  },
}))
const { api } = await import('@/data/api')

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

  describe('o tema', () => {
    // o jsdom não tem matchMedia: aqui o sistema está sempre em modo escuro
    beforeEach(() => {
      localStorage.clear()
      document.documentElement.classList.remove('dark')
      vi.stubGlobal('matchMedia', () => ({ matches: true }))
    })

    const botao = (nome: string) => screen.getByRole('button', { name: nome })

    it('começa em "Sistema" quando nada foi escolhido', async () => {
      montar()
      await waitFor(() => expect(botao('Sistema')).toHaveAttribute('aria-pressed', 'true'))
    })

    it('a escolha manual vale na hora e fica salva no aparelho', async () => {
      const user = userEvent.setup()
      montar()
      await user.click(await screen.findByRole('button', { name: 'Claro' }))
      expect(document.documentElement).not.toHaveClass('dark')
      expect(localStorage.getItem('gf:theme')).toBe('light')

      await user.click(botao('Escuro'))
      expect(document.documentElement).toHaveClass('dark')
      expect(localStorage.getItem('gf:theme')).toBe('dark')
    })

    it('"Sistema" apaga a escolha e volta a seguir o aparelho', async () => {
      const user = userEvent.setup()
      localStorage.setItem('gf:theme', 'light')
      montar()
      await user.click(await screen.findByRole('button', { name: 'Sistema' }))
      expect(localStorage.getItem('gf:theme')).toBeNull()
      expect(document.documentElement).toHaveClass('dark')
    })

    it('clicar de novo no tema escolhido não o desmarca', async () => {
      const user = userEvent.setup()
      montar()
      await user.click(await screen.findByRole('button', { name: 'Sistema' }))
      expect(botao('Sistema')).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('excluir a conta', () => {
    const excluir = () => screen.getByRole('button', { name: 'Excluir minha conta' })

    it('manda a senha digitada e sai do app', async () => {
      const user = userEvent.setup()
      vi.mocked(api.deleteAccount).mockResolvedValue(null)
      montar()
      await user.type(await screen.findByLabelText('Confirme com sua senha'), 'senha12345')
      await user.click(excluir())

      expect(api.deleteAccount).toHaveBeenCalledWith('senha12345')
      // sem usuário, o portão do teste (como o App) desmonta a tela
      await waitFor(() => expect(screen.queryByText('Excluir conta')).not.toBeInTheDocument())
      expect(api.logout).toHaveBeenCalled()
    })

    it('senha errada mostra o erro e continua logado', async () => {
      const user = userEvent.setup()
      vi.mocked(api.deleteAccount).mockRejectedValue(new Error('Senha não confere.'))
      montar()
      await user.type(await screen.findByLabelText('Confirme com sua senha'), 'errada')
      await user.click(excluir())

      expect(await screen.findByText('Senha não confere.')).toBeInTheDocument()
      expect(excluir()).toBeEnabled()
      expect(api.logout).not.toHaveBeenCalled()
    })

    it('não envia sem senha', async () => {
      const user = userEvent.setup()
      montar()
      await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }))
      expect(api.deleteAccount).not.toHaveBeenCalled()
    })
  })
})
