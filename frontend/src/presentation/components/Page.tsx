import type { ReactNode } from 'react'
import { cn } from 'cn'
import { Header, type Screen } from '@/presentation/components/Header'

// Invólucro das telas logadas: a navbar de ponta a ponta e o conteúdo limitado a max-w-6xl.
// A grade de cada tela vem pelo className — fora de md, tudo é uma coluna só.
export function Page({
  active,
  className,
  children,
}: {
  active: Screen
  className?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-svh bg-background">
      <Header active={active} />
      <main className={cn('mx-auto flex w-full max-w-6xl flex-col gap-6 p-6', className)}>
        {children}
      </main>
    </div>
  )
}
