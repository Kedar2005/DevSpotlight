import { useState } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { Check, X, Undo2, MessageSquare } from "lucide-react";
import {
  approveCollaborationRequest,
  rejectCollaborationRequest,
  withdrawCollaborationRequest,
} from "../../api/collaboration.api";
import { getErrorMessage } from "../../lib/errors";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/status-badge";
import { Alert } from "../ui/alert";

/**
 * One row in the collaboration list.
 *  direction="incoming": someone asked to join MY project -> Approve / Reject.
 *  direction="sent":     I asked to join someone else's  -> shows status, can withdraw while pending.
 */
export function RequestItem({ request, direction, onUpdate, onRemove }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const person = direction === "incoming" ? request.sender : request.receiver;
  const project = request.project;
  const displayName = person?.fullName || person?.name || person?.userName || "Student Developer";

  const respond = async (kind) => {
    setBusy(kind);
    setError("");
    try {
      const updated =
        kind === "approve"
          ? await approveCollaborationRequest(request._id)
          : await rejectCollaborationRequest(request._id);
      onUpdate?.(updated);
    } catch (err) {
      setError(getErrorMessage(err, `Couldn't ${kind} this request.`));
    } finally {
      setBusy("");
    }
  };

  const withdraw = async () => {
    setBusy("withdraw");
    setError("");
    try {
      await withdrawCollaborationRequest(request._id);
      onRemove?.(request._id);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't withdraw this request."));
      setBusy("");
    }
  };

  return (
    <li className="p-4 sm:p-5 transition-colors hover:bg-muted/10">
      <div className="flex items-start gap-3.5">
        <Avatar user={person} size="md" className="mt-0.5" />

        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Header row: Person, action text, status */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 text-sm">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <Link
                  to={`/u/${person?.userName}`}
                  className="font-semibold text-foreground hover:underline"
                >
                  {displayName}
                </Link>
                <span className="font-code text-xs text-muted-foreground">
                  @{person?.userName}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {direction === "incoming"
                  ? String(project?.userId) === String(request.sender?._id)
                    ? "invited you to collaborate on "
                    : "requested to collaborate on "
                  : String(project?.userId) === String(request.sender?._id)
                    ? "You invited to collaborate on "
                    : "You requested to join "}
                {project ? (
                  <Link
                    to={`/project/${project._id}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {project.title}
                  </Link>
                ) : (
                  <span className="italic">a deleted project</span>
                )}
              </p>
            </div>

            <StatusBadge status={request.status} />
          </div>

          {/* Reason / note if provided */}
          {request.message ? (
            <div className="rounded border border-border/80 bg-muted/40 p-3 text-xs text-foreground/90 leading-relaxed font-sans">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1 text-[11px]">
                <MessageSquare className="h-3 w-3" />
                <span>Note from student:</span>
              </div>
              <p className="whitespace-pre-wrap">{request.message}</p>
            </div>
          ) : null}

          {error ? <Alert tone="error">{error}</Alert> : null}

          {/* Actions & Timestamp row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40 text-xs">
            <p className="text-[11px] text-muted-foreground" title={format(new Date(request.createdAt), "PPpp")}>
              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              {request.status !== "pending" && request.respondedAt
                ? ` • answered ${format(new Date(request.respondedAt), "MMM d")}`
                : ""}
            </p>

            {/* Decision actions for incoming pending */}
            {request.status === "pending" && direction === "incoming" ? (
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  onClick={() => respond("approve")}
                  disabled={Boolean(busy)}
                  className="font-medium"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  {busy === "approve" ? "Accepting..." : "Accept"}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => respond("reject")}
                  disabled={Boolean(busy)}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  {busy === "reject" ? "Rejecting..." : "Reject"}
                </Button>
              </div>
            ) : null}

            {/* Workspace action for approved requests (Requirement 7) */}
            {request.status === "approved" && project?._id && (
              <Button asChild size="xs" variant="default" className="font-semibold shadow-sm">
                <Link to={`/workspace/${project._id}`}>
                  Collaboration Workspace →
                </Link>
              </Button>
            )}

            {/* Withdraw action for sent pending */}
            {request.status === "pending" && direction === "sent" ? (
              <Button
                size="xs"
                variant="outline"
                onClick={withdraw}
                disabled={Boolean(busy)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Undo2 className="mr-1 h-3.5 w-3.5" />
                {busy === "withdraw" ? "Withdrawing..." : "Withdraw Request"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
