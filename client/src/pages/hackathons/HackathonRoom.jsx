import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Upload, Users, FolderGit2, Lock, Globe, CalendarDays } from "lucide-react";
import { getHackathonRoom, getRoomSubmissions } from "../../api/hackathon.api";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../lib/errors";
import { HACKATHON_STATUS, ROOM_STATUS, SUBMISSION_STATUS, formatDate } from "../../lib/hackathon";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert } from "../../components/ui/alert";
import { Avatar } from "../../components/ui/avatar";
import { LoadingState, EmptyState, StatusPill } from "../../components/shared/PageState";

function SubmissionCard({ submission: s, showStatus }) {
  const project = s.project;
  const team = [s.submittedBy, ...(s.teamMembers || [])].filter(Boolean);
  return (
    <article className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium">{project?.title || "Project unavailable"}</h3>
        {showStatus && <StatusPill map={SUBMISSION_STATUS} status={s.status} />}
      </div>
      {project?.description && <p className="line-clamp-3 text-sm text-muted-foreground">{project.description}</p>}
      {project?.techStack?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.techStack.map((t) => (
            <Badge key={t} variant="tech">
              {t}
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {team.map((m) => m.fullName || m.userName).join(", ")} · submitted {formatDate(s.submittedAt, true)}
      </p>
      {s.notes && <p className="text-xs italic text-muted-foreground">Notes: {s.notes}</p>}
      <div className="flex flex-wrap gap-3 text-xs">
        {project?._id && (
          <Link to={`/project/${project._id}`} className="text-primary hover:underline">
            Project page
          </Link>
        )}
        {project?.githubLink && (
          <a href={project.githubLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Repository
          </a>
        )}
        {project?.liveLink && (
          <a href={project.liveLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Live demo
          </a>
        )}
      </div>
    </article>
  );
}

export default function HackathonRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getHackathonRoom(roomId), getRoomSubmissions(roomId)])
      .then(([roomData, submissionData]) => {
        if (!active) return;
        setRoom(roomData);
        setSubmissions(submissionData || []);
        setError("");
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Failed to load the hackathon room."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [roomId]);

  // Registrations grouped by team name; individual entrants form their own group.
  const teams = useMemo(() => {
    const groups = new Map();
    (room?.participants || []).forEach((p) => {
      const key = p.teamName?.trim() || `solo-${p._id}`;
      if (!groups.has(key)) groups.set(key, { name: p.teamName?.trim() || "", members: [] });
      groups.get(key).members.push(p);
    });
    return [...groups.values()];
  }, [room]);

  if (loading) return <LoadingState label="Loading room…" />;

  if (error || !room) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-center">
        <Alert tone="error">{error || "Room not found."}</Alert>
        <Button asChild variant="outline" size="sm">
          <Link to="/hackathons">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> All hackathons
          </Link>
        </Button>
      </div>
    );
  }

  const h = room.hackathon;
  const isPublicView = room.access === "public";
  const userId = String(user?._id || "");
  const mySubmissions = submissions.filter(
    (s) => String(s.submittedBy?._id) === userId || (s.teamMembers || []).some((m) => String(m._id) === userId)
  );
  const submissionsOpen =
    room.access === "participant" &&
    room.status !== "archived" &&
    !["completed", "cancelled", "draft"].includes(h.status) &&
    new Date() <= new Date(h.endDate);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        to={`/hackathon/${h.slug || h._id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Hackathon details
      </Link>

      <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill map={HACKATHON_STATUS} status={h.status} />
            <StatusPill map={ROOM_STATUS} status={room.status} />
            {room.visibility === "public" ? (
              <Badge variant="success" className="gap-1">
                <Globe className="h-3 w-3" aria-hidden="true" /> Published
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" aria-hidden="true" /> Private room
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{room.title}</h1>
          <p className="text-sm text-muted-foreground">
            {h.organizer} · {formatDate(h.startDate)} – {formatDate(h.endDate)}
          </p>
        </div>
        {submissionsOpen && (
          <Button asChild>
            <Link to={`/hackathon/room/${room._id}/submit`}>
              <Upload className="h-4 w-4" aria-hidden="true" /> Submit project
            </Link>
          </Button>
        )}
      </header>

      {isPublicView && (
        <Alert tone="info">This is the published showcase view. Only accepted submissions are shown.</Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {room.access === "participant" && (
            <section className="rounded-lg border border-border bg-card p-5" aria-labelledby="my-submission">
              <h2 id="my-submission" className="mb-3 text-sm font-semibold">Your submission</h2>
              {mySubmissions.length ? (
                <ul className="space-y-2">
                  {mySubmissions.map((s) => (
                    <li key={s._id} className="flex items-center justify-between gap-2 text-sm">
                      <span>{s.project?.title || "Project"}</span>
                      <StatusPill map={SUBMISSION_STATUS} status={s.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {submissionsOpen
                    ? `No project submitted yet. Submissions close ${formatDate(h.endDate, true)}.`
                    : "You did not submit a project."}
                </p>
              )}
            </section>
          )}

          <section aria-labelledby="submissions-heading" className="space-y-3">
            <h2 id="submissions-heading" className="flex items-center gap-2 text-sm font-semibold">
              <FolderGit2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {isPublicView ? "Projects" : "Submissions"} ({submissions.length})
            </h2>
            {submissions.length === 0 ? (
              <div className="rounded-lg border border-border bg-card">
                <EmptyState icon={FolderGit2} title="No projects yet" />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {submissions.map((s) => (
                  <SubmissionCard key={s._id} submission={s} showStatus={!isPublicView} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5" aria-labelledby="deadlines">
            <h2 id="deadlines" className="mb-3 text-sm font-semibold">Deadlines</h2>
            <dl className="space-y-2 text-sm">
              {[
                ["Registration closes", h.registrationDeadline],
                ["Event starts", h.startDate],
                ["Submissions due", h.endDate],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className="text-right font-medium">{formatDate(value, true)}</dd>
                </div>
              ))}
            </dl>
          </section>

          {!isPublicView && (
            <section className="rounded-lg border border-border bg-card p-5" aria-labelledby="teams">
              <h2 id="teams" className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Participants ({room.participants?.length || 0})
              </h2>
              {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No one has registered yet.</p>
              ) : (
                <ul className="space-y-3">
                  {teams.map((team, i) => (
                    <li key={team.name || i}>
                      {team.name && <p className="mb-1 text-xs font-semibold text-muted-foreground">Team {team.name}</p>}
                      <ul className="space-y-1.5">
                        {team.members.map((m) => (
                          <li key={m._id} className="flex items-center gap-2 text-sm">
                            <Avatar user={m.user} size="xs" />
                            {m.user?.userName ? (
                              <Link to={`/u/${m.user.userName}`} className="truncate hover:text-primary">
                                {m.user.fullName || m.user.userName}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">Deleted user</span>
                            )}
                            <span className="ml-auto truncate text-xs text-muted-foreground">
                              {m.college?.code || m.user?.collegeName || ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {room.participatingColleges?.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-5" aria-labelledby="colleges">
              <h2 id="colleges" className="mb-2 text-sm font-semibold">Participating colleges</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {room.participatingColleges.map((c) => (
                  <li key={c._id}>{c.name}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
