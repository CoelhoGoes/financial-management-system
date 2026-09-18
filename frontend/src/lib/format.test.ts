import { describe, expect, it } from 'vitest'
import { currentMonth, formatCurrency, formatPercent, shiftMonth } from './format'

describe('formatCurrency', () => {
  it.each([
    ['4057.30', '4.057,30'],
    ['1800', '1.800,00'],
    ['0', '0,00'],
    ['742.30', '742,30'],
    ['12345678.9', '12.345.678,90'],
    ['-64.5', '-64,50'],
  ])('formata %s como %s no padrão brasileiro', (entrada, esperado) => {
    expect(formatCurrency(entrada)).toBe(esperado)
  })

  it('sempre mostra duas casas, porque é dinheiro', () => {
    expect(formatCurrency('7')).toBe('7,00')
    expect(formatCurrency('7.1')).toBe('7,10')
  })
})

describe('formatPercent', () => {
  it.each([
    ['0.4941', '49,4%'],
    ['0.0512', '5,1%'],
    ['1', '100,0%'],
    ['0', '0,0%'],
  ])('converte a fração %s em %s', (entrada, esperado) => {
    expect(formatPercent(entrada)).toBe(esperado)
  })

  it('usa vírgula, igual ao formatCurrency', () => {
    expect(formatPercent('0.123')).toContain(',')
    expect(formatPercent('0.123')).not.toContain('.')
  })
})

describe('shiftMonth', () => {
  it.each([
    ['2026-09', 1, '2026-10'],
    ['2026-12', 1, '2027-01'],
    ['2026-01', -1, '2025-12'],
    ['2026-09', 0, '2026-09'],
    ['2026-01', -13, '2024-12'],
  ])('%s deslocado em %i vira %s', (inicio, delta, esperado) => {
    expect(shiftMonth(inicio, delta)).toBe(esperado)
  })

  it('ida e volta sempre retorna ao mesmo mês', () => {
    for (let n = -30; n <= 30; n++) {
      expect(shiftMonth(shiftMonth('2026-06', n), -n)).toBe('2026-06')
    }
  })

  it('concorda com o shift_month do backend no formato YYYY-MM', () => {
    expect(shiftMonth('2026-09', 1)).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/)
  })
})

describe('currentMonth', () => {
  it('devolve o mês no formato que a API aceita', () => {
    expect(currentMonth()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/)
  })
})
