import { Loader2, Inbox } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { Alert } from "../ui/alert";

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}

// Badge from one of the status maps in lib/hackathon.js.
export function StatusPill({ map, status }) {
  const entry = map[status] || { label: status || "—", variant: "outline" };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  busy = false,
  error = "",
  onConfirm,
  onClose,
  children,
}) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title} description={description}>
      <div className="space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {children}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
