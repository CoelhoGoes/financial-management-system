import { Label, Pie, PieChart } from 'recharts'
import { formatCurrency } from '@/shared/format'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/presentation/components/ui/chart'
import { ChartTooltipRow } from '@/presentation/components/ChartTooltipRow'

// Rosca de "Por categoria". Carregada sob demanda pelo SummaryScreen, como o TrendChart, para
// o recharts ficar fora do pacote principal.
// O centro mostra o gasto total do mês que a tela recebe pronto da API (os totais por categoria
// somam exatamente o total_spent — docs/dominio.md), então nada é somado aqui para exibir.
export function CategoryDonut({
  data,
  total,
  onSliceClick,
}: {
  data: { category: string; total: number; fill: string }[]
  total: string
  onSliceClick: (index: number) => void
}) {
  // Chave por posição, nunca o nome: o ChartStyle do shadcn escreve as chaves cruas num <style>,
  // e a categoria vem da API, que aceita qualquer texto — com o nome como chave, uma categoria
  // como "x:red}body{display:none}" injetaria CSS na página. O nome fica só no label.
  const donutConfig = Object.fromEntries(
    data.map((c, i) => [`slice-${i}`, { label: c.category, color: c.fill }]),
  ) satisfies ChartConfig

  return (
    <ChartContainer config={donutConfig} className="mx-auto aspect-square h-[250px]">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              nameKey="category"
              formatter={(value, name, item) => (
                <ChartTooltipRow
                  name={String(name)}
                  value={value as number}
                  color={item.payload?.fill}
                />
              )}
            />
          }
        />
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          innerRadius={60}
          stroke="var(--card)"
          strokeWidth={5}
          isAnimationActive={false}
          className="cursor-pointer"
          onClick={(_, index) => onSliceClick(index)}
        >
          <Label
            content={({ viewBox }) =>
              viewBox && 'cx' in viewBox && 'cy' in viewBox ? (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) - 8}
                    className="fill-foreground text-lg font-semibold tabular-nums"
                  >
                    R$ {formatCurrency(total)}
                  </tspan>
                  <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 14} className="fill-muted-foreground text-xs">
                    gasto no mês
                  </tspan>
                </text>
              ) : null
            }
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
