import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import { currentMonth, formatCurrency, formatPercent } from '@/lib/format'
import type { CategoryBreakdown, Summary } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/Header'

function Money({ value, signal }: { value: string; signal?: '+' | '-' }) {
  return (
    <dd className="tabular-nums">
      {signal && <span className="text-muted-foreground">{signal} </span>}
      R$ {formatCurrency(value)}
    </dd>
  )
}

function CategoryBar({ share }: { share: string }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="img"
      aria-label={`${formatPercent(share)} do gasto do mês`}
    >
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Number(share) * 100}%` }}
      />
    </div>
  )
}

export function SummaryScreen() {
  const month = currentMonth()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [categories, setCategories] = useState<CategoryBreakdown[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.summary(month), api.categories(month)])
      .then(([s, c]: [Summary, CategoryBreakdown[]]) => {
        setSummary(s)
        setCategories(c)
      })
      .catch((e: Error) => setError(e.message))
  }, [month])

  const loading = !summary && !error

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-background p-6">
      <Header active="resumo" className="max-w-md" />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {summary && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Resumo — {summary.month}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Saldo disponível</span>
              <span className="text-2xl font-semibold tabular-nums">
                R$ {formatCurrency(summary.available_balance)}
              </span>
            </div>

            <dl className="flex flex-col gap-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Renda mensal</dt>
                <Money value={summary.monthly_income} />
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Entradas extras</dt>
                <Money value={summary.extra_income} signal="+" />
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Gastos à vista</dt>
                <Money value={summary.cash_expenses} signal="-" />
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Fatura do cartão</dt>
                <Money value={summary.invoice} signal="-" />
              </div>
              <div className="flex justify-between border-t pt-2 font-medium">
                <dt>Gasto total do mês</dt>
                <Money value={summary.total_spent} />
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {categories && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Por categoria</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum gasto neste mês.</p>
            )}

            {categories.map((category) => (
              <div key={category.category} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{category.category}</span>
                  <span className="tabular-nums">
                    R$ {formatCurrency(category.total)}
                    <span className="ml-2 text-muted-foreground">
                      {formatPercent(category.share)}
                    </span>
                  </span>
                </div>

                <CategoryBar share={category.share} />

                <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {category.items.map((item, i) => (
                    <li key={`${item.description}-${i}`} className="flex justify-between gap-4">
                      <span>
                        {item.description}
                        {item.installment && (
                          <> (parcela {item.installment}/{item.total_installments})</>
                        )}
                      </span>
                      <span className="tabular-nums">R$ {formatCurrency(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {categories.length > 0 && (
              <p className="border-t pt-4 text-xs text-muted-foreground">
                Inclui as parcelas que vencem neste mês, mesmo de compras feitas antes — por
                isso um item pode aparecer aqui sem ter sido comprado agora.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
