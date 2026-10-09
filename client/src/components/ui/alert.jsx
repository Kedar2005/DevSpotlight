import { cn } from "../../lib/utils"

const tones = {
  error: "border-destructive/30 bg-destructive/5 text-destructive",
  success: "border-success/30 bg-success/5 text-success",
  warning: "border-warning/30 bg-warning/5 text-warning",
  info: "border-border bg-muted/60 text-foreground",
}

export function Alert({ tone = "info", className, children, ...props }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-3 py-2.5 text-sm", tones[tone], className)}
      {...props}
    >
      {children}
    </div>
  )
}
