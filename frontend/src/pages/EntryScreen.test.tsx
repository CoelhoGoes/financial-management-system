import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/lib/auth-context'
import { currentMonth, shiftMonth } from '@/lib/format'
import { EntryScreen } from './EntryScreen'

vi.mock('../../api.js', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    entries: vi.fn(),
    summary: vi.fn(),
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
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
    vi.mocked(api.updateEntry).mockReset()
    vi.mocked(api.updateEntry).mockResolvedValue(LANCAMENTO)
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

  describe('a edição', () => {
    it('o lápis carrega o lançamento no formulário', async () => {
      const user = userEvent.setup()
      montar()

      await user.click(await screen.findByRole('button', { name: 'Editar feira' }))

      expect(screen.getByText('Editar lançamento')).toBeInTheDocument()
      expect(screen.getByLabelText('Descrição')).toHaveValue('feira')
      expect(screen.getByLabelText('Categoria')).toHaveValue('Mercado')
      expect(screen.getByLabelText('Valor')).toHaveValue(150.5)
      expect(screen.getByLabelText('Data')).toHaveValue('2026-09-05')
      expect(screen.getByLabelText('Descrição')).toHaveFocus()
    })

    it('salvar em edição altera o lançamento em vez de criar outro', async () => {
      const user = userEvent.setup()
      montar()

      await user.click(await screen.findByRole('button', { name: 'Editar feira' }))
      await user.selectOptions(screen.getByLabelText('Categoria'), 'Lazer')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(api.updateEntry).toHaveBeenCalled())
      expect(api.createEntry).not.toHaveBeenCalled()
      const [id, payload] = vi.mocked(api.updateEntry).mock.calls[0]
      expect(id).toBe(1)
      expect(payload).toMatchObject({ description: 'feira', category: 'Lazer', amount: '150.50' })
    })

    it('depois de salvar volta a ser o formulário de lançamento novo', async () => {
      const user = userEvent.setup()
      montar()

      await user.click(await screen.findByRole('button', { name: 'Editar feira' }))
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(await screen.findByText('Novo lançamento')).toBeInTheDocument()
      expect(screen.getByLabelText('Descrição')).toHaveValue('')
      expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    })

    it('cancelar descarta a edição sem chamar a API', async () => {
      const user = userEvent.setup()
      montar()

      await user.click(await screen.findByRole('button', { name: 'Editar feira' }))
      await user.clear(screen.getByLabelText('Descrição'))
      await user.type(screen.getByLabelText('Descrição'), 'mudei de ideia')
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.getByText('Novo lançamento')).toBeInTheDocument()
      expect(screen.getByLabelText('Descrição')).toHaveValue('')
      expect(api.updateEntry).not.toHaveBeenCalled()
    })

    it('erro do servidor mantém a edição aberta com o que foi digitado', async () => {
      const user = userEvent.setup()
      vi.mocked(api.updateEntry).mockRejectedValue(new Error('Entrada não vai no crédito.'))
      montar()

      await user.click(await screen.findByRole('button', { name: 'Editar feira' }))
      await user.selectOptions(screen.getByLabelText('Categoria'), 'Lazer')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(await screen.findByText('Entrada não vai no crédito.')).toBeInTheDocument()
      expect(screen.getByText('Editar lançamento')).toBeInTheDocument()
      expect(screen.getByLabelText('Categoria')).toHaveValue('Lazer')
    })

    it('excluir o lançamento que está em edição fecha a edição', async () => {
      const user = userEvent.setup()
      montar()

      await user.click(await screen.findByRole('button', { name: 'Editar feira' }))
      await user.click(screen.getByRole('button', { name: 'Excluir' }))
      await user.click(screen.getByRole('button', { name: 'Confirmar?' }))

      expect(await screen.findByText('Novo lançamento')).toBeInTheDocument()
      expect(screen.getByLabelText('Descrição')).toHaveValue('')
    })
  })

  describe('a navegação entre meses', () => {
    const anterior = shiftMonth(currentMonth(), -1)
    const DO_MES_ANTERIOR = { ...LANCAMENTO, id: 2, description: 'aluguel de setembro' }

    it('abre no mês corrente', async () => {
      montar()

      await waitFor(() => expect(api.entries).toHaveBeenCalledWith(currentMonth()))
      expect(api.summary).toHaveBeenCalledWith(currentMonth())
      expect(screen.getByText(`Lançamentos — ${currentMonth()}`)).toBeInTheDocument()
    })

    it('refaz lista e saldo ao ir para o mês anterior', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')
      vi.mocked(api.entries).mockResolvedValue([DO_MES_ANTERIOR])

      await user.click(screen.getByRole('button', { name: 'Mês anterior' }))

      expect(await screen.findByText('aluguel de setembro')).toBeInTheDocument()
      expect(screen.queryByText('feira')).not.toBeInTheDocument()
      expect(api.summary).toHaveBeenLastCalledWith(anterior)
      expect(screen.getByText(`Lançamentos — ${anterior}`)).toBeInTheDocument()
      expect(screen.getByText(`Saldo disponível — ${anterior}`)).toBeInTheDocument()
    })

    it('resposta atrasada do mês que ficou para trás não sobrescreve a lista', async () => {
      const user = userEvent.setup()
      let responderMesCorrente: (v: unknown) => void = () => {}
      vi.mocked(api.entries).mockImplementation((m: string) =>
        m === currentMonth()
          ? new Promise((resolve) => (responderMesCorrente = resolve))
          : Promise.resolve([DO_MES_ANTERIOR]),
      )
      montar()

      // troca de mês antes de o mês corrente responder...
      await user.click(await screen.findByRole('button', { name: 'Mês anterior' }))
      expect(await screen.findByText('aluguel de setembro')).toBeInTheDocument()
      // ...e a resposta dele chega depois
      responderMesCorrente([LANCAMENTO])

      await new Promise((r) => setTimeout(r, 20))
      expect(screen.queryByText('feira')).not.toBeInTheDocument()
      expect(screen.getByText('aluguel de setembro')).toBeInTheDocument()
    })

    it('depois de salvar recarrega o mês que está na tela, não o corrente', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')
      await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
      await waitFor(() => expect(api.entries).toHaveBeenLastCalledWith(anterior))
      const chamadasAntes = vi.mocked(api.entries).mock.calls.length

      await user.type(screen.getByLabelText('Descrição'), 'pão')
      await user.selectOptions(screen.getByLabelText('Categoria'), 'Mercado')
      await user.type(screen.getByLabelText('Valor'), '12.50')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() =>
        expect(vi.mocked(api.entries).mock.calls.length).toBeGreaterThan(chamadasAntes),
      )
      expect(api.entries).toHaveBeenLastCalledWith(anterior)
    })
  })

  it('mostra o saldo disponível vindo do resumo', async () => {
    montar()
    expect(await screen.findByText('R$ 4.000,00')).toBeInTheDocument()
  })
})
