import { useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "./button"

export function Modal({ open, onClose, title, description, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[90vh] w-full flex-col rounded-lg border bg-card shadow-lg ${wide ? "max-w-2xl" : "max-w-md"}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
