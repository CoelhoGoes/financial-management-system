import { beforeEach, describe, expect, it, vi } from 'vitest'
import { followSystemTheme, setTheme } from './theme'

// o jsdom não tem matchMedia: este finge o do aparelho, com o tema trocável no meio do teste
const sistema = {
  matches: false,
  listener: null as null | (() => void),
  addEventListener(_: string, fn: () => void) {
    this.listener = fn
  },
}

function trocarSistema(escuro: boolean) {
  sistema.matches = escuro
  sistema.listener?.()
}

describe('followSystemTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    sistema.matches = false
    sistema.listener = null
    vi.stubGlobal('matchMedia', () => sistema)
    followSystemTheme()
  })

  it('em "Sistema", acompanha o aparelho trocar de tema com o app aberto', () => {
    trocarSistema(true)
    expect(document.documentElement).toHaveClass('dark')
    trocarSistema(false)
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('com escolha manual, ignora a troca do aparelho', () => {
    setTheme('light')
    trocarSistema(true)
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
