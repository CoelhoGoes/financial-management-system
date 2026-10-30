import { formatCurrency } from '@/shared/format'
import { ChartSwatch } from '@/presentation/components/ChartSwatch'

// Linha "nome … R$ valor" dos tooltips dos gráficos. Com `color`, mostra a cor da série.
export function ChartTooltipRow({
  name,
  value,
  color,
}: {
  name: string
  value: number | string
  color?: string
}) {
  return (
    <span className="flex w-full items-center justify-between gap-4">
      <span className="flex items-center gap-2">
        {color && <ChartSwatch color={color} />}
        {name}
      </span>
      <span className="tabular-nums">R$ {formatCurrency(String(value))}</span>
    </span>
  )
}
