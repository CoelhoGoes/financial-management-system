import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CategoryDonut } from './CategoryDonut'

describe('CategoryDonut', () => {
  // O ChartStyle do shadcn escreve as chaves do config num <style> via dangerouslySetInnerHTML.
  // A categoria vem da API, que aceita qualquer texto: ela não pode virar chave.
  it('não leva o nome da categoria para o <style> do gráfico', () => {
    const malicioso = 'x:red}body{display:none}'
    const { container } = render(
      <CategoryDonut
        data={[{ category: malicioso, total: 100, fill: 'var(--chart-1)' }]}
        total="100.00"
        onSliceClick={vi.fn()}
      />,
    )

    const css = [...container.querySelectorAll('style')].map((s) => s.textContent).join('')
    expect(css).toContain('--color-')
    expect(css).not.toContain(malicioso)
  })
})
