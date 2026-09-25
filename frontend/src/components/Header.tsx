import { useNavigate } from 'react-router'
import {
  RiHomeLine,
  RiFileListLine,
  RiBillLine,
  RiUploadCloud2Line,
  RiSettings3Line,
  RiLogoutBoxRLine,
} from '@remixicon/react'
import { useAuth } from '@/lib/auth-context'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'

type Screen = 'resumo' | 'lancamentos' | 'fatura' | 'importar' | 'configuracoes'

const NAV_ITEMS: { screen: Screen; label: string; path: string; icon: typeof RiHomeLine }[] = [
  { screen: 'resumo', label: 'Resumo', path: '/', icon: RiHomeLine },
  { screen: 'lancamentos', label: 'Lançamentos', path: '/lancamentos', icon: RiFileListLine },
  { screen: 'fatura', label: 'Fatura', path: '/fatura', icon: RiBillLine },
  { screen: 'importar', label: 'Importar', path: '/importar', icon: RiUploadCloud2Line },
]

interface HeaderProps {
  active: Screen
  className?: string
}

export function Header({ active, className }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    // flex-wrap: com quatro abas os botões não cabem mais na largura de um celular,
    // e sem quebrar a linha o "Sair" fica fora da tela.
    <div className={cn('flex w-full flex-wrap items-center justify-between gap-2', className)}>
      <p className="text-foreground">{user?.email}</p>
      <div className="flex flex-wrap gap-2">
        {NAV_ITEMS.filter((item) => item.screen !== active).map((item) => (
          <Button
            key={item.screen}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(item.path)}
          >
            <item.icon data-icon="inline-start" />
            {item.label}
          </Button>
        ))}
        {active !== 'configuracoes' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Configurações"
            title="Configurações"
            onClick={() => navigate('/configuracoes')}
          >
            <RiSettings3Line />
          </Button>
        )}
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
    </div>
  )
}
