import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, DoorOpen, CalendarDays } from "lucide-react";
import { getMyHackathons } from "../../api/hackathon.api";
import { getErrorMessage } from "../../lib/errors";
import { HACKATHON_STATUS, SUBMISSION_STATUS, formatDate } from "../../lib/hackathon";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert } from "../../components/ui/alert";
import { PageHeader, LoadingState, EmptyState, StatusPill } from "../../components/shared/PageState";

export default function MyHackathons() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getMyHackathons()
      .then((data) => {
        if (active) setItems(data || []);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Couldn't load your hackathons."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="My Hackathons"
        description="Hackathons you have registered for, with dates and your submission status."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/hackathons">Browse hackathons</Link>
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <LoadingState label="Loading your hackathons…" />
      ) : !error && items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon={Trophy}
            title="No registrations yet"
            description="When you register for a hackathon it will appear here."
            action={
              <Button asChild size="sm" className="mt-2">
                <Link to="/hackathons">Find a hackathon</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => {
            const h = r.hackathon;
            const canOpenDetails = h.visibility === "public" && h.status !== "draft";
            return (
              <li key={r._id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{h.title}</h2>
                      <StatusPill map={HACKATHON_STATUS} status={h.status} />
                      <Badge variant={r.status === "registered" ? "success" : "outline"} className="capitalize">
                        {r.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {h.organizer}
                      {r.teamName ? ` · Team ${r.teamName}` : ""}
                      {r.college ? ` · ${r.college}` : ""}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      Event {formatDate(h.startDate)} – {formatDate(h.endDate)} · Submissions due{" "}
                      {formatDate(h.endDate, true)} · Registered {formatDate(r.registeredAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submission:{" "}
                      {r.submissions.length ? (
                        r.submissions.map((s, i) => (
                          <span key={i} className="mr-1 inline-block">
                            <StatusPill map={SUBMISSION_STATUS} status={s} />
                          </span>
                        ))
                      ) : (
                        <span>not submitted yet</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {canOpenDetails && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/hackathon/${h.slug || h._id}`}>Details</Link>
                      </Button>
                    )}
                    {r.roomId && (
                      <Button asChild size="sm">
                        <Link to={`/hackathon/room/${r.roomId}`}>
                          <DoorOpen className="h-4 w-4" aria-hidden="true" /> Open room
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
