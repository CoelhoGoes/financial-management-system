import { useNavigate } from 'react-router'
import { RiHomeLine, RiFileListLine, RiBillLine, RiLogoutBoxRLine } from '@remixicon/react'
import { useAuth } from '@/lib/auth-context'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'

type Screen = 'resumo' | 'lancamentos' | 'fatura'

const NAV_ITEMS: { screen: Screen; label: string; path: string; icon: typeof RiHomeLine }[] = [
  { screen: 'resumo', label: 'Resumo', path: '/', icon: RiHomeLine },
  { screen: 'lancamentos', label: 'Lançamentos', path: '/lancamentos', icon: RiFileListLine },
  { screen: 'fatura', label: 'Fatura', path: '/fatura', icon: RiBillLine },
]

interface HeaderProps {
  active: Screen
  className?: string
}

export function Header({ active, className }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className={cn('flex w-full items-center justify-between', className)}>
      <p className="text-foreground">{user?.email}</p>
      <div className="flex gap-2">
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
