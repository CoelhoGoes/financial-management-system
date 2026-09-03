// Espelha backend/app/schemas.py. Campos Decimal (dinheiro) chegam como string no JSON
// (FastAPI serializa Decimal como string) — use Number(valor) antes de formatar/somar.

export interface User {
  id: number
  email: string
  monthly_income: string
  closing_day: number
}

export type EntryType = 'gasto' | 'entrada'
export type EntryMethod = 'avista' | 'credito'

export interface EntryCreate {
  type: EntryType
  amount: string
  description: string
  category: string
  date: string
  method?: EntryMethod
  installments?: number
}

export interface EntryOut extends EntryCreate {
  id: number
}

export interface InvoiceInstallment {
  entry_id: number
  description: string
  category: string
  purchase_date: string
  installment: number
  total_installments: number
  installment_amount: string
}

export interface Invoice {
  month: string
  total: string
  items: InvoiceInstallment[]
}

export interface Summary {
  month: string
  monthly_income: string
  extra_income: string
  cash_expenses: string
  invoice: string
  total_spent: string
  available_balance: string
  by_category: Record<string, string>
}
