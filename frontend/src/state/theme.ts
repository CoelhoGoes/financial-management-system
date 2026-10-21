// A escolha é por aparelho, de propósito: fica no localStorage, não no usuário do backend.
// Sem escolha salva, segue o sistema. O script inline do index.html repete a regra de
// isDark() para aplicar a classe antes do primeiro paint — mudar uma é mudar a outra.

export type Theme = 'system' | 'light' | 'dark'

const THEME_KEY = 'gf:theme'
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

function isDark(theme: Theme) {
  return theme === 'dark' || (theme === 'system' && systemDark().matches)
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark(getTheme()))
}

export function setTheme(theme: Theme) {
  if (theme === 'system') localStorage.removeItem(THEME_KEY)
  else localStorage.setItem(THEME_KEY, theme)
  applyTheme()
}

// com "system", o app acompanha o sistema trocar de tema enquanto está aberto
export function followSystemTheme() {
  systemDark().addEventListener('change', applyTheme)
}
