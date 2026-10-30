import { Curve, usePlotArea, type CurveProps } from 'recharts'

// As linhas passam pelo centro de cada coluna; esticadas assim, vão de uma borda à outra da
// área do gráfico, repetindo o primeiro e o último valor. Para a renda, constante, isso é
// exato; para o saldo, as pontas são só continuação visual do primeiro e do último mês.
export function EdgeToEdgeCurve(props: CurveProps) {
  const area = usePlotArea()
  const points = props.points
  if (!area || !points?.length) return <Curve {...props} />
  const first = points[0]
  const last = points[points.length - 1]
  return (
    <Curve
      {...props}
      points={[{ ...first, x: area.x }, ...points, { ...last, x: area.x + area.width }]}
    />
  )
}
