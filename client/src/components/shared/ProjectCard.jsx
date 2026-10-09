import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageSquare, GitBranch, ExternalLink, Pencil, ImageOff, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { RequestCollaboration } from "./RequestCollaboration";
import { toggleProjectLike } from "../../api/project.api";
import { useAuth } from "../../hooks/useAuth";
import { normalizeUrl } from "../../lib/utils";

/**
 * `onChange(patch)` lets the parent page keep its list in sync after a like or a request.
 */
export function ProjectCard({ project, onChange }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [liking, setLiking] = useState(false);

  if (!project) return null;

  const owner = project.userId;
  const isOwner = Boolean(user && owner?._id === user._id);
  const cover = project.images?.[0];

  const handleLike = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return navigate("/login");
    setLiking(true);
    try {
      const result = await toggleProjectLike(project._id);
      onChange?.({ likeCount: result.likeCount, likedByMe: result.liked });
    } catch (error) {
      console.error("Failed to toggle like", error);
    } finally {
      setLiking(false);
    }
  };

  return (
    <Card className="group flex h-full flex-col overflow-hidden border border-border bg-card transition-all hover:border-border/80 hover:shadow-sm">
      {/* Cover thumbnail */}
      <Link to={`/project/${project._id}`} className="relative block aspect-[16/9] overflow-hidden border-b border-border bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={project.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <ImageOff className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />
            <span className="font-code text-xs">No screenshot preview</span>
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded bg-background/90 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm border border-border/50">
          {project.category || "General"}
        </span>
      </Link>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title & Date */}
        <div className="flex items-start justify-between gap-2">
          <Link to={`/project/${project._id}`} className="group/title flex-1">
            <h3 className="line-clamp-1 text-base font-semibold text-foreground group-hover/title:text-primary transition-colors">
              {project.title}
            </h3>
          </Link>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Short description */}
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground flex-1">
          {project.description}
        </p>

        {/* Tech tags */}
        {project.techStack?.length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {project.techStack.slice(0, 4).map((tech) => (
              <Badge key={tech} variant="tech" className="text-[11px] py-0 px-2">
                {tech}
              </Badge>
            ))}
            {project.techStack.length > 4 ? (
              <Badge variant="tech" className="text-[11px] py-0 px-1.5">
                +{project.techStack.length - 4}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {/* Developer info & external links */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <Link
            to={`/u/${owner?.userName}`}
            className="flex min-w-0 items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Avatar user={owner} size="xs" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground leading-none">
                {owner?.name || `@${owner?.userName}`}
              </p>
              {owner?.name && (
                <p className="truncate text-[10px] text-muted-foreground leading-tight mt-0.5">
                  @{owner?.userName}
                </p>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {project.githubLink ? (
              <a
                href={normalizeUrl(project.githubLink)}
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub Repository"
                aria-label="GitHub repository"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <GitBranch className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {project.liveLink ? (
              <a
                href={normalizeUrl(project.liveLink)}
                target="_blank"
                rel="noreferrer"
                title="Live Demo"
                aria-label="Live demo"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer Bar: Likes, Comments, View / Action */}
      <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-3 py-2 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleLike}
            disabled={liking}
            aria-label="Like project"
            className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
              project.likedByMe
                ? "text-red-600 bg-red-50 hover:bg-red-100 font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${project.likedByMe ? "fill-current" : ""}`} />
            <span>{project.likeCount || 0}</span>
          </button>

          <Link
            to={`/project/${project._id}#comments`}
            className="flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{project.commentCount || 0}</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            to={`/project/${project._id}`}
            className="inline-flex items-center gap-0.5 rounded px-2 py-1 font-medium text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <span>Details</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>

          {isOwner ? (
            <Button asChild variant="outline" size="xs">
              <Link to={`/project/${project._id}/edit`}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Link>
            </Button>
          ) : (
            <RequestCollaboration
              size="xs"
              project={project}
              collaboration={project.collaboration}
              onSent={(saved) => onChange?.({ collaboration: { _id: saved._id, status: saved.status } })}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
