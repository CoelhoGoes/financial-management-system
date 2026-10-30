import { useNavigate } from 'react-router'
import {
  RiHomeLine,
  RiFileListLine,
  RiBillLine,
  RiUploadCloud2Line,
  RiSettings3Line,
  RiLogoutBoxRLine,
} from '@remixicon/react'
import { useAuth } from '@/state/auth-context'
import { Button } from '@/presentation/components/ui/button'

export type Screen = 'resumo' | 'lancamentos' | 'fatura' | 'importar' | 'configuracoes'

const NAV_ITEMS: { screen: Screen; label: string; path: string; icon: typeof RiHomeLine }[] = [
  { screen: 'resumo', label: 'Resumo', path: '/', icon: RiHomeLine },
  { screen: 'lancamentos', label: 'Lançamentos', path: '/lancamentos', icon: RiFileListLine },
  { screen: 'fatura', label: 'Fatura', path: '/fatura', icon: RiBillLine },
  { screen: 'importar', label: 'Importar', path: '/importar', icon: RiUploadCloud2Line },
]

export function Header({ active }: { active: Screen }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-10 w-full border-b border-border bg-background md:h-(--header-height)">
      {/* o React 19 leva o <title> para o <head>; o nome é o mesmo da aba da tela */}
      <title>{NAV_ITEMS.find((item) => item.screen === active)?.label ?? 'Configurações'}</title>
      {/* no celular as abas descem para uma segunda linha (order-last + w-full) e ficam só
          com o ícone; o rótulo continua no sr-only, então o nome acessível não muda */}
      <nav
        aria-label="Principal"
        className="mx-auto flex h-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3"
      >
        <span className="font-semibold text-foreground">Gestão Financeira</span>
        <div className="order-last flex w-full gap-1 md:order-none md:w-auto">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.screen}
              type="button"
              variant={item.screen === active ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 md:flex-none"
              aria-current={item.screen === active ? 'page' : undefined}
              onClick={() => navigate(item.path)}
            >
              <item.icon />
              <span className="sr-only md:not-sr-only">{item.label}</span>
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* só a partir de lg: entre md e lg o e-mail não cabe na linha, a barra quebra em
              duas e fica mais alta que o --header-height do formulário fixo de Lançamentos */}
          <span className="hidden text-sm text-muted-foreground lg:inline">{user?.email}</span>
          <Button
            type="button"
            variant={active === 'configuracoes' ? 'default' : 'ghost'}
            size="sm"
            aria-label="Configurações"
            title="Configurações"
            aria-current={active === 'configuracoes' ? 'page' : undefined}
            onClick={() => navigate('/configuracoes')}
          >
            <RiSettings3Line />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <RiLogoutBoxRLine data-icon="inline-start" />
            Sair
          </Button>
        </div>
      </nav>
    </header>
  )
}
