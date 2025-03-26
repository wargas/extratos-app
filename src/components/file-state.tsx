import { FILE_STATUS } from "@/types/types"
import { Badge } from "./ui/badge"
import { cn } from "@/lib/utils"

type Props = {
    status: FILE_STATUS,
    registros?: number
}

export function FileState({ status, registros }: Props) {

    const labels = ["PENDENTE", "RODANDO", "CONCLUIDO", "FALHOU"]

    const variants = ['outline', 'secondary', 'default', 'destructive']

    const variant = variants[status] as "outline" | "secondary" | "default" | "destructive" | null | undefined

    return (
        <>
            <Badge  className={cn('text-xs',{'bg-green-700': status == FILE_STATUS.SUCCESS})} variant={variant}>
                {labels[status]}
                {registros && (
                    (<span>{registros}</span>)
                )}
            </Badge>
        </>
    )
}