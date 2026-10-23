import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardCheck, Check, X, RotateCcw } from "lucide-react";
import { getAdminSubmissions, getAdminHackathons, updateSubmissionStatus } from "../../api/admin.api";
import { getErrorMessage } from "../../lib/errors";
import { SUBMISSION_STATUS, formatDate } from "../../lib/hackathon";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { PageHeader, LoadingState, EmptyState, StatusPill, ConfirmDialog } from "../../components/shared/PageState";

export default function AdminSubmissions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const hackathonFilter = searchParams.get("hackathon") || "";
  const statusFilter = searchParams.get("status") || "submitted";

  const [submissions, setSubmissions] = useState([]);
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, setPending] = useState(null); // { submission, status }
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    getAdminHackathons()
      .then((data) => setHackathons(data || []))
      .catch(() => setHackathons([]));
  }, []);

  useEffect(() => {
    let active = true;
    getAdminSubmissions({ status: statusFilter, hackathon: hackathonFilter || undefined })
      .then((data) => {
        if (!active) return;
        setSubmissions(data || []);
        setError("");
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Failed to load submissions."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [statusFilter, hackathonFilter, reloadKey]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setLoading(true);
    setSearchParams(next, { replace: true });
  };

  const confirm = async () => {
    setBusy(true);
    setActionError("");
    try {
      await updateSubmissionStatus(pending.submission._id, pending.status);
      setNotice(`"${pending.submission.project?.title || "Submission"}" marked as ${SUBMISSION_STATUS[pending.status].label.toLowerCase()}.`);
      setPending(null);
      setLoading(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to update submission."));
    } finally {
      setBusy(false);
    }
  };

  const ask = (submission, status) => {
    setActionError("");
    setPending({ submission, status });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submissions"
        description="Review hackathon project submissions. Only accepted submissions appear on a published showcase."
      />

      {notice && (
        <Alert tone="success" className="flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button type="button" className="text-xs hover:underline" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row">
        <Select
          aria-label="Filter by review status"
          value={statusFilter}
          onChange={(e) => setFilter("status", e.target.value)}
          className="h-8 text-xs sm:w-44"
        >
          <option value="all">All statuses</option>
          {Object.entries(SUBMISSION_STATUS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by hackathon"
          value={hackathonFilter}
          onChange={(e) => setFilter("hackathon", e.target.value)}
          className="h-8 text-xs sm:w-64"
        >
          <option value="">All hackathons</option>
          {hackathons.map((h) => (
            <option key={h._id} value={h._id}>
              {h.title}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <LoadingState label="Loading submissions…" />
        ) : submissions.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No submissions" description="Nothing matches the selected filters." />
        ) : (
          <ul className="divide-y divide-border">
            {submissions.map((s) => (
              <li key={s._id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{s.project?.title || "Deleted project"}</p>
                    <StatusPill map={SUBMISSION_STATUS} status={s.status} />
                    {s.project?.isDeleted && <Badge variant="danger">Project moderated</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.hackathon?.title || "Hackathon"} · submitted {formatDate(s.submittedAt, true)} by{" "}
                    {s.submittedBy?.fullName || s.submittedBy?.userName || "unknown"}
                    {s.teamMembers?.length
                      ? ` with ${s.teamMembers.map((m) => m.fullName || m.userName).join(", ")}`
                      : ""}
                  </p>
                  {s.project?.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{s.project.description}</p>
                  )}
                  {s.notes && <p className="text-xs italic text-muted-foreground">Notes: {s.notes}</p>}
                  <div className="flex flex-wrap gap-3 text-xs">
                    {s.project && !s.project.isDeleted && (
                      <Link to={`/project/${s.project._id}`} target="_blank" className="text-primary hover:underline">
                        Project page
                      </Link>
                    )}
                    {s.project?.githubLink && (
                      <a href={s.project.githubLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        Repository
                      </a>
                    )}
                    {s.project?.liveLink && (
                      <a href={s.project.liveLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        Live demo
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {s.status !== "accepted" && (
                    <Button size="xs" onClick={() => ask(s, "accepted")}>
                      <Check className="h-3 w-3" aria-hidden="true" /> Accept
                    </Button>
                  )}
                  {s.status !== "rejected" && (
                    <Button variant="outline" size="xs" onClick={() => ask(s, "rejected")}>
                      <X className="h-3 w-3" aria-hidden="true" /> Reject
                    </Button>
                  )}
                  {s.status !== "submitted" && (
                    <Button variant="ghost" size="xs" onClick={() => ask(s, "submitted")}>
                      <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={`Mark as ${pending ? SUBMISSION_STATUS[pending.status].label.toLowerCase() : ""}?`}
        description={
          pending?.status === "accepted"
            ? "Accepted submissions are shown on the public showcase once the room is published."
            : pending?.status === "rejected"
              ? "Rejected submissions never appear on the public showcase."
              : "The submission returns to the review queue."
        }
        confirmLabel="Confirm"
        destructive={pending?.status === "rejected"}
        busy={busy}
        error={actionError}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
