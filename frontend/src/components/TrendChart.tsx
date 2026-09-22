import { useEffect, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts'
import { api } from '../../api.js'
import { currentMonth, formatCurrency, formatMonthShort } from '@/lib/format'
import type { Summary } from '@/types'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const PRESETS = [3, 6, 12] as const

// As duas barras empilham porque cash_expenses + invoice é exatamente o total_spent
// do mês (docs/dominio.md). A linha responde outra pergunta: quanto sobrou.
// Os tokens --chart-* são uma rampa de verdes iguais nos dois temas, então a ordem
// importa: as barras ficam com dois tons distinguíveis entre si e o saldo usa
// --foreground, que inverte com o tema e é o traço mais legível sobre qualquer fundo.
const config = {
  cash_expenses: { label: 'À vista', color: 'var(--chart-2)' },
  invoice: { label: 'Fatura', color: 'var(--chart-4)' },
  available_balance: { label: 'Saldo', color: 'var(--foreground)' },
} satisfies ChartConfig

interface Point {
  month: string
  cash_expenses: number
  invoice: number
  available_balance: number
}

export function TrendChart() {
  const [months, setMonths] = useState<number>(6)
  const [points, setPoints] = useState<Point[] | null>(null)
  const [income, setIncome] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    // `until` sempre vai explícito: quem sabe o fuso de quem olha é o navegador,
    // não o servidor — ver docs/dominio.md, seção Tendência.
    api
      .trend(months, currentMonth())
      .then((data: Summary[]) => {
        if (!ativo) return
        setPoints(
          data.map((s) => ({
            month: s.month,
            cash_expenses: Number(s.cash_expenses),
            invoice: Number(s.invoice),
            available_balance: Number(s.available_balance),
          })),
        )
        setIncome(Number(data.at(-1)?.monthly_income ?? 0))
      })
      .catch((e: Error) => ativo && setError(e.message))
    return () => {
      ativo = false
    }
  }, [months])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {PRESETS.map((n) => (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={n === months ? 'default' : 'outline'}
            aria-pressed={n === months}
            onClick={() => setMonths(n)}
          >
            {n} meses
          </Button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!points && !error && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {points && (
        <ChartContainer config={config} className="h-56 w-full">
          <ComposedChart data={points} accessibilityLayer>
            <CartesianGrid vertical={false} />
            {/* eixo escondido, mas o domínio precisa alcançar a renda — senão a linha de
                referência fica fora da área visível e simplesmente não aparece */}
            <YAxis hide domain={[0, (max: number) => Math.max(max, income) * 1.05]} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatMonthShort}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => formatMonthShort(String(v))}
                  formatter={(value, name) => (
                    <span className="flex w-full justify-between gap-4">
                      <span>{config[name as keyof typeof config]?.label ?? name}</span>
                      <span className="tabular-nums">R$ {formatCurrency(String(value))}</span>
                    </span>
                  )}
                />
              }
            />
            {income > 0 && (
              <ReferenceLine
                y={income}
                strokeDasharray="4 4"
                stroke="var(--muted-foreground)"
                label={{ value: 'renda', position: 'insideTopLeft', fontSize: 11 }}
              />
            )}
            {/* isAnimationActive={false}: com a animação ligada o recharts 3.8 monta os
                grupos das barras vazios, sem nenhum path. A linha não é afetada. */}
            <Bar dataKey="cash_expenses" stackId="gasto" fill="var(--color-cash_expenses)" isAnimationActive={false} radius={[0, 0, 2, 2]} />
            <Bar dataKey="invoice" stackId="gasto" fill="var(--color-invoice)" isAnimationActive={false} radius={[2, 2, 0, 0]} />
            <Line
              dataKey="available_balance"
              type="monotone"
              stroke="var(--color-available_balance)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      )}
    </div>
  )
}
