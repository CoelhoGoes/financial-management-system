// Cliente da API. Troque a URL pelo endereço do backend em produção.
import type {
  CategoryBreakdown,
  EntryCreate,
  EntryImport,
  EntryOut,
  EntryUpdate,
  ImportPreviewItem,
  ImportResult,
  Invoice,
  Summary,
  User,
} from '@/shared/types'

const BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'gf:token';

const token = () => localStorage.getItem(TOKEN_KEY);

// O 422 do FastAPI traz `detail` como lista de erros do Pydantic, em inglês e técnicos.
// Cada um vira uma frase em português pelo tipo do erro e pelo nome do campo.
interface ValidationError {
  type: string
  loc: (string | number)[]
  ctx?: Record<string, unknown>
}

const FIELD_LABELS: Record<string, string> = {
  amount: 'Valor',
  description: 'Descrição',
  category: 'Categoria',
  date: 'Data',
  installments: 'Parcelas',
  closing_day: 'Dia de fechamento',
  email: 'E-mail',
  password: 'Senha',
  type: 'Tipo',
  method: 'Forma',
  month: 'Mês',
}

function validationMessage({ type, loc, ctx = {} }: ValidationError): string {
  const label = FIELD_LABELS[String(loc.at(-1))]
  if (!label) return 'Algum campo foi recusado. Confira os valores.'
  switch (type) {
    case 'missing':
    case 'string_too_short':
      return `Preencha o campo ${label}.`
    case 'string_too_long':
      return `${label}: texto longo demais.`
    case 'greater_than':
      return `${label} precisa ser maior que ${ctx.gt}.`
    case 'greater_than_equal':
      return `${label} precisa ser ${ctx.ge} ou mais.`
    case 'less_than_equal':
      return `${label} precisa ser ${ctx.le} ou menos.`
    case 'decimal_max_digits':
    case 'decimal_whole_digits':
      return `${label} grande demais.`
    case 'decimal_max_places':
      return `${label} aceita no máximo 2 casas decimais.`
    default:
      return `${label}: valor inválido.`
  }
}

export function errorMessage(detail: unknown): string {
  if (typeof detail === 'string' && detail) return detail
  if (Array.isArray(detail) && detail.length) {
    return [...new Set(detail.map(validationMessage))].join(' ')
  }
  return 'Não deu para completar a operação.'
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Upload de arquivo vai como FormData: quem define o Content-Type é o navegador,
  // que precisa anexar o boundary do multipart. Declarar JSON aqui quebraria o envio.
  const isUpload = options.body instanceof FormData;
  const response = await fetch(BASE + path, {
    ...options,
    headers: {
      ...(isUpload ? {} : { 'Content-Type': 'application/json' }),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    throw new Error('Sessão expirada. Entre de novo.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(errorMessage(body.detail));
  }
  return response.status === 204 ? (null as T) : response.json();
}

export const api = {
  async login(email: string, password: string): Promise<void> {
    const body = new URLSearchParams({ username: email, password });
    const r = await fetch(`${BASE}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!r.ok) {
      // o servidor pode responder 429 (muitas tentativas), não só credencial errada
      const body = await r.json().catch(() => ({}));
      throw new Error(body.detail || 'E-mail ou senha não conferem.');
    }
    const { access_token } = await r.json();
    localStorage.setItem(TOKEN_KEY, access_token);
  },

  register: (email: string, password: string) =>
    req<User>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () => localStorage.removeItem(TOKEN_KEY),
  isAuthenticated: () => Boolean(token()),

  me: () => req<User>('/auth/me'),
  saveConfig: (monthly_income: string, closing_day: number) =>
    req<User>('/auth/me', { method: 'PUT', body: JSON.stringify({ monthly_income, closing_day }) }),
  deleteAccount: (password: string) =>
    req<null>('/auth/me', { method: 'DELETE', body: JSON.stringify({ password }) }),

  entries: (month?: string) => req<EntryOut[]>(`/entries${month ? `?month=${month}` : ''}`),
  createEntry: (data: EntryCreate) =>
    req<EntryOut>('/entries', { method: 'POST', body: JSON.stringify(data) }),
  updateEntry: (id: number, data: EntryUpdate) =>
    req<EntryOut>(`/entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeEntry: (id: number) => req<null>(`/entries/${id}`, { method: 'DELETE' }),

  previewImport: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return req<ImportPreviewItem[]>('/imports/preview', { method: 'POST', body });
  },
  confirmImport: (lines: EntryImport[]) => req<ImportResult>('/imports', { method: 'POST', body: JSON.stringify(lines) }),

  summary: (month: string) => req<Summary>(`/summary/${month}`),
  categories: (month: string) => req<CategoryBreakdown[]>(`/summary/${month}/categories`),
  invoice: (month: string) => req<Invoice>(`/invoices/${month}`),
  trend: (months = 6, until?: string) => req<Summary[]>(`/trend?months=${months}${until ? `&until=${until}` : ''}`),
};
