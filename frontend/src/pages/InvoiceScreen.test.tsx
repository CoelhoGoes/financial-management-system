import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/lib/auth-context'
import { currentMonth, shiftMonth } from '@/lib/format'
import { InvoiceScreen } from './InvoiceScreen'

vi.mock('../../api.js', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    invoice: vi.fn(),
    logout: vi.fn(),
  },
}))
const { api } = await import('../../api.js')

const PARCELA = {
  entry_id: 1, description: 'Televisão', category: 'Lazer',
  purchase_date: '2026-08-04', installment: 3, total_installments: 9,
  installment_amount: '400.00',
}
const vazia = (month: string) => ({ month, total: '0', items: [] })
const comItens = (month: string) => ({
  month, total: '1400.00',
  items: [
    PARCELA,
    { ...PARCELA, entry_id: 2, description: 'Notebook', category: 'Educação',
      purchase_date: '2026-07-06', installment: 2, total_installments: 12,
      installment_amount: '1000.00' },
  ],
})

function montar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <InvoiceScreen />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('InvoiceScreen', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue({ id: 1, email: 'a@b.co', monthly_income: '0', closing_day: 10 })
    vi.mocked(api.invoice).mockResolvedValue(comItens(currentMonth()))
  })

  it('abre no mês corrente', async () => {
    montar()
    await waitFor(() => expect(api.invoice).toHaveBeenCalledWith(currentMonth()))
    expect(screen.getByText(`Fatura — ${currentMonth()}`)).toBeInTheDocument()
  })

  it('mostra cada parcela com descrição, categoria, data e o X/Y', async () => {
    montar()
    const linha = (await screen.findByText('Televisão')).closest('tr')!
    expect(within(linha).getByText('Lazer')).toBeInTheDocument()
    expect(within(linha).getByText('2026-08-04')).toBeInTheDocument()
    expect(within(linha).getByText('3/9')).toBeInTheDocument()
    expect(within(linha).getByText('R$ 400,00')).toBeInTheDocument()
  })

  it('mostra o total no formato brasileiro', async () => {
    montar()
    expect(await screen.findByText('R$ 1.400,00')).toBeInTheDocument()
  })

  it('anda para o mês anterior e para o seguinte', async () => {
    const user = userEvent.setup()
    montar()
    await screen.findByText('Televisão')

    const atual = currentMonth()
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() => expect(api.invoice).toHaveBeenCalledWith(shiftMonth(atual, -1)))
    expect(screen.getByText(`Fatura — ${shiftMonth(atual, -1)}`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await waitFor(() => expect(api.invoice).toHaveBeenCalledWith(shiftMonth(atual, 1)))
  })

  it('avisa quando o mês não tem parcela, em vez de mostrar tabela vazia', async () => {
    vi.mocked(api.invoice).mockResolvedValue(vazia(currentMonth()))
    montar()
    expect(await screen.findByText('Nenhuma parcela nesta fatura.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('mostra o erro quando a busca falha', async () => {
    vi.mocked(api.invoice).mockRejectedValue(new Error('Sessão expirada.'))
    montar()
    expect(await screen.findByText('Sessão expirada.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
