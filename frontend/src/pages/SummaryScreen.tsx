import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import { currentMonth, formatCurrency } from '@/lib/format'
import type { Summary } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/Header'

export function SummaryScreen() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .summary(currentMonth())
      .then((data: Summary) => setSummary(data))
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-background p-6">
      <Header active="resumo" className="max-w-sm" />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary && (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Resumo — {summary.month}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Renda mensal</dt>
                <dd>R$ {formatCurrency(summary.monthly_income)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Gasto total</dt>
                <dd>R$ {formatCurrency(summary.total_spent)}</dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>Saldo disponível</dt>
                <dd>R$ {formatCurrency(summary.available_balance)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
