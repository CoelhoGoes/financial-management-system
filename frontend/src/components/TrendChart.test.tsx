import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TrendChart } from './TrendChart'

vi.mock('../../api.js', () => ({ api: { trend: vi.fn() } }))
const { api } = await import('../../api.js')

const mes = (month: string, cash: string, invoice: string, saldo: string) => ({
  month,
  monthly_income: '5000.00',
  extra_income: '0',
  cash_expenses: cash,
  invoice,
  total_spent: '0',
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

  it('refaz a busca ao trocar de preset', async () => {
    const { rerender } = render(<TrendChart until="2026-09" />)
    await waitFor(() => expect(api.trend).toHaveBeenCalledTimes(1))
    screen.getByRole('button', { name: '12 meses' }).click()
    rerender(<TrendChart until="2026-09" />)
    await waitFor(() => expect(vi.mocked(api.trend).mock.calls[1][0]).toBe(12))
  })

  it('marca qual preset está ativo', async () => {
    render(<TrendChart until="2026-09" />)
    await waitFor(() => expect(api.trend).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: '6 meses' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '3 meses' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('mostra o erro quando a busca falha', async () => {
    vi.mocked(api.trend).mockRejectedValue(new Error('Sessão expirada.'))
    render(<TrendChart until="2026-09" />)
    expect(await screen.findByText('Sessão expirada.')).toBeInTheDocument()
  })
})
