import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../api.js'
import { currentMonth, formatCurrency } from '@/lib/format'
import { GASTO_CATEGORIES, ENTRADA_CATEGORIES } from '@/constants/categories'
import type { EntryCreate, EntryMethod, EntryOut, EntryType, Summary } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/Header'

function today() {
  return new Date().toISOString().slice(0, 10)
}

interface FormState {
  type: EntryType
  amount: string
  description: string
  category: string
  date: string
  method: EntryMethod
  installments: string
}

function defaultForm(): FormState {
  return {
    type: 'gasto',
    amount: '',
    description: '',
    category: '',
    date: today(),
    method: 'avista',
    installments: '1',
  }
}

export function EntryScreen() {
  const [entries, setEntries] = useState<EntryOut[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  async function loadData() {
    setListLoading(true)
    setListError(null)
    try {
      const [entriesData, summaryData] = await Promise.all([
        api.entries(currentMonth()),
        api.summary(currentMonth()),
      ])
      setEntries(entriesData)
      setSummary(summaryData)
    } catch (e) {
      setListError((e as Error).message)
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (key === 'type') {
        next.category = ''
        if (value === 'entrada') {
          next.method = 'avista'
          next.installments = '1'
        }
      }
      if (key === 'method' && value === 'avista') {
        next.installments = '1'
      }
      return next
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const payload: EntryCreate = {
        type: form.type,
        amount: form.amount,
        description: form.description,
        category: form.category,
        date: form.date,
        method: form.type === 'gasto' ? form.method : 'avista',
        installments:
          form.type === 'gasto' && form.method === 'credito'
            ? Number(form.installments)
            : 1,
      }
      await api.createEntry(payload)
      setForm(defaultForm())
      await loadData()
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  function onDeleteClick(id: number) {
    if (confirmingId === id) {
      setConfirmingId(null)
      setDeletingId(id)
      api
        .removeEntry(id)
        .then(() => loadData())
        .catch((e: Error) => setListError(e.message))
        .finally(() => setDeletingId(null))
    } else {
      setConfirmingId(id)
      setTimeout(() => {
        setConfirmingId((current) => (current === id ? null : current))
      }, 2000)
    }
  }

  const categories = form.type === 'gasto' ? GASTO_CATEGORIES : ENTRADA_CATEGORIES

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-background p-6">
      <Header active="lancamentos" className="max-w-sm" />

      {summary && (
        <Card className="w-full max-w-sm">
          <CardContent>
            <dl className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">Saldo disponível</dt>
              <dd className="font-medium">
                R$ {formatCurrency(summary.available_balance)}
              </dd>
            </dl>
          </CardContent>
        </Card>
      )}

      <Card className="w-full max-w-sm">
        <form onSubmit={onSubmit}>
          <CardHeader>
            <CardTitle>Novo lançamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1"
                variant={form.type === 'gasto' ? 'default' : 'outline'}
                onClick={() => updateForm('type', 'gasto')}
              >
                Gasto
              </Button>
              <Button
                type="button"
                className="flex-1"
                variant={form.type === 'entrada' ? 'default' : 'outline'}
                onClick={() => updateForm('type', 'entrada')}
              >
                Entrada
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                type="text"
                maxLength={200}
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                value={form.category}
                onChange={(e) => updateForm('category', e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => updateForm('amount', e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => updateForm('date', e.target.value)}
                required
              />
            </div>

            {form.type === 'gasto' && (
              <div className="flex flex-col gap-1.5">
                <Label>Forma</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    variant={form.method === 'avista' ? 'default' : 'outline'}
                    onClick={() => updateForm('method', 'avista')}
                  >
                    À vista
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    variant={form.method === 'credito' ? 'default' : 'outline'}
                    onClick={() => updateForm('method', 'credito')}
                  >
                    Crédito
                  </Button>
                </div>
              </div>
            )}

            {form.type === 'gasto' && form.method === 'credito' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="installments">Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min={1}
                  max={48}
                  value={form.installments}
                  onChange={(e) => updateForm('installments', e.target.value)}
                  required
                />
              </div>
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </CardContent>
        </form>
      </Card>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Lançamentos — {currentMonth()}</CardTitle>
        </CardHeader>
        <CardContent>
          {listLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {listError && <p className="text-sm text-destructive">{listError}</p>}
          {!listLoading && entries && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum lançamento neste mês.</p>
          )}
          {entries && entries.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col">
                    <span className="text-foreground">{entry.description}</span>
                    <span className="text-sm text-muted-foreground">
                      {entry.category} · {entry.type}
                      {entry.method === 'credito' &&
                        ` · crédito (parcelado em ${entry.installments}x)`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {entry.type === 'gasto' ? '-' : '+'}R${' '}
                      {formatCurrency(entry.amount)}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === entry.id}
                      onClick={() => onDeleteClick(entry.id)}
                    >
                      {confirmingId === entry.id ? 'Confirmar?' : 'Excluir'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
