import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/state/auth-context'
import { currentMonth, shiftMonth } from '@/shared/format'
import { SummaryScreen } from './SummaryScreen'

vi.mock('@/data/api', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    summary: vi.fn(),
    categories: vi.fn(),
    trend: vi.fn(),
    logout: vi.fn(),
  },
}))

const { api } = await import('@/data/api')

const resumo = (monthly_income: string) => ({
  month: '2026-09',
  monthly_income,
  extra_income: '0',
  cash_expenses: '0',
  invoice: '0',
  total_spent: '0',
  available_balance: monthly_income,
})

const LAZER = {
  category: 'Lazer',
  total: '400.00',
  share: '1',
  items: [{ description: 'Televisão', amount: '400.00', installment: 3, total_installments: 9 }],
}

function montar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SummaryScreen />
      </AuthProvider>
    </MemoryRouter>,
  )
}

// UC7/F7: a grade do desktop vem do CSS; a ordem no HTML (celular, Tab, leitor de tela) não muda
const vemAntes = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('SummaryScreen', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue({ id: 1, email: 'a@b.co', monthly_income: '0', closing_day: 10 })
    vi.mocked(api.categories).mockResolvedValue([])
    vi.mocked(api.trend).mockResolvedValue([])
  })

  it('avisa quando a renda mensal é zero', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('0'))
    montar()
    expect(await screen.findByText(/renda mensal ainda não foi informada/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /informar renda mensal/i })).toBeInTheDocument()
  })

  it('não avisa quando a renda já foi informada', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    montar()
    expect(await screen.findByText(/Resumo — 2026-09/)).toBeInTheDocument()
    expect(screen.queryByText(/renda mensal ainda não foi informada/i)).not.toBeInTheDocument()
  })

  it('mostra os valores no formato brasileiro', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    montar()
    // sem gasto nenhum, o saldo disponível é igual à renda — o valor aparece nos dois lugares
    expect(await screen.findAllByText('R$ 6.500,00')).toHaveLength(2)
    expect(screen.queryByText('R$ 6500.00')).not.toBeInTheDocument()
  })

  it('abre no mês corrente', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    montar()
    await waitFor(() => expect(api.summary).toHaveBeenCalledWith(currentMonth()))
    expect(api.categories).toHaveBeenCalledWith(currentMonth())
  })

  it('refaz resumo e categorias ao navegar para outro mês', async () => {
    const user = userEvent.setup()
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    montar()
    await screen.findByText(/Resumo —/)

    const anterior = shiftMonth(currentMonth(), -1)
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() => expect(api.summary).toHaveBeenCalledWith(anterior))
    expect(api.categories).toHaveBeenCalledWith(anterior)
  })

  it('a legenda mostra só nome e percentual da categoria, sem os itens', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    vi.mocked(api.categories).mockResolvedValue([LAZER])
    montar()
    const legenda = await screen.findByRole('button', { name: /Lazer/ })
    expect(legenda).toHaveTextContent('100,0%')
    expect(screen.queryByText(/Televisão/)).not.toBeInTheDocument()
  })

  it('passando de cinco categorias, as menores viram "Outras", que abre todas no popup', async () => {
    const user = userEvent.setup()
    const categoria = (category: string, total: string, share: string) => ({
      category,
      total,
      share,
      items: [{ description: `item de ${category}`, amount: total, installment: null, total_installments: null }],
    })
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    vi.mocked(api.categories).mockResolvedValue([
      categoria('Moradia', '700.00', '0.35'),
      categoria('Mercado', '500.00', '0.25'),
      categoria('Transporte', '300.00', '0.15'),
      categoria('Lazer', '200.00', '0.10'),
      categoria('Saúde', '150.00', '0.075'),
      categoria('Contas', '100.00', '0.05'),
      categoria('Educação', '50.00', '0.025'),
    ])
    montar()

    const outras = await screen.findByRole('button', { name: /Outras/ })
    expect(outras).toHaveTextContent('2 categorias')
    expect(screen.queryByRole('button', { name: /Contas/ })).not.toBeInTheDocument()

    await user.click(outras)
    const popup = await screen.findByRole('dialog', { name: 'Outras' })
    expect(popup).toHaveTextContent('As 2 categorias de menor gasto no mês')
    expect(within(popup).getByRole('heading', { name: /Contas/ })).toHaveTextContent(
      'R$ 100,00 · 5,0% do gasto do mês',
    )
    expect(within(popup).getByRole('heading', { name: /Educação/ })).toBeInTheDocument()
    expect(popup).toHaveTextContent('item de Educação')
  })

  it('clicar na categoria abre o popup com o total e as transações', async () => {
    const user = userEvent.setup()
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    vi.mocked(api.categories).mockResolvedValue([LAZER])
    montar()

    await user.click(await screen.findByRole('button', { name: /Lazer/ }))
    const popup = await screen.findByRole('dialog', { name: 'Lazer' })
    expect(popup).toHaveTextContent('R$ 400,00 · 100,0% do gasto do mês')
    expect(within(popup).getByText(/Televisão/).closest('li')).toHaveTextContent(
      'Televisão (parcela 3/9)R$ 400,00',
    )

    await user.click(within(popup).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // o foco volta para a categoria, para quem navega por teclado não recomeçar do topo
    await waitFor(() => expect(screen.getByRole('button', { name: /Lazer/ })).toHaveFocus())
  })

  it('o título da aba é o nome da tela', async () => {
    montar()
    await waitFor(() => expect(document.title).toBe('Resumo'))
  })

  it('mantém a ordem resumo → categorias → tendência', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    montar()
    const resumoTitulo = await screen.findByText(/^Resumo —/)
    const categorias = await screen.findByText('Por categoria')
    const tendencia = screen.getByText('Tendência')
    expect(vemAntes(resumoTitulo, categorias)).toBe(true)
    expect(vemAntes(categorias, tendencia)).toBe(true)
  })
})
