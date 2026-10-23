import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Award, CalendarDays, Users } from "lucide-react";
import { getPublicShowcase } from "../../api/hackathon.api";
import { getErrorMessage } from "../../lib/errors";
import { formatDate } from "../../lib/hackathon";
import { Badge } from "../../components/ui/badge";
import { Alert } from "../../components/ui/alert";
import { PageHeader, LoadingState, EmptyState } from "../../components/shared/PageState";

function ShowcaseProject({ submission: s }) {
  const p = s.project;
  const team = [s.submittedBy, ...(s.teamMembers || [])].filter(Boolean);
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4">
      <h4 className="font-medium">{p.title}</h4>
      <p className="line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
      {p.techStack?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {p.techStack.map((t) => (
            <Badge key={t} variant="tech">
              {t}
            </Badge>
          ))}
        </div>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        {team.map((m, i) => (
          <span key={m._id}>
            <Link to={`/u/${m.userName}`} className="hover:text-primary">
              {m.fullName || m.userName}
            </Link>
            {i < team.length - 1 ? "," : ""}
          </span>
        ))}
      </p>
      <div className="mt-auto flex flex-wrap gap-3 pt-1 text-xs">
        <Link to={`/project/${p._id}`} className="text-primary hover:underline">
          Project page
        </Link>
        {p.githubLink && (
          <a href={p.githubLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Repository
          </a>
        )}
        {p.liveLink && (
          <a href={p.liveLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Live demo
          </a>
        )}
      </div>
    </article>
  );
}

export default function PublicHackathonShowcase() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPublicShowcase()
      .then((data) => {
        if (!active) return;
        setRooms(data || []);
        setError("");
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Failed to load the showcase."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <Link to="/hackathons" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> All hackathons
      </Link>

      <PageHeader
        title="Hackathon Showcase"
        description="Projects from completed hackathons, published by the organizers."
      />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <LoadingState label="Loading showcase…" />
      ) : rooms.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState icon={Award} title="Nothing published yet" description="Completed hackathons appear here once organizers publish them." />
        </div>
      ) : (
        <div className="space-y-6">
          {rooms.map((room) => {
            const h = room.hackathon;
            const teamCount = new Set(room.submissions.map((s) => String(s.submittedBy?._id))).size;
            return (
              <section key={room._id} className="rounded-lg border border-border bg-card p-5" aria-labelledby={`showcase-${room._id}`}>
                <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 id={`showcase-${room._id}`} className="text-lg font-semibold">
                      <Link to={`/hackathon/${h.slug || h._id}`} className="hover:text-primary">
                        {h.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {h.organizer}
                      {room.participatingColleges?.length ? ` · ${room.participatingColleges.map((c) => c.name).join(", ")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground sm:items-end">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDate(h.startDate)} – {formatDate(h.endDate)}
                    </span>
                    <span>
                      {room.submissions.length} {room.submissions.length === 1 ? "project" : "projects"} · {teamCount}{" "}
                      {teamCount === 1 ? "team" : "teams"}
                    </span>
                  </div>
                </div>
                {h.description && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{h.description}</p>}
                {room.submissions.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No projects have been published for this hackathon.</p>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {room.submissions.map((s) => (
                      <ShowcaseProject key={s._id} submission={s} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
