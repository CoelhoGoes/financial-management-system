import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { RiInformationLine } from '@remixicon/react'
import { api } from '@/data/api'
import { currentMonth, formatCurrency, formatPercent } from '@/shared/format'
import type { CategoryBreakdown, Summary } from '@/shared/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card'
import { Button } from '@/presentation/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog'
import { Page } from '@/presentation/components/Page'
import { MonthNav } from '@/presentation/components/MonthNav'
import { ChartSwatch } from '@/presentation/components/ChartSwatch'
// recharts é pesado e só esta seção usa: carrega em separado, sem bloquear a tela
const TrendChart = lazy(() =>
  import('@/presentation/components/TrendChart').then((m) => ({ default: m.TrendChart })),
)
const CategoryDonut = lazy(() =>
  import('@/presentation/components/CategoryDonut').then((m) => ({ default: m.CategoryDonut })),
)

// Só os cinco verdes do tema (--chart-1..5): as cinco maiores categorias do mês ganham um cada,
// e o resto vira uma fatia "Outras". A ordem alterna tons claros e escuros, para fatias vizinhas
// não ficarem parecidas. A API já devolve as categorias da maior para a menor.
const SLICE_COLORS = [4, 1, 3, 5, 2].map((n) => `var(--chart-${n})`)
const OTHERS_COLOR = 'var(--muted-foreground)'

interface Slice {
  label: string
  color: string
  categories: CategoryBreakdown[]
}

function toSlices(categories: CategoryBreakdown[]): Slice[] {
  const top = categories.slice(0, SLICE_COLORS.length).map((c, i) => ({
    label: c.category,
    color: SLICE_COLORS[i],
    categories: [c],
  }))
  const rest = categories.slice(SLICE_COLORS.length)
  return rest.length ? [...top, { label: 'Outras', color: OTHERS_COLOR, categories: rest }] : top
}

function CategoryTotal({ category }: { category: CategoryBreakdown }) {
  return (
    <>
      R$ {formatCurrency(category.total)} · {formatPercent(category.share)} do gasto do mês
    </>
  )
}


function Money({ value, signal }: { value: string; signal?: '+' | '-' }) {
  return (
    <dd className="tabular-nums">
      {signal && <span className="text-muted-foreground">{signal} </span>}
      R$ {formatCurrency(value)}
    </dd>
  )
}

export function SummaryScreen() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(currentMonth())
  const [summary, setSummary] = useState<Summary | null>(null)
  const [categories, setCategories] = useState<CategoryBreakdown[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openSlice, setOpenSlice] = useState<Slice | null>(null)

  useEffect(() => {
    let ativo = true
    setError(null)
    Promise.all([api.summary(month), api.categories(month)])
      .then(([s, c]: [Summary, CategoryBreakdown[]]) => {
        // dois cliques rápidos podem devolver fora de ordem: ignora o que já não é o mês atual
        if (!ativo) return
        setSummary(s)
        setCategories(c)
      })
      .catch((e: Error) => ativo && setError(e.message))
    return () => {
      ativo = false
    }
  }, [month])

  const loading = !summary && !error
  const slices = categories ? toSlices(categories) : []

  return (
    <Page active="resumo">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {summary && Number(summary.monthly_income) === 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4">
          <div className="flex gap-2">
            <RiInformationLine className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Sua renda mensal ainda não foi informada, então o saldo disponível está sendo
              calculado como se ela fosse zero.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => navigate('/configuracoes')}
          >
            Informar renda mensal
          </Button>
        </div>
      )}

      {/* no desktop: resumo e tendência à esquerda, categorias (o bloco mais longo) à direita.
          A ordem no HTML é a do celular; a linha 1fr absorve a altura extra das categorias,
          para a tendência ficar logo abaixo do resumo em vez de esticar o espaço entre eles */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:grid-rows-[auto_1fr] md:items-start">
        {summary && (
          <Card className="md:col-start-1 md:row-start-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Resumo — {summary.month}</CardTitle>
                <MonthNav month={month} onChange={setMonth} />
              </div>
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
          <Card className="md:col-start-2 md:row-span-2 md:row-start-1">
            <CardHeader>
              <CardTitle>Por categoria</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum gasto neste mês.</p>
              )}

              {slices.length > 0 && (
                <>
                  <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
                    <CategoryDonut
                      data={slices.map((s) => ({
                        category: s.label,
                        // só o tamanho da fatia; nenhum valor somado aqui aparece como texto
                        total: s.categories.reduce((sum, c) => sum + Number(c.total), 0),
                        fill: s.color,
                      }))}
                      total={summary?.total_spent ?? '0'}
                      onSliceClick={(i) => setOpenSlice(slices[i])}
                    />
                  </Suspense>

                  {/* a legenda é só nome e percentual; os itens de cada categoria abrem no popup */}
                  <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {slices.map((slice) => (
                      <li key={slice.label}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full justify-between"
                          onClick={() => setOpenSlice(slice)}
                        >
                          <span className="flex items-center gap-2">
                            <ChartSwatch color={slice.color} />
                            {slice.label}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {slice.categories.length === 1
                              ? formatPercent(slice.categories[0].share)
                              : `${slice.categories.length} categorias`}
                          </span>
                        </Button>
                      </li>
                    ))}
                  </ul>

                  <p className="border-t pt-4 text-xs text-muted-foreground">
                    Inclui as parcelas que vencem neste mês, mesmo de compras feitas antes — por
                    isso um item pode aparecer aqui sem ter sido comprado agora.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={openSlice !== null} onOpenChange={(open) => !open && setOpenSlice(null)}>
          {openSlice && (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{openSlice.label}</DialogTitle>
                <DialogDescription>
                  {openSlice.categories.length === 1 ? (
                    <CategoryTotal category={openSlice.categories[0]} />
                  ) : (
                    `As ${openSlice.categories.length} categorias de menor gasto no mês`
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="flex max-h-[60svh] flex-col gap-4 overflow-y-auto text-sm">
                {openSlice.categories.map((category) => (
                  <section key={category.category} className="flex flex-col">
                    {openSlice.categories.length > 1 && (
                      <h3 className="flex justify-between gap-4 font-medium">
                        {category.category}
                        <span className="font-normal text-muted-foreground">
                          <CategoryTotal category={category} />
                        </span>
                      </h3>
                    )}
                    <ul className="flex flex-col divide-y divide-border">
                      {category.items.map((item, i) => (
                        <li key={`${item.description}-${i}`} className="flex justify-between gap-4 py-2">
                          <span>
                            {item.description}
                            {item.installment && (
                              <span className="text-muted-foreground">
                                {' '}
                                (parcela {item.installment}/{item.total_installments})
                              </span>
                            )}
                          </span>
                          <span className="tabular-nums">R$ {formatCurrency(item.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </DialogContent>
          )}
        </Dialog>
        <Card className="md:col-start-1 md:row-start-2">
          <CardHeader>
            <CardTitle>Tendência</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
              <TrendChart until={month} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
