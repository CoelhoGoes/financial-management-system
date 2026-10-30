import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TrendChart } from './TrendChart'

vi.mock('@/data/api', () => ({ api: { trend: vi.fn() } }))
const { api } = await import('@/data/api')

const mes = (month: string, cash: string, invoice: string, saldo: string) => ({
  month,
  monthly_income: '5000.00',
  extra_income: '0',
  cash_expenses: cash,
  invoice,
  total_spent: '0',
  month_balance: saldo,
  available_balance: saldo,
})

describe('TrendChart', () => {
  beforeEach(() => {
    vi.mocked(api.trend).mockResolvedValue([
      mes('2026-07', '800.00', '200.00', '4000.00'),
      mes('2026-08', '1200.00', '400.00', '3400.00'),
      mes('2026-09', '400.00', '100.00', '4500.00'),
    ])
  })

  it('pede 6 meses por padrão e repassa o `until` que recebeu', async () => {
    render(<TrendChart until="2026-09" />)
    await waitFor(() => expect(api.trend).toHaveBeenCalled())
    const [months, until] = vi.mocked(api.trend).mock.calls[0]
    expect(months).toBe(6)
    // o servidor não deve adivinhar o mês: quem manda é a tela — ver docs/dominio.md
    expect(until).toBe('2026-09')
  })

  // UC2
  it('refaz a busca ao trocar o período no seletor', async () => {
    const user = userEvent.setup()
    render(<TrendChart until="2026-09" />)
    await waitFor(() => expect(api.trend).toHaveBeenCalledTimes(1))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Período' }), '12')
    await waitFor(() => expect(vi.mocked(api.trend).mock.calls[1][0]).toBe(12))
  })

  // UC2, F6: o seletor tem nome acessível e mostra o período ativo, 6 por padrão
  it('o seletor "Período" começa em 6 meses e oferece 3, 6 e 12', async () => {
    render(<TrendChart until="2026-09" />)
    const seletor = screen.getByRole('combobox', { name: 'Período' })
    expect(seletor).toHaveValue('6')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      '3 meses',
      '6 meses',
      '12 meses',
    ])
    await waitFor(() => expect(api.trend).toHaveBeenCalled())
  })

  // F4
  it('mostra "Carregando…" enquanto a primeira resposta não chega, com o seletor já visível', async () => {
    vi.mocked(api.trend).mockReturnValue(new Promise(() => {}))
    render(<TrendChart until="2026-09" />)
    expect(screen.getByText('Carregando…')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Período' })).toHaveValue('6')
  })

  // F3: a resposta do período anterior, chegando por último, não pode valer
  it('ignora a resposta do período anterior que chega depois da troca', async () => {
    const user = userEvent.setup()
    let falharPrimeira: (e: Error) => void = () => {}
    vi.mocked(api.trend)
      .mockReturnValueOnce(new Promise((_, reject) => (falharPrimeira = reject)))
      .mockResolvedValueOnce([mes('2026-09', '400.00', '100.00', '4500.00')])
    render(<TrendChart until="2026-09" />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Período' }), '3')
    await waitFor(() => expect(api.trend).toHaveBeenCalledTimes(2))
    falharPrimeira(new Error('resposta velha'))
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText('resposta velha')).not.toBeInTheDocument()
  })

  it('mostra o erro quando a busca falha', async () => {
    vi.mocked(api.trend).mockRejectedValue(new Error('Sessão expirada.'))
    render(<TrendChart until="2026-09" />)
    expect(await screen.findByText('Sessão expirada.')).toBeInTheDocument()
    // F2: dá para tentar outro período
    expect(screen.getByRole('combobox', { name: 'Período' })).toBeEnabled()
  })
})
