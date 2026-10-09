import { Clock, CheckCircle2, XCircle } from "lucide-react"
import { Badge } from "./badge"

const config = {
  pending: { label: "Pending", variant: "warning", Icon: Clock },
  approved: { label: "Approved", variant: "success", Icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "danger", Icon: XCircle },
}

export function StatusBadge({ status }) {
  const { label, variant, Icon } = config[status] || config.pending
  return (
    <Badge variant={variant} className="gap-1 px-2">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  )
}
