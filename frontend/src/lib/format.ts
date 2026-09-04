export function currentMonth() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${today.getFullYear()}-${month}`
}

export function formatCurrency(value: string) {
  return Number(value).toFixed(2)
}
