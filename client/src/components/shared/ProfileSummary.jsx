import { Link } from "react-router-dom";
import { format } from "date-fns";
import { GitBranch, CalendarDays, ExternalLink, Code2 } from "lucide-react";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { normalizeUrl } from "../../lib/utils";

// Shared by the signed-in user's profile and public profiles.
export function ProfileSummary({ user, stats, children }) {
  if (!user) return null;

  const displayName = user.fullName || user.name || user.userName;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Cover banner */}
      <div className="h-28 bg-muted border-b border-border relative overflow-hidden">
        {user.coverImage ? (
          <img src={user.coverImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-muted to-muted/80 flex items-center justify-end px-4">
            <Code2 className="h-12 w-12 text-muted-foreground/20 stroke-1" />
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Avatar */}
        <Avatar
          user={user}
          size="xl"
          className="-mt-14 border-4 border-card bg-card shadow-sm"
        />

        {/* User Identity */}
        <div className="mt-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {displayName}
          </h1>
          <p className="font-code text-xs text-muted-foreground">
            @{user.userName}
          </p>
        </div>

        {/* Bio */}
        <p className="mt-3 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {user.bio || "Student developer on DevSpotlight."}
        </p>

        {/* Meta Info */}
        <ul className="mt-4 space-y-2 text-xs text-muted-foreground border-t border-border/70 pt-3">
          {user.githubLink ? (
            <li>
              <a
                href={normalizeUrl(user.githubLink)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline transition-colors font-code text-xs"
              >
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">
                  {user.githubLink.replace(/^https?:\/\/(www\.)?github\.com\/?/, "github.com/")}
                </span>
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </a>
            </li>
          ) : null}

          {user.createdAt ? (
            <li className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span>Joined {format(new Date(user.createdAt), "MMMM yyyy")}</span>
            </li>
          ) : null}
        </ul>

        {/* Stats if available */}
        {stats && (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/70 pt-3 text-center">
            <div className="rounded border border-border bg-muted/40 p-2">
              <p className="text-base font-bold text-foreground">{stats.projectsCount ?? 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Projects</p>
            </div>
            <div className="rounded border border-border bg-muted/40 p-2">
              <p className="text-base font-bold text-foreground">{stats.collaborationsCount ?? 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Collabs</p>
            </div>
          </div>
        )}

        {/* Technical Skills */}
        <div className="mt-4 border-t border-border/70 pt-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Skills & Tools
          </h2>
          {user.skills?.length ? (
            <div className="flex flex-wrap gap-1">
              {user.skills.map((skill) => (
                <Badge key={skill} variant="tech" className="text-[11px] py-0 px-2">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No skills listed yet.</p>
          )}
        </div>

        {/* Extra children buttons (e.g. Edit Profile, Follow) */}
        {children && <div className="mt-5 border-t border-border/70 pt-4">{children}</div>}
      </div>
    </div>
  );
}

export function CollaborationActivity({ items }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">
          Collaboration Activity
        </h2>
        <span className="text-xs text-muted-foreground font-medium">
          {items.length} {items.length === 1 ? "project" : "projects"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          Not collaborating on any other student projects yet.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((item) => (
            <li key={item._id} className="flex items-center justify-between gap-3 p-3.5 text-xs">
              <div className="min-w-0">
                <span className="text-muted-foreground">Contributing to </span>
                <Link
                  to={`/project/${item.project?._id}`}
                  className="font-semibold text-foreground hover:text-primary hover:underline"
                >
                  {item.project?.title || "Untitled Project"}
                </Link>
              </div>
              {item.since ? (
                <span className="shrink-0 font-code text-[11px] text-muted-foreground">
                  since {format(new Date(item.since), "MMM yyyy")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
