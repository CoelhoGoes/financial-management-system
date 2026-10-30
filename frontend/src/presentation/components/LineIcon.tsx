// Marcador das séries de linha na legenda e no tooltip do gráfico de tendência; o quadradinho
// padrão do shadcn é para barra. `dashed` desenha o tracejado da renda.
export function LineIcon({ color, dashed = false }: { color: string; dashed?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden>
      <line
        x1="0"
        y1="6"
        x2="12"
        y2="6"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={dashed ? '3 2' : undefined}
      />
    </svg>
  )
}
