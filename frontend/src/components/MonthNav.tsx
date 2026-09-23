import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react'
import { shiftMonth } from '@/lib/format'
import { Button } from '@/components/ui/button'

interface MonthNavProps {
  month: string
  onChange: (month: string) => void
}

/**
 * Passo de um mês para trás ou para frente.
 *
 * Não usa o `Pagination` do shadcn de propósito: aquele renderiza âncoras, porque
 * foi feito para páginas que têm URL. Aqui não há URL — é estado local —, e âncora
 * sem `href` quebra teclado e leitor de tela.
 */
export function MonthNav({ month, onChange }: MonthNavProps) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <RiArrowLeftSLine />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <RiArrowRightSLine />
      </Button>
    </div>
  )
}
