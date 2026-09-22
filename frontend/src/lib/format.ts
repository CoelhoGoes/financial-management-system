export function currentMonth() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${today.getFullYear()}-${month}`
}

// Devolve só o número, com separador de milhar e vírgula decimal do pt-BR
// (1234.5 -> "1.234,50"). O "R$" fica nas telas, que já o escrevem.
const BRL = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: string) {
  return BRL.format(Number(value))
}

// Fração (0.494) -> "49,4%", na mesma convenção do formatCurrency.
const PERCENT = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatPercent(fraction: string) {
  return PERCENT.format(Number(fraction))
}

// "2026-09" -> "set/26". Rótulo curto para eixo de gráfico, onde não cabe o mês inteiro.
const MONTH_SHORT = new Intl.DateTimeFormat('pt-BR', { month: 'short' })

export function formatMonthShort(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const nome = MONTH_SHORT.format(new Date(year, mon - 1, 1)).replace('.', '')
  return `${nome}/${String(year).slice(-2)}`
}

export function shiftMonth(month: string, delta: number) {
  const [year, mon] = month.split('-').map(Number)
  const date = new Date(year, mon - 1 + delta, 1)
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${nextMonth}`
}
