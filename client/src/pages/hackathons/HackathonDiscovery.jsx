import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Trophy, CalendarDays, Clock, Users, Award } from "lucide-react";
import { getHackathons } from "../../api/hackathon.api";
import { getErrorMessage } from "../../lib/errors";
import { HACKATHON_STATUS, formatDate, hackathonPhase } from "../../lib/hackathon";
import { cn } from "../../lib/utils";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert } from "../../components/ui/alert";
import { PageHeader, LoadingState, EmptyState, StatusPill } from "../../components/shared/PageState";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

function HackathonCard({ hackathon: h }) {
  return (
    <article className="flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground">{h.title}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {h.organizer}
            {h.participatingColleges?.length ? ` · ${h.participatingColleges.map((c) => c.code || c.name).join(", ")}` : ""}
          </p>
        </div>
        <StatusPill map={HACKATHON_STATUS} status={h.status} />
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{h.description}</p>

      <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <dt className="sr-only">Event dates</dt>
          <dd>
            {formatDate(h.startDate)} – {formatDate(h.endDate)}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <dt className="sr-only">Registration deadline</dt>
          <dd>Register by {formatDate(h.registrationDeadline)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <dt className="sr-only">Participants</dt>
          <dd>
            {h.participantCount} registered
            {h.maximumParticipants ? ` of ${h.maximumParticipants}` : ""}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <dt className="sr-only">Format</dt>
          <dd>{h.participationMode === "team" ? `Teams of up to ${h.maximumTeamSize}` : "Individual"}</dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        {h.registrationOpen ? (
          <Badge variant="success">Registration open</Badge>
        ) : (
          <Badge variant="outline">Registration closed</Badge>
        )}
        <Button asChild size="sm" variant="outline">
          <Link to={`/hackathon/${h.slug || h._id}`}>View details</Link>
        </Button>
      </div>
    </article>
  );
}

export default function HackathonDiscovery() {
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    getHackathons()
      .then((data) => {
        if (!active) return;
        setHackathons(data || []);
        setError("");
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Failed to load hackathons."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const result = { all: hackathons.length, upcoming: 0, active: 0, completed: 0 };
    hackathons.forEach((h) => (result[hackathonPhase(h.status)] += 1));
    return result;
  }, [hackathons]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hackathons.filter(
      (h) =>
        (filter === "all" || hackathonPhase(h.status) === filter) &&
        (!q ||
          h.title.toLowerCase().includes(q) ||
          h.organizer?.toLowerCase().includes(q) ||
          h.theme?.toLowerCase().includes(q))
    );
  }, [hackathons, filter, query]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Hackathons"
        description="Find hackathons from participating colleges, register, and build with your team."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/hackathons/showcase">
              <Award className="h-4 w-4" aria-hidden="true" />
              Showcase
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter hackathons">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                filter === f.key ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              {f.label} <span className="text-xs text-muted-foreground">({counts[f.key]})</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Search hackathons"
            placeholder="Search by title, organizer or theme"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <LoadingState label="Loading hackathons…" />
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon={Trophy}
            title="No hackathons found"
            description={hackathons.length ? "Try another filter or search." : "Check back soon for new events."}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((h) => (
            <HackathonCard key={h._id} hackathon={h} />
          ))}
        </div>
      )}
    </div>
  );
}
