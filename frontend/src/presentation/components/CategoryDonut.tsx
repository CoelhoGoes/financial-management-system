import { Pie, PieChart } from 'recharts'
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
  onTotalClick,
}: {
  data: { category: string; total: number; fill: string }[]
  total: string
  onSliceClick: (index: number) => void
  onTotalClick: () => void
}) {
  // Chave por posição, nunca o nome: o ChartStyle do shadcn escreve as chaves cruas num <style>,
  // e a categoria vem da API, que aceita qualquer texto — com o nome como chave, uma categoria
  // como "x:red}body{display:none}" injetaria CSS na página. O nome fica só no label.
  const donutConfig = Object.fromEntries(
    data.map((c, i) => [`slice-${i}`, { label: c.category, color: c.fill }]),
  ) satisfies ChartConfig

  return (
    <div className="relative mx-auto">
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
          />
        </PieChart>
      </ChartContainer>
      {/* o centro é um botão HTML por cima do furo, não um <Label> do recharts: o recharts
          recria o SVG a cada render, e o popup não teria para onde devolver o foco ao fechar.
          size-28 cabe no furo (innerRadius 60 → 120px de diâmetro) */}
      <button
        type="button"
        onClick={onTotalClick}
        aria-label={`Gasto no mês: R$ ${formatCurrency(total)}. Ver todas as categorias`}
        className="absolute top-1/2 left-1/2 flex size-28 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="text-lg font-semibold tabular-nums text-foreground">
          R$ {formatCurrency(total)}
        </span>
        <span className="text-xs text-muted-foreground">gasto no mês</span>
      </button>
    </div>
  )
}
