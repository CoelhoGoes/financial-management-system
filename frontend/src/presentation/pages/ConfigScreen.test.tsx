import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '@/state/auth-context'
import { currentMonth } from '@/shared/format'
import { ConfigScreen } from './ConfigScreen'

vi.mock('@/data/api', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    saveConfig: vi.fn(),
    incomes: vi.fn(),
    saveIncome: vi.fn(),
    removeIncome: vi.fn(),
    deleteAccount: vi.fn(),
    logout: vi.fn(),
  },
}))
const { api } = await import('@/data/api')

const USUARIO = { id: 1, email: 'a@b.co', closing_day: 15 }
const RENDAS = [
  { month: '2026-03', amount: '4000.00' },
  { month: '2026-09', amount: '5000.00' },
]

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

// UC7/F7: a grade do desktop vem do CSS; a ordem no HTML (celular, Tab, leitor de tela) não muda
const vemAntes = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('ConfigScreen', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue(USUARIO)
    vi.mocked(api.saveConfig).mockResolvedValue(USUARIO)
    vi.mocked(api.incomes).mockResolvedValue(RENDAS)
  })

  it('começa com o dia de fechamento atual do usuário, não com um padrão inventado', async () => {
    montar()
    await waitFor(() => expect(screen.getByLabelText('Dia de fechamento da fatura')).toHaveValue(15))
  })

  it('salva o dia de fechamento como número e confirma na tela', async () => {
    const user = userEvent.setup()
    montar()
    const dia = await screen.findByLabelText('Dia de fechamento da fatura')
    await user.clear(dia)
    await user.type(dia, '5')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(api.saveConfig).toHaveBeenCalledWith(5))
    expect(await screen.findByText('Configurações salvas.')).toBeInTheDocument()
  })

  it('limita o dia de fechamento a 1–28 e a renda a ≥ 0, como o backend', async () => {
    montar()
    const dia = await screen.findByLabelText('Dia de fechamento da fatura')
    expect(dia).toHaveAttribute('min', '1')
    expect(dia).toHaveAttribute('max', '28')
    expect(screen.getByLabelText('Valor')).toHaveAttribute('min', '0')
  })

  it('mostra o erro quando o servidor recusa a configuração', async () => {
    const user = userEvent.setup()
    vi.mocked(api.saveConfig).mockRejectedValue(new Error('Sessão expirada.'))
    montar()
    await user.click(await screen.findByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Sessão expirada.')).toBeInTheDocument()
    expect(screen.queryByText('Configurações salvas.')).not.toBeInTheDocument()
  })

  describe('a renda mensal', () => {
    const linhas = async () =>
      within(await screen.findByRole('list', { name: 'Rendas registradas' }))
        .getAllByRole('listitem')
        .map((li) => li.textContent)

    it('lista as rendas registradas em ordem de mês', async () => {
      montar()
      expect(await linhas()).toEqual([
        expect.stringMatching(/mar\/26.*R\$ 4\.000,00/),
        expect.stringMatching(/set\/26.*R\$ 5\.000,00/),
      ])
    })

    // UC5
    it('"a partir de" começa no mês atual e a renda salva entra na lista', async () => {
      const user = userEvent.setup()
      vi.mocked(api.saveIncome).mockResolvedValue({ month: '2026-06', amount: '4500.00' })
      montar()
      expect(await screen.findByLabelText('A partir de')).toHaveValue(currentMonth())

      await user.type(screen.getByLabelText('Valor'), '4500')
      const mes = screen.getByLabelText('A partir de')
      await user.clear(mes)
      await user.type(mes, '2026-06')
      await user.click(screen.getByRole('button', { name: 'Salvar renda' }))

      await waitFor(() => expect(api.saveIncome).toHaveBeenCalledWith('2026-06', '4500'))
      expect(await linhas()).toEqual([
        expect.stringMatching(/mar\/26/),
        expect.stringMatching(/jun\/26.*R\$ 4\.500,00/),
        expect.stringMatching(/set\/26/),
      ])
    })

    // F6: o servidor substitui a do mesmo mês; a lista não fica com duas
    it('salvar de novo no mesmo mês substitui a linha', async () => {
      const user = userEvent.setup()
      vi.mocked(api.saveIncome).mockResolvedValue({ month: '2026-09', amount: '5500.00' })
      montar()
      await screen.findByRole('list', { name: 'Rendas registradas' })
      await user.type(screen.getByLabelText('Valor'), '5500')
      const mes = screen.getByLabelText('A partir de')
      await user.clear(mes)
      await user.type(mes, '2026-09')
      await user.click(screen.getByRole('button', { name: 'Salvar renda' }))

      await waitFor(() =>
        expect(screen.getByText('R$ 5.500,00')).toBeInTheDocument(),
      )
      expect(await linhas()).toHaveLength(2)
    })

    // UC5b
    it('apaga uma renda pelo botão da linha', async () => {
      const user = userEvent.setup()
      vi.mocked(api.removeIncome).mockResolvedValue(null)
      montar()
      await user.click(await screen.findByRole('button', { name: 'Apagar renda a partir de set/26' }))
      await waitFor(() => expect(api.removeIncome).toHaveBeenCalledWith('2026-09'))
      expect(await linhas()).toEqual([expect.stringMatching(/mar\/26/)])
    })

    it('sem renda registrada, diz isso em vez de uma lista vazia', async () => {
      vi.mocked(api.incomes).mockResolvedValue([])
      montar()
      expect(await screen.findByText('Nenhuma renda registrada.')).toBeInTheDocument()
    })

    // F5, F8, F9: o que o servidor recusa (mês ou valor inválido, sessão, rede) aparece no card
    it('mostra o erro do servidor e mantém a lista como estava', async () => {
      const user = userEvent.setup()
      vi.mocked(api.saveIncome).mockRejectedValue(new Error('Mês inválido.'))
      montar()
      await screen.findByRole('list', { name: 'Rendas registradas' })
      await user.type(screen.getByLabelText('Valor'), '100')
      await user.click(screen.getByRole('button', { name: 'Salvar renda' }))
      expect(await screen.findByText('Mês inválido.')).toBeInTheDocument()
      expect(await linhas()).toHaveLength(2)
    })

    it('mostra o erro quando a lista não carrega', async () => {
      vi.mocked(api.incomes).mockRejectedValue(new Error('Não deu para completar a operação.'))
      montar()
      expect(await screen.findByText('Não deu para completar a operação.')).toBeInTheDocument()
    })
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

  it('o título da aba é o nome da tela', async () => {
    montar()
    await waitFor(() => expect(document.title).toBe('Configurações'))
  })

  it('mantém a ordem renda → dados → aparência → excluir conta', async () => {
    montar()
    const renda = await screen.findByText('Renda mensal')
    const dados = screen.getByLabelText('Dia de fechamento da fatura')
    expect(vemAntes(renda, dados)).toBe(true)
    const aparencia = screen.getByText('Aparência')
    const excluir = screen.getByText('Excluir conta')
    expect(vemAntes(dados, aparencia)).toBe(true)
    expect(vemAntes(aparencia, excluir)).toBe(true)
  })
})
