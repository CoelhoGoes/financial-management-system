// Apelidos para os tipos gerados de backend/app/api/schemas.py. O arquivo gerado é
// api-schema.d.ts: não edite à mão, rode `npm run gen:types` com a API no ar (o ./dev.sh
// avisa quando ele está desatualizado). Comentário sobre um campo vai no
// Field(description=...) do schemas.py, que chega até aqui.
//
// Dinheiro sai da API como string (FastAPI serializa Decimal assim) — use Number(valor) antes
// de formatar/somar. Na entrada o servidor aceita número ou string.
import type { components } from './api-schema'

type Schemas = components['schemas']

export type User = Schemas['UserOut']
export type Income = Schemas['IncomeOut']

export type EntryCreate = Schemas['EntryCreate']
export type EntryUpdate = Schemas['EntryUpdate']
export type EntryOut = Schemas['EntryOut']
export type EntryType = EntryCreate['type']
export type EntryMethod = NonNullable<EntryCreate['method']>

export type InvoiceInstallment = Schemas['InvoiceInstallment']
export type Invoice = Schemas['Invoice']
export type Summary = Schemas['Summary']
export type CategoryItem = Schemas['CategoryItem']
export type CategoryBreakdown = Schemas['CategoryBreakdown']

export type ImportPreviewItem = Schemas['ImportPreviewItem']
export type EntryImport = Schemas['EntryImport']
export type ImportResult = Schemas['ImportResult']
