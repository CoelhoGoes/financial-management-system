// Espelha backend/app/schemas.py. Campos Decimal (dinheiro) chegam como string no JSON
// (FastAPI serializa Decimal como string) — use Number(valor) antes de formatar/somar.

export interface Usuario {
  id: number
  email: string
  renda_mensal: string
  dia_fechamento: number
}

export type TipoLancamento = 'gasto' | 'entrada'
export type FormaLancamento = 'avista' | 'credito'

export interface LancamentoEntrada {
  tipo: TipoLancamento
  valor: string
  descricao: string
  categoria: string
  data: string
  forma?: FormaLancamento
  parcelas?: number
}

export interface LancamentoSaida extends LancamentoEntrada {
  id: number
}

export interface ParcelaFatura {
  lancamento_id: number
  descricao: string
  categoria: string
  data_compra: string
  parcela: number
  total_parcelas: number
  valor_parcela: string
}

export interface Fatura {
  mes: string
  total: string
  itens: ParcelaFatura[]
}

export interface Resumo {
  mes: string
  renda_mensal: string
  entradas_extras: string
  gastos_avista: string
  fatura: string
  gasto_total: string
  saldo_disponivel: string
  por_categoria: Record<string, string>
}
