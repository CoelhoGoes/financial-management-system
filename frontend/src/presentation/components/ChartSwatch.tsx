// Quadradinho de cor que liga um texto (legenda, tooltip) à série ou fatia de um gráfico.
export function ChartSwatch({ color }: { color?: string }) {
  return (
    <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: color }} aria-hidden />
  )
}
