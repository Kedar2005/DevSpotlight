import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { FolderGit2, PlusCircle, Heart, Users, GitBranch, Compass, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getMyProjects } from "../api/project.api";
import { getReceivedRequests, getSentRequests } from "../api/collaboration.api";
import { getErrorMessage } from "../lib/errors";
import { ProjectCard } from "../components/shared/ProjectCard";
import { RequestItem } from "../components/shared/RequestItem";
import { Avatar } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";

const Stat = ({ icon: Icon, label, value, hint }) => (
  <div className="rounded-lg border border-border bg-card p-4 transition-colors">
    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <span>{label}</span>
      <Icon className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
    </div>
    <p className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
    {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

export function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getMyProjects(), getReceivedRequests(), getSentRequests()])
      .then(([mine, received, mineSent]) => {
        if (!active) return;
        setProjects(mine || []);
        setIncoming(received || []);
        setSent(mineSent || []);
      })
      .catch((err) => active && setError(getErrorMessage(err, "Couldn't load your dashboard.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const pending = incoming.filter((request) => request.status === "pending");
  const totalLikes = projects.reduce((sum, project) => sum + (project.likeCount || 0), 0);
  const collaborations = sent.filter((request) => request.status === "approved").length;

  const displayName = user?.fullName || user?.name || user?.userName || "Developer";
  const firstName = displayName.split(" ")[0];

  // Recent activity built from real records
  const activity = useMemo(() => {
    const items = [
      ...projects.map((p) => ({
        id: `p${p._id}`,
        at: p.createdAt,
        text: (
          <>
            You published <Link className="font-semibold text-foreground hover:underline" to={`/project/${p._id}`}>{p.title}</Link>
          </>
        ),
      })),
      ...incoming.map((r) => ({
        id: `i${r._id}`,
        at: r.createdAt,
        text: (
          <>
            <Link className="font-semibold text-foreground hover:underline" to={`/u/${r.sender?.userName}`}>@{r.sender?.userName}</Link> requested to collaborate on <span className="font-medium text-foreground">{r.project?.title}</span>
          </>
        ),
      })),
      ...sent.map((r) => ({
        id: `s${r._id}`,
        at: r.respondedAt || r.createdAt,
        text:
          r.status === "pending" ? (
            <>
              You asked to collaborate on <span className="font-medium text-foreground">{r.project?.title}</span>
            </>
          ) : (
            <>
              Your request to join <span className="font-medium text-foreground">{r.project?.title}</span> was {r.status}
              {r.status === "approved" && r.project?._id && (
                <Link to={`/workspace/${r.project._id}`} className="ml-1.5 text-primary font-semibold hover:underline">
                  [Workspace →]
                </Link>
              )}
            </>
          ),
      })),
    ];
    return items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);
  }, [projects, incoming, sent]);

  const replaceIncoming = (updated) =>
    setIncoming((list) => list.map((item) => (item._id === updated._id ? updated : item)));
  const patchProject = (id, patch) =>
    setProjects((list) => list.map((p) => (p._id === id ? { ...p, ...patch } : p)));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your college projects, incoming collaboration requests, and developer activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/feed">
              <Compass className="mr-1.5 h-3.5 w-3.5" /> Explore Feed
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/create-project">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Publish Project
            </Link>
          </Button>
        </div>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {/* Profile snippet + Key Stats */}
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <section className="rounded-lg border border-border bg-card p-5" aria-label="Profile summary">
          <div className="flex items-center gap-3">
            <Avatar user={user} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-bold text-foreground">{displayName}</p>
              <p className="truncate font-code text-xs text-muted-foreground">@{user?.userName}</p>
            </div>
          </div>
          {user?.bio ? (
            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {user.bio}
            </p>
          ) : null}
          {user?.skills?.length ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {user.skills.slice(0, 5).map((s) => (
                <Badge key={s} variant="tech" className="text-[11px] py-0 px-1.5">
                  {s}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex gap-2 border-t border-border pt-3">
            <Button asChild variant="outline" size="xs" className="flex-1">
              <Link to="/profile">Edit Profile</Link>
            </Button>
            <Button asChild variant="ghost" size="xs" className="flex-1 text-muted-foreground hover:text-foreground">
              <Link to={`/u/${user?.userName}`}>Public View</Link>
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={FolderGit2} label="My Projects" value={projects.length} hint="Published builds" />
          <Stat icon={Heart} label="Likes" value={totalLikes} hint="From other students" />
          <Stat icon={Users} label="Pending Req" value={pending.length} hint="Awaiting review" />
          <Stat icon={GitBranch} label="Collabs" value={collaborations} hint="Active contributions" />
        </div>
      </div>

      {/* Collaboration Requests section */}
      <section aria-labelledby="collab-heading" className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <h2 id="collab-heading" className="text-base font-bold text-foreground">
              Collaboration Requests
            </h2>
            {pending.length > 0 && (
              <span className="rounded bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-xs font-semibold">
                {pending.length} pending
              </span>
            )}
          </div>
          <Link
            to="/requests"
            className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
          >
            View all requests <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="h-24 animate-pulse rounded-lg border border-border bg-card" />
        ) : pending.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            No pending collaboration requests waiting for you. When another student requests to join one of your projects, it will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {pending.slice(0, 3).map((request) => (
              <RequestItem
                key={request._id}
                request={request}
                direction="incoming"
                onUpdate={replaceIncoming}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Projects + Recent Activity */}
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="projects-heading" className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 id="projects-heading" className="text-base font-bold text-foreground">
              My Projects ({projects.length})
            </h2>
            <Link to="/profile" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Manage in Profile
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-lg border border-border bg-card" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
              <FolderGit2 className="mx-auto h-8 w-8 text-muted-foreground stroke-1" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-foreground">You haven't published a project yet</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                Add your semester project, hackathon build, or open source tool so peers can explore and collaborate.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/create-project">
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Publish First Project
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.slice(0, 4).map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  onChange={(patch) => patchProject(project._id, patch)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Activity feed */}
        <section aria-labelledby="activity-heading" className="space-y-3">
          <div className="border-b border-border pb-2">
            <h2 id="activity-heading" className="text-base font-bold text-foreground">
              Recent Activity
            </h2>
          </div>

          {activity.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              No recent activity yet.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {activity.map((item) => (
                <li key={item.id} className="p-3.5 text-xs">
                  <div className="text-foreground/90 leading-relaxed">{item.text}</div>
                  <p className="mt-1 font-code text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
