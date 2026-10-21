import { useEffect, useState } from 'react'
import { api } from '@/data/api'
import { currentMonth, formatCurrency } from '@/shared/format'
import type { Invoice } from '@/shared/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/presentation/components/ui/table'
import { Header } from '@/presentation/components/Header'
import { MonthNav } from '@/presentation/components/MonthNav'

export function InvoiceScreen() {
  const [month, setMonth] = useState(currentMonth())
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    setListLoading(true)
    setListError(null)
    api
      .invoice(month)
      .then((data: Invoice) => {
        // dois cliques rápidos podem devolver fora de ordem: ignora o que já não é o mês da tela
        if (ativo) setInvoice(data)
      })
      .catch((e: Error) => ativo && setListError(e.message))
      .finally(() => ativo && setListLoading(false))
    return () => {
      ativo = false
    }
  }, [month])

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-background p-6">
      <Header active="fatura" className="max-w-2xl" />

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fatura — {month}</CardTitle>
            <MonthNav month={month} onChange={setMonth} />
          </div>
        </CardHeader>
        <CardContent>
          {listLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {listError && <p className="text-sm text-destructive">{listError}</p>}
          {!listLoading && invoice && invoice.items.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma parcela nesta fatura.</p>
          )}
          {invoice && invoice.items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Data da compra</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.entry_id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.purchase_date}</TableCell>
                      <TableCell>
                        {item.installment}/{item.total_installments}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {formatCurrency(item.installment_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-between text-sm font-medium">
                <span>Total</span>
                <span>R$ {formatCurrency(invoice.total)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
