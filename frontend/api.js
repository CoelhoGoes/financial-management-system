// Cliente da API. Troque a URL pelo endereço do backend em produção.
const BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';
const CHAVE_TOKEN = 'gf:token';

const token = () => localStorage.getItem(CHAVE_TOKEN);

async function req(caminho, opcoes = {}) {
  const resposta = await fetch(BASE + caminho, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...opcoes.headers,
    },
  });

  if (resposta.status === 401) {
    localStorage.removeItem(CHAVE_TOKEN);
    throw new Error('Sessão expirada. Entre de novo.');
  }
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    throw new Error(corpo.detail || 'Não deu para completar a operação.');
  }
  return resposta.status === 204 ? null : resposta.json();
}

export const api = {
  async entrar(email, senha) {
    const corpo = new URLSearchParams({ username: email, password: senha });
    const r = await fetch(`${BASE}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corpo,
    });
    if (!r.ok) throw new Error('E-mail ou senha não conferem.');
    const { access_token } = await r.json();
    localStorage.setItem(CHAVE_TOKEN, access_token);
  },

  registrar: (email, senha) =>
    req('/auth/registrar', { method: 'POST', body: JSON.stringify({ email, senha }) }),

  sair: () => localStorage.removeItem(CHAVE_TOKEN),
  autenticado: () => Boolean(token()),

  eu: () => req('/auth/eu'),
  salvarConfig: (renda_mensal, dia_fechamento) =>
    req('/auth/eu', { method: 'PUT', body: JSON.stringify({ renda_mensal, dia_fechamento }) }),

  lancamentos: (mes) => req(`/lancamentos${mes ? `?mes=${mes}` : ''}`),
  criarLancamento: (dados) =>
    req('/lancamentos', { method: 'POST', body: JSON.stringify(dados) }),
  removerLancamento: (id) => req(`/lancamentos/${id}`, { method: 'DELETE' }),

  resumo: (mes) => req(`/resumo/${mes}`),
  fatura: (mes) => req(`/faturas/${mes}`),
  tendencia: (meses = 6, ate) => req(`/tendencia?meses=${meses}${ate ? `&ate=${ate}` : ''}`),
};
