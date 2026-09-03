// Cliente da API. Troque a URL pelo endereço do backend em produção.
const BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'gf:token';

const token = () => localStorage.getItem(TOKEN_KEY);

async function req(path, options = {}) {
  const response = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
  return response.status === 204 ? null : response.json();
}

export const api = {
  async login(email, password) {
    const body = new URLSearchParams({ username: email, password });
    const r = await fetch(`${BASE}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!r.ok) throw new Error('E-mail ou senha não conferem.');
    const { access_token } = await r.json();
    localStorage.setItem(TOKEN_KEY, access_token);
  },

  register: (email, password) =>
    req('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () => localStorage.removeItem(TOKEN_KEY),
  isAuthenticated: () => Boolean(token()),

  me: () => req('/auth/me'),
  saveConfig: (monthly_income, closing_day) =>
    req('/auth/me', { method: 'PUT', body: JSON.stringify({ monthly_income, closing_day }) }),

  entries: (month) => req(`/entries${month ? `?month=${month}` : ''}`),
  createEntry: (data) =>
    req('/entries', { method: 'POST', body: JSON.stringify(data) }),
  removeEntry: (id) => req(`/entries/${id}`, { method: 'DELETE' }),

  summary: (month) => req(`/summary/${month}`),
  invoice: (month) => req(`/invoices/${month}`),
  trend: (months = 6, until) => req(`/trend?months=${months}${until ? `&until=${until}` : ''}`),
};
