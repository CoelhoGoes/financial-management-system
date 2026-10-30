import { useState, type ChangeEvent } from 'react'
import { api } from '@/data/api'
import { formatCurrency, formatDayMonth } from '@/shared/format'
import { GASTO_CATEGORIES, ENTRADA_CATEGORIES } from '@/shared/categories'
import type { EntryImport, ImportPreviewItem, ImportResult } from '@/shared/types'
import { Button } from '@/presentation/components/ui/button'
import { Badge } from '@/presentation/components/ui/badge'
import { NativeSelect, NativeSelectOption } from '@/presentation/components/ui/native-select'
import { Checkbox } from '@/presentation/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card'
import { Page } from '@/presentation/components/Page'

/** Categoria inicial de toda linha lida. Um extrato tem dezenas de lançamentos;
 *  exigir escolha em cada um antes de importar transformaria a tela em trabalho. */
const DEFAULT_CATEGORY = 'Outros'

/** A linha da prévia mais o que o usuário decidiu sobre ela. */
interface ReviewLine {
  line: ImportPreviewItem
  include: boolean
  category: string
}

function toReview(line: ImportPreviewItem): ReviewLine {
  return { line, include: !line.already_imported, category: DEFAULT_CATEGORY }
}

export function ImportScreen() {
  const [file, setFile] = useState<File | null>(null)
  const [review, setReview] = useState<ReviewLine[] | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setFile(null)
    setReview(null)
    setResult(null)
    setError(null)
  }

  function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
    setReview(null)
    setResult(null)
    setError(null)
  }

  async function onRead() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const lines: ImportPreviewItem[] = await api.previewImport(file)
      setReview(lines.map(toReview))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function onConfirm() {
    if (!review) return
    setBusy(true)
    setError(null)
    try {
      const payload: EntryImport[] = review
        .filter((r) => r.include)
        .map((r) => ({
          type: r.line.type,
          amount: r.line.amount,
          description: r.line.description,
          category: r.category,
          date: r.line.date,
          import_id: r.line.import_id,
        }))
      setResult(await api.confirmImport(payload))
      setReview(null)
      setFile(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function update(importId: string, patch: Partial<ReviewLine>) {
    setReview((current) =>
      current?.map((r) => (r.line.import_id === importId ? { ...r, ...patch } : r)) ?? null,
    )
  }

  const selected = review?.filter((r) => r.include).length ?? 0

  return (
    <Page active="importar" className="max-w-3xl">

      <Card>
        <CardHeader>
          <CardTitle>Importar extrato</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Baixe o extrato em OFX pelo app do banco. Fatura de cartão não entra aqui — ela
            já é calculada a partir dos seus lançamentos no crédito.
          </p>

          <input
            type="file"
            accept=".ofx,application/x-ofx"
            aria-label="Arquivo OFX"
            onChange={onPickFile}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-sm file:text-secondary-foreground"
          />

          <Button type="button" onClick={onRead} disabled={!file || busy}>
            {busy && !review ? 'Lendo...' : 'Ler extrato'}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-foreground">
                {result.created.length} lançamento(s) importado(s)
                {result.skipped > 0 && `, ${result.skipped} pulado(s) por já existirem`}.
              </p>
              <Button type="button" variant="outline" onClick={reset}>
                Importar outro extrato
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {review && (
        <Card>
          <CardHeader>
            <CardTitle>Conferir antes de importar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {review.length === 0 && (
              <p className="text-sm text-muted-foreground">
                O extrato não tem nenhum lançamento.
              </p>
            )}

            {review.length > 0 && (
              <ul className="flex flex-col divide-y divide-border">
                {review.map(({ line, include, category }) => (
                  <li key={line.import_id} className="flex flex-col gap-2 py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={include}
                          disabled={line.already_imported}
                          aria-label={`Importar ${line.description}`}
                          onCheckedChange={(checked) =>
                            update(line.import_id, { include: Boolean(checked) })
                          }
                        />
                        <div className="flex flex-col">
                          <span className="text-foreground">{line.description}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDayMonth(line.date)}
                            {line.already_imported && (
                              <Badge variant="secondary" className="ml-2">
                                já importada
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-foreground">
                        {line.type === 'gasto' ? '-' : '+'}R$ {formatCurrency(line.amount)}
                      </span>
                    </div>

                    {include && (
                      <NativeSelect
                        aria-label={`Categoria de ${line.description}`}
                        className="w-full"
                        value={category}
                        onChange={(e) => update(line.import_id, { category: e.target.value })}
                      >
                        {(line.type === 'gasto' ? GASTO_CATEGORIES : ENTRADA_CATEGORIES).map(
                          (c) => (
                            <NativeSelectOption key={c} value={c}>
                              {c}
                            </NativeSelectOption>
                          ),
                        )}
                      </NativeSelect>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {review.length > 0 && (
              <Button type="button" onClick={onConfirm} disabled={busy || selected === 0}>
                {busy ? 'Importando...' : `Importar ${selected} lançamento(s)`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </Page>
  )
}
