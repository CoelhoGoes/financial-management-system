import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/lib/auth-context'
import { ImportScreen } from './ImportScreen'

vi.mock('../../api.js', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    previewImport: vi.fn(),
    confirmImport: vi.fn(),
    logout: vi.fn(),
  },
}))

const { api } = await import('../../api.js')

const linha = (over = {}) => ({
  type: 'gasto',
  amount: '20.00',
  description: 'PIX FULANO',
  date: '2026-09-21',
  import_id: '0341:123:A',
  already_imported: false,
  ...over,
})

function montar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ImportScreen />
      </AuthProvider>
    </MemoryRouter>,
  )
}

/** Escolhe um arquivo e clica em "Ler extrato". */
async function lerExtrato(user: ReturnType<typeof userEvent.setup>) {
  const arquivo = new File(['OFXHEADER:100'], 'extrato.ofx', { type: 'application/x-ofx' })
  await user.upload(screen.getByLabelText('Arquivo OFX'), arquivo)
  await user.click(screen.getByRole('button', { name: 'Ler extrato' }))
}

describe('ImportScreen', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue({
      id: 1, email: 'a@b.co', monthly_income: '0', closing_day: 10,
    })
    vi.mocked(api.previewImport).mockReset()
    vi.mocked(api.confirmImport).mockReset()
  })

  it('não envia nada antes de o usuário confirmar', async () => {
    const user = userEvent.setup()
    vi.mocked(api.previewImport).mockResolvedValue([linha()])
    montar()

    await lerExtrato(user)

    expect(await screen.findByText('PIX FULANO')).toBeInTheDocument()
    expect(api.confirmImport).not.toHaveBeenCalled()
  })

  it('mostra a linha já importada marcada e fora da seleção', async () => {
    const user = userEvent.setup()
    vi.mocked(api.previewImport).mockResolvedValue([
      linha({ already_imported: true, description: 'REPETIDA' }),
      linha({ import_id: '0341:123:B', description: 'NOVA' }),
    ])
    montar()

    await lerExtrato(user)

    expect(await screen.findByText('já importada')).toBeInTheDocument()
    // o Checkbox do Base UI marca aria-disabled, não o atributo nativo
    expect(screen.getByLabelText('Importar REPETIDA')).toHaveAttribute('aria-disabled', 'true')
    // só a nova entra na contagem do botão
    expect(screen.getByRole('button', { name: 'Importar 1 lançamento(s)' })).toBeInTheDocument()
  })

  it('envia a categoria escolhida junto com a linha', async () => {
    const user = userEvent.setup()
    vi.mocked(api.previewImport).mockResolvedValue([linha()])
    vi.mocked(api.confirmImport).mockResolvedValue({ created: [], skipped: 0 })
    montar()

    await lerExtrato(user)
    await user.selectOptions(await screen.findByLabelText('Categoria de PIX FULANO'), 'Mercado')
    await user.click(screen.getByRole('button', { name: 'Importar 1 lançamento(s)' }))

    await waitFor(() =>
      expect(api.confirmImport).toHaveBeenCalledWith([
        {
          type: 'gasto',
          amount: '20.00',
          description: 'PIX FULANO',
          category: 'Mercado',
          date: '2026-09-21',
          import_id: '0341:123:A',
        },
      ]),
    )
  })

  it('não envia a linha desmarcada', async () => {
    const user = userEvent.setup()
    vi.mocked(api.previewImport).mockResolvedValue([
      linha({ description: 'FICA' }),
      linha({ import_id: '0341:123:B', description: 'SAI' }),
    ])
    vi.mocked(api.confirmImport).mockResolvedValue({ created: [], skipped: 0 })
    montar()

    await lerExtrato(user)
    await user.click(await screen.findByLabelText('Importar SAI'))
    await user.click(screen.getByRole('button', { name: 'Importar 1 lançamento(s)' }))

    await waitFor(() => expect(api.confirmImport).toHaveBeenCalled())
    const enviadas = vi.mocked(api.confirmImport).mock.calls[0][0]
    expect(enviadas.map((e: { description: string }) => e.description)).toEqual(['FICA'])
  })

  it('categoria de entrada usa a lista de entrada, não a de gasto', async () => {
    const user = userEvent.setup()
    vi.mocked(api.previewImport).mockResolvedValue([
      linha({ type: 'entrada', description: 'SALARIO', amount: '1500.00' }),
    ])
    montar()

    await lerExtrato(user)
    const seletor = await screen.findByLabelText('Categoria de SALARIO')

    expect(seletor).toHaveTextContent('Salário')
    expect(seletor).not.toHaveTextContent('Mercado')
  })

  it('mostra o motivo quando o servidor recusa o arquivo', async () => {
    const user = userEvent.setup()
    vi.mocked(api.previewImport).mockRejectedValue(
      new Error('Este arquivo é uma fatura de cartão, não um extrato de conta.'),
    )
    montar()

    await lerExtrato(user)

    expect(await screen.findByText(/fatura de cartão/)).toBeInTheDocument()
  })

  it('informa quantas foram importadas e quantas o servidor pulou', async () => {
    const user = userEvent.setup()
    vi.mocked(api.previewImport).mockResolvedValue([linha()])
    vi.mocked(api.confirmImport).mockResolvedValue({
      created: [{ id: 1, ...linha() }],
      skipped: 2,
    })
    montar()

    await lerExtrato(user)
    await user.click(await screen.findByRole('button', { name: 'Importar 1 lançamento(s)' }))

    expect(await screen.findByText(/1 lançamento\(s\) importado\(s\), 2 pulado\(s\)/)).toBeInTheDocument()
  })

  it('extrato sem lançamento nenhum não oferece botão de importar', async () => {
    const user = userEvent.setup()
    vi.mocked(api.previewImport).mockResolvedValue([])
    montar()

    await lerExtrato(user)

    expect(await screen.findByText('O extrato não tem nenhum lançamento.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Importar \d/ })).not.toBeInTheDocument()
  })
})
