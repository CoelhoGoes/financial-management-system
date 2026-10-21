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
    throw new Error(body.detail || 'Não deu para completar a operação.');
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
