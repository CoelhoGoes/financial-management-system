import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MonthNav } from './MonthNav'

describe('MonthNav', () => {
  it('anda um mês para trás', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MonthNav month="2026-09" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(onChange).toHaveBeenCalledWith('2026-08')
  })

  it('anda um mês para frente', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MonthNav month="2026-09" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(onChange).toHaveBeenCalledWith('2026-10')
  })

  it('atravessa a virada de ano nos dois sentidos', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<MonthNav month="2026-12" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(onChange).toHaveBeenCalledWith('2027-01')

    rerender(<MonthNav month="2026-01" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(onChange).toHaveBeenCalledWith('2025-12')
  })

  it('são botões, não links — não há URL para navegar', () => {
    render(<MonthNav month="2026-09" onChange={vi.fn()} />)
    // o Pagination do shadcn renderiza âncoras; aqui é estado local, e âncora
    // sem href quebra teclado e leitor de tela
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
