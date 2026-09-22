import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/lib/auth-context'
import { LoginScreen } from './LoginScreen'

vi.mock('../../api.js', () => ({
  api: {
    isAuthenticated: () => false,
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}))
const { api } = await import('../../api.js')

const USUARIO = { id: 1, email: 'a@b.co', monthly_income: '0', closing_day: 25 }

function montar() {
  return render(
    <AuthProvider>
      <LoginScreen />
    </AuthProvider>,
  )
}

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.mocked(api.login).mockResolvedValue(undefined)
    vi.mocked(api.register).mockResolvedValue(USUARIO)
    vi.mocked(api.me).mockResolvedValue(USUARIO)
  })

  it('entra com e-mail e senha', async () => {
    const user = userEvent.setup()
    montar()

    await user.type(screen.getByLabelText('E-mail'), 'a@b.co')
    await user.type(screen.getByLabelText('Senha'), 'senha12345')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(api.login).toHaveBeenCalledWith('a@b.co', 'senha12345')
    expect(api.register).not.toHaveBeenCalled()
  })

  it('alterna para cadastro e chama register em vez de login', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: 'Não tem conta? Cadastre-se' }))
    // o CardTitle do shadcn é uma div, não um heading — por isso a busca é por texto
    expect(screen.getByText('Criar conta')).toBeInTheDocument()

    await user.type(screen.getByLabelText('E-mail'), 'novo@b.co')
    await user.type(screen.getByLabelText('Senha'), 'senha12345')
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(api.register).toHaveBeenCalledWith('novo@b.co', 'senha12345')
    expect(api.login).toHaveBeenCalledWith('novo@b.co', 'senha12345')
  })

  it('exige senha de 8 caracteres só no cadastro', async () => {
    const user = userEvent.setup()
    montar()

    expect(screen.getByLabelText('Senha')).not.toHaveAttribute('minlength')
    await user.click(screen.getByRole('button', { name: 'Não tem conta? Cadastre-se' }))
    expect(screen.getByLabelText('Senha')).toHaveAttribute('minlength', '8')
  })

  it('mostra o erro vindo do servidor e deixa tentar de novo', async () => {
    const user = userEvent.setup()
    vi.mocked(api.login).mockRejectedValue(new Error('E-mail ou senha não conferem.'))
    montar()

    await user.type(screen.getByLabelText('E-mail'), 'a@b.co')
    await user.type(screen.getByLabelText('Senha'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha não conferem.')).toBeInTheDocument()
    // o botão volta a ficar disponível — a falha não trava a tela
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  it('não envia sem preencher os campos obrigatórios', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(api.login).not.toHaveBeenCalled()
  })
})
