import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/lib/auth-context'
import { SummaryScreen } from './SummaryScreen'

vi.mock('../../api.js', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    summary: vi.fn(),
    categories: vi.fn(),
    trend: vi.fn(),
    logout: vi.fn(),
  },
}))

const { api } = await import('../../api.js')

const resumo = (monthly_income: string) => ({
  month: '2026-09',
  monthly_income,
  extra_income: '0',
  cash_expenses: '0',
  invoice: '0',
  total_spent: '0',
  available_balance: monthly_income,
})

function montar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SummaryScreen />
      </AuthProvider>
    </MemoryRouter>,
  )
}

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

  it('mostra a categoria com percentual e o número da parcela', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    vi.mocked(api.categories).mockResolvedValue([
      {
        category: 'Lazer',
        total: '400.00',
        share: '1',
        items: [{ description: 'Televisão', amount: '400.00', installment: 3, total_installments: 9 }],
      },
    ])
    montar()
    expect(await screen.findByText('Lazer')).toBeInTheDocument()
    expect(screen.getByText('100,0%')).toBeInTheDocument()
    expect(screen.getByText(/Televisão \(parcela 3\/9\)/)).toBeInTheDocument()
  })
})
