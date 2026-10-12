import { useEffect, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { GitBranch, ExternalLink, Heart, MessageSquare, Pencil, Eye, Tag, Users, Calendar, ArrowLeft, Sparkles } from "lucide-react";
import { getProjectById, toggleProjectLike } from "../api/project.api";
import { getProjectComments, addComment } from "../api/comment.api";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../lib/errors";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar } from "../components/ui/avatar";
import { Alert } from "../components/ui/alert";
import { Textarea } from "../components/ui/textarea";
import { StatusBadge } from "../components/ui/status-badge";
import { RequestCollaboration } from "../components/shared/RequestCollaboration";
import { normalizeUrl } from "../lib/utils";

export function ProjectDetails() {
  const { id } = useParams();
  return <ProjectDetailsView key={id} id={id} />;
}

function ProjectDetailsView({ id }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getProjectById(id), getProjectComments(id)])
      .then(([projectData, commentsData]) => {
        if (!active) return;
        setProject(projectData);
        setComments(commentsData);
        setActiveImage(0);
      })
      .catch((error) => active && setLoadError(getErrorMessage(error, "Couldn't load this project.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!loading && location.hash === "#comments") {
      document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, location.hash]);

  const handleLike = async () => {
    if (!isAuthenticated) return navigate("/login");
    try {
      const result = await toggleProjectLike(id);
      setProject((prev) => ({ ...prev, likeCount: result.likeCount, likedByMe: result.liked }));
    } catch (error) {
      console.error("Failed to toggle like", error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    setCommentError("");
    try {
      const comment = await addComment(id, { content: newComment });
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      setProject((prev) => ({ ...prev, commentCount: (prev.commentCount || 0) + 1 }));
    } catch (error) {
      setCommentError(getErrorMessage(error, "Couldn't post your comment."));
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6 sm:p-10 space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
        <div className="aspect-[16/9] w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Alert tone="error">{loadError || "Project not found."}</Alert>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/explore">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Explore
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const owner = project.userId;
  const isOwner = Boolean(user && owner?._id === user._id);
  const images = project.images || [];

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/explore"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Explore
        </Link>
      </div>

      {location.state?.saved ? (
        <Alert tone="success" className="mb-6">Changes saved successfully.</Alert>
      ) : null}

      {/* Project Header */}
      <header className="border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 font-medium text-foreground">
            <Tag className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            {project.category || "General"}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Published {format(new Date(project.createdAt), "MMM d, yyyy")}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Eye className="h-3 w-3" /> {project.visits || 0} views
          </span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {project.title}
          </h1>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {(isOwner || project.collaboration?.status === "approved") && (
              <Button asChild size="sm" className="font-semibold shadow-sm">
                <Link to={`/workspace/${project._id}`}>
                  Collaboration Workspace →
                </Link>
              </Button>
            )}

            {isOwner ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/find-teammates?projectId=${project._id}`}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    Find Teammates
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/project/${project._id}/edit`}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit Project
                  </Link>
                </Button>
              </>
            ) : (
              <RequestCollaboration
                project={project}
                collaboration={project.collaboration}
                onSent={(saved) =>
                  setProject((prev) => ({ ...prev, collaboration: { _id: saved._id, status: saved.status } }))
                }
              />
            )}
          </div>
        </div>

        {/* Developer info row */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <Link
            to={`/u/${owner?.userName}`}
            className="flex items-center gap-2.5 rounded-md p-1 -m-1 hover:bg-muted transition-colors"
          >
            <Avatar user={owner} size="sm" />
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">
                {owner?.name || `@${owner?.userName}`}
              </p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                @{owner?.userName}
              </p>
            </div>
          </Link>

          {!isOwner && project.collaboration ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Collaboration status:</span>
              <StatusBadge status={project.collaboration.status} />
              {project.collaboration.status === "approved" && (
                <Link
                  to={`/workspace/${project._id}`}
                  className="font-semibold text-primary hover:underline ml-1"
                >
                  Open Workspace →
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </header>

      {/* Main Content + Sidebar */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        {/* Left Column: Screenshots, Description, Comments */}
        <div className="min-w-0 space-y-8">
          {/* Screenshot Showcase */}
          {images.length > 0 && (
            <section aria-label="Screenshots" className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <img
                  src={images[activeImage]}
                  alt={`${project.title} screenshot ${activeImage + 1}`}
                  className="max-h-[32rem] w-full object-contain bg-muted/40"
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      aria-label={`Show screenshot ${index + 1}`}
                      className={`h-16 w-24 shrink-0 overflow-hidden rounded border transition-all ${
                        index === activeImage
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Description */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">About this project</h2>
            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
              {project.description}
            </div>
          </section>

          {/* Comments Section */}
          <section id="comments" className="scroll-mt-20 rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                Discussion & Feedback{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({comments.length})
                </span>
              </h2>
            </div>

            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="mb-8 space-y-3">
                {commentError ? <Alert tone="error">{commentError}</Alert> : null}
                <Textarea
                  rows={3}
                  placeholder="Ask a technical question, suggest an improvement, or share your thoughts on this project..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-background text-sm"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={posting || !newComment.trim()}>
                    {posting ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mb-6 rounded-md border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Log in
                </Link>{" "}
                to join the discussion and leave feedback for the author.
              </div>
            )}

            {comments.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <MessageSquare className="mx-auto h-8 w-8 stroke-[1.5] text-muted-foreground/60 mb-2" />
                <p className="font-medium text-foreground">No comments yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Be the first student to leave feedback on this project.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {comments.map((comment) => (
                  <li key={comment._id} className="flex gap-3 text-sm">
                    <Avatar user={comment.owner} size="sm" />
                    <div className="min-w-0 flex-1 rounded-md border border-border bg-background p-3.5">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <Link
                          to={`/u/${comment.owner?.userName}`}
                          className="font-semibold text-foreground hover:underline"
                        >
                          {comment.owner?.name || comment.owner?.userName}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          @{comment.owner?.userName}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right Sidebar */}
        <aside className="space-y-6">
          {/* Action Card: Like & Comment Counts */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Community Stats
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={project.likedByMe ? "default" : "outline"}
                size="sm"
                onClick={handleLike}
                aria-pressed={Boolean(project.likedByMe)}
                className="w-full justify-center"
              >
                <Heart className={`mr-1.5 h-4 w-4 ${project.likedByMe ? "fill-current" : ""}`} />
                {project.likeCount || 0} {project.likeCount === 1 ? "Like" : "Likes"}
              </Button>

              <a
                href="#comments"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                {project.commentCount || 0} Comments
              </a>
            </div>
          </div>

          {/* Links Card: GitHub & Live Demo */}
          {(project.githubLink || project.liveLink) && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Project Links
              </h3>
              <div className="space-y-2">
                {project.githubLink && (
                  <Button asChild variant="outline" className="w-full justify-start text-xs font-medium">
                    <a
                      href={normalizeUrl(project.githubLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <GitBranch className="mr-2 h-4 w-4 text-muted-foreground" />
                      GitHub Repository
                    </a>
                  </Button>
                )}
                {project.liveLink && (
                  <Button asChild variant="outline" className="w-full justify-start text-xs font-medium">
                    <a
                      href={normalizeUrl(project.liveLink)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                      Live Deployment Demo
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Tech Stack */}
          {project.techStack?.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Built With
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {project.techStack.map((tech) => (
                  <Badge key={tech} variant="tech">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Required Skills for Collaboration */}
          {project.requiredSkills?.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Looking For Skills
                </h3>
                {isOwner && (
                  <Link
                    to={`/find-teammates?projectId=${project._id}`}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Find Teammates →
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.requiredSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="default"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Collaborators & Owner */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Project Members
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  to={`/u/${owner?.userName}`}
                  className="flex items-center justify-between rounded p-1 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar user={owner} size="xs" />
                    <span className="truncate font-medium text-foreground">
                      @{owner?.userName}
                    </span>
                  </div>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Author
                  </span>
                </Link>
              </li>
              {(project.collaborators || []).map((person) => (
                <li key={person._id}>
                  <Link
                    to={`/u/${person.userName}`}
                    className="flex items-center justify-between rounded p-1 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar user={person} size="xs" />
                      <span className="truncate font-medium text-foreground">
                        @{person.userName}
                      </span>
                    </div>
                    <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-medium">
                      Collaborator
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
