import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { UserPlus, CheckCircle2, ArrowRight } from "lucide-react";
import { getReceivedRequests } from "../api/collaboration.api";
import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";

export function Notifications() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getReceivedRequests()
      .then((data) => {
        if (!active) return;
        setRequests(data || []);
      })
      .catch((err) => console.error("Could not load notifications", err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const pastRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
            {pendingRequests.length > 0 && (
              <span className="rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-xs font-semibold">
                {pendingRequests.length} new
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Activity updates on your projects, collaboration requests, and developer feedback.
          </p>
        </div>

        <Button asChild variant="outline" size="xs">
          <Link to="/requests">
            View All Requests
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="mt-6 space-y-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-card" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">You're all caught up!</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              No unread notifications or pending collaboration requests.
            </p>
          </div>
        ) : (
          <>
            {/* Group 1: Actionable / Pending Collaboration Requests */}
            {pendingRequests.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Action Required ({pendingRequests.length})
                  </h2>
                </div>
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {pendingRequests.map((req) => (
                    <li key={req._id} className="p-4 transition-colors hover:bg-muted/10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Avatar user={req.sender} size="sm" className="mt-0.5" />
                          <div className="text-xs space-y-1">
                            <p className="text-foreground">
                              <span className="font-semibold">
                                {req.sender?.fullName || `@${req.sender?.userName}`}
                              </span>{" "}
                              {String(req.project?.userId) === String(req.sender?._id)
                                ? "invited you to collaborate on"
                                : "requested to collaborate on"}{" "}
                              <span className="font-medium text-foreground">
                                {req.project?.title || "your project"}
                              </span>
                            </p>
                            {req.message && (
                              <p className="text-muted-foreground italic line-clamp-1">
                                &quot;{req.message}&quot;
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        <Button asChild size="xs" variant="outline">
                          <Link to="/requests">Review</Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Group 2: Recent Activity */}
            {pastRequests.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Earlier Activity ({pastRequests.length})
                </h2>
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {pastRequests.map((req) => (
                    <li key={req._id} className="p-4 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <UserPlus className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-foreground">
                              Collaboration request from{" "}
                              <span className="font-semibold">
                                @{req.sender?.userName}
                              </span>{" "}
                              was{" "}
                              <span
                                className={`font-medium ${
                                  req.status === "approved"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {req.status}
                              </span>
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        <span className="rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                          {req.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
