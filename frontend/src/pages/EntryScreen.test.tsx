import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/lib/auth-context'
import { EntryScreen } from './EntryScreen'

vi.mock('../../api.js', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    entries: vi.fn(),
    summary: vi.fn(),
    createEntry: vi.fn(),
    removeEntry: vi.fn(),
    logout: vi.fn(),
  },
}))
const { api } = await import('../../api.js')

const RESUMO = {
  month: '2026-09', monthly_income: '5000.00', extra_income: '0', cash_expenses: '0',
  invoice: '0', total_spent: '0', available_balance: '4000.00',
}
const LANCAMENTO = {
  id: 1, description: 'feira', amount: '150.50', type: 'gasto',
  category: 'Mercado', method: 'avista', date: '2026-09-05', installments: 1,
}

function montar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <EntryScreen />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('EntryScreen', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue({ id: 1, email: 'a@b.co', monthly_income: '5000.00', closing_day: 10 })
    vi.mocked(api.entries).mockResolvedValue([LANCAMENTO])
    vi.mocked(api.summary).mockResolvedValue(RESUMO)
    vi.mocked(api.createEntry).mockResolvedValue(LANCAMENTO)
    vi.mocked(api.removeEntry).mockResolvedValue(null)
  })

  describe('o payload enviado', () => {
    it('manda gasto à vista com uma parcela', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')

      await user.type(screen.getByLabelText('Descrição'), 'pão')
      await user.selectOptions(screen.getByLabelText('Categoria'), 'Mercado')
      await user.type(screen.getByLabelText('Valor'), '12.50')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(api.createEntry).toHaveBeenCalled())
      // o input é type=number, então "12.50" chega como "12.5" — o backend aceita,
      // porque decimal_places=2 é teto e não exigência
      expect(vi.mocked(api.createEntry).mock.calls[0][0]).toMatchObject({
        type: 'gasto', method: 'avista', installments: 1, amount: '12.5', category: 'Mercado',
      })
    })

    it('força entrada para à vista e uma parcela, mesmo se o crédito tiver sido escolhido antes', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')

      // escolhe crédito parcelado como gasto...
      await user.click(screen.getByRole('button', { name: 'Crédito' }))
      await user.clear(screen.getByLabelText('Parcelas'))
      await user.type(screen.getByLabelText('Parcelas'), '6')
      // ...e depois troca para entrada
      await user.click(screen.getByRole('button', { name: 'Entrada' }))

      await user.type(screen.getByLabelText('Descrição'), 'freela')
      await user.selectOptions(screen.getByLabelText('Categoria'), 'Freela')
      await user.type(screen.getByLabelText('Valor'), '900')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(api.createEntry).toHaveBeenCalled())
      // o invariante do CLAUDE.md: entrada nunca vai no crédito
      expect(vi.mocked(api.createEntry).mock.calls[0][0]).toMatchObject({
        type: 'entrada', method: 'avista', installments: 1,
      })
    })

    it('manda o número de parcelas quando é gasto no crédito', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')

      await user.type(screen.getByLabelText('Descrição'), 'TV')
      await user.selectOptions(screen.getByLabelText('Categoria'), 'Lazer')
      await user.type(screen.getByLabelText('Valor'), '3600')
      await user.click(screen.getByRole('button', { name: 'Crédito' }))
      await user.clear(screen.getByLabelText('Parcelas'))
      await user.type(screen.getByLabelText('Parcelas'), '9')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(api.createEntry).toHaveBeenCalled())
      expect(vi.mocked(api.createEntry).mock.calls[0][0]).toMatchObject({
        type: 'gasto', method: 'credito', installments: 9,
      })
    })
  })

  describe('o formulário', () => {
    it('troca a lista de categorias junto com o tipo', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')

      const categoria = screen.getByLabelText('Categoria')
      expect(within(categoria).queryByRole('option', { name: 'Mercado' })).toBeInTheDocument()
      expect(within(categoria).queryByRole('option', { name: 'Salário' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Entrada' }))
      expect(within(categoria).queryByRole('option', { name: 'Salário' })).toBeInTheDocument()
      expect(within(categoria).queryByRole('option', { name: 'Mercado' })).not.toBeInTheDocument()
    })

    it('esconde as parcelas fora do crédito', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')

      expect(screen.queryByLabelText('Parcelas')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Crédito' }))
      expect(screen.getByLabelText('Parcelas')).toBeInTheDocument()
    })

    it('limpa os campos e recarrega a lista depois de salvar', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')
      expect(api.entries).toHaveBeenCalledTimes(1)

      await user.type(screen.getByLabelText('Descrição'), 'pão')
      await user.selectOptions(screen.getByLabelText('Categoria'), 'Mercado')
      await user.type(screen.getByLabelText('Valor'), '12.50')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(api.entries).toHaveBeenCalledTimes(2))
      expect(screen.getByLabelText('Descrição')).toHaveValue('')
      expect(screen.getByLabelText('Valor')).toHaveValue(null)
    })

    it('mostra o erro do servidor sem limpar o que foi digitado', async () => {
      const user = userEvent.setup()
      vi.mocked(api.createEntry).mockRejectedValue(new Error('Entrada não vai no crédito.'))
      montar()
      await screen.findByText('feira')

      await user.type(screen.getByLabelText('Descrição'), 'pão')
      await user.selectOptions(screen.getByLabelText('Categoria'), 'Mercado')
      await user.type(screen.getByLabelText('Valor'), '12.50')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(await screen.findByText('Entrada não vai no crédito.')).toBeInTheDocument()
      expect(screen.getByLabelText('Descrição')).toHaveValue('pão')
    })
  })

  describe('a exclusão', () => {
    it('exige dois cliques: o primeiro só pede confirmação', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')

      await user.click(screen.getByRole('button', { name: 'Excluir' }))
      expect(api.removeEntry).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Confirmar?' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Confirmar?' }))
      await waitFor(() => expect(api.removeEntry).toHaveBeenCalledWith(1))
    })

    it('recarrega a lista depois de excluir', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')

      await user.click(screen.getByRole('button', { name: 'Excluir' }))
      await user.click(screen.getByRole('button', { name: 'Confirmar?' }))
      await waitFor(() => expect(api.entries).toHaveBeenCalledTimes(2))
    })
  })

  it('mostra o saldo disponível vindo do resumo', async () => {
    montar()
    expect(await screen.findByText('R$ 4.000,00')).toBeInTheDocument()
  })
})
