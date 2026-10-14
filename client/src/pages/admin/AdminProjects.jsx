import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderGit2,
  Search,
  Eye,
  ShieldAlert,
  ShieldCheck,
  RotateCw,
} from "lucide-react";
import { getAdminProjects, moderateProject } from "../../api/admin.api";
import { getErrorMessage } from "../../lib/errors";
import { Avatar } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Alert } from "../../components/ui/alert";
import { Modal } from "../../components/ui/modal";

const PROJECT_CATEGORIES = [
  "Web app",
  "Mobile app",
  "AI / ML",
  "Game",
  "Data",
  "Developer tool",
  "Hardware / IoT",
  "Open source",
  "Other",
];

const categories = ["All", ...PROJECT_CATEGORIES];

export function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");

  // Moderation Modal
  const [moderatingProject, setModeratingProject] = useState(null);
  const [moderationReason, setModerationReason] = useState("");
  const [submittingModeration, setSubmittingModeration] = useState(false);
  const [moderationError, setModerationError] = useState("");

  useEffect(() => {
    let active = true;

    getAdminProjects({
      page,
      limit: 10,
      q: searchQuery.trim() || undefined,
      category: categoryFilter !== "All" ? categoryFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    })
      .then((data) => {
        if (!active) return;
        setProjects(data.projects || []);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages || 1);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err, "Failed to load projects."));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, categoryFilter, statusFilter, reloadKey]);

  const fetchProjects = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProjects();
  };

  const handleOpenModerationModal = (project) => {
    setModeratingProject(project);
    setModerationReason(project.moderationReason || "");
    setModerationError("");
  };

  const handleConfirmModerationToggle = async () => {
    if (!moderatingProject) return;
    setSubmittingModeration(true);
    setModerationError("");

    const targetDeletedState = !moderatingProject.isDeleted;

    try {
      await moderateProject(moderatingProject._id, {
        isDeleted: targetDeletedState,
        reason: targetDeletedState ? moderationReason : "",
      });

      setActionSuccess(
        `Project "${moderatingProject.title}" has been ${
          targetDeletedState ? "removed by moderation" : "restored"
        } successfully.`
      );
      setModeratingProject(null);
      fetchProjects();
    } catch (err) {
      setModerationError(getErrorMessage(err, "Failed to moderate project."));
    } finally {
      setSubmittingModeration(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Project Moderation
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Review submitted student projects, inspect codebase links, and soft-delete abusive or spam builds.
          </p>
        </div>

        <span className="text-xs font-semibold text-muted-foreground font-code">
          Total Projects: {total}
        </span>
      </div>

      {actionSuccess && (
        <Alert tone="success" className="flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess("")}
            className="text-xs hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </Alert>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-card p-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by project title or description…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
          <Button type="submit" size="xs">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 text-xs w-36 bg-background"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All Categories" : c}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 text-xs w-32 bg-background"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="moderated">Moderated</option>
          </Select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <RotateCw className="h-4 w-4 animate-spin text-primary" />
            <span>Loading projects…</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <FolderGit2 className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p>No projects found matching the filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => (
                  <tr key={p._id} className="hover:bg-muted/10 transition-colors">
                    {/* Project Title & Desc */}
                    <td className="px-4 py-3 max-w-xs">
                      <div>
                        <p className="font-semibold text-foreground truncate">{p.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>
                        {p.moderationReason && (
                          <p className="text-[10px] text-destructive italic mt-0.5">
                            Reason: {p.moderationReason}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Author */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar user={p.userId} size="xs" />
                        <div>
                          <p className="font-medium text-foreground">{p.userId?.fullName || p.userId?.userName}</p>
                          <p className="text-[10px] text-muted-foreground">@{p.userId?.userName}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {p.category || "Other"}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {p.isDeleted ? (
                        <span className="inline-flex items-center gap-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 text-[10px] font-semibold border border-red-500/20">
                          <ShieldAlert className="h-3 w-3" /> Moderated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold border border-emerald-500/20">
                          <ShieldCheck className="h-3 w-3" /> Live
                        </span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button asChild variant="outline" size="xs">
                          <Link to={`/project/${p._id}`} target="_blank">
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </Link>
                        </Button>

                        <Button
                          variant={p.isDeleted ? "default" : "outline"}
                          size="xs"
                          onClick={() => handleOpenModerationModal(p)}
                          className={
                            p.isDeleted
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "text-destructive hover:bg-destructive/10"
                          }
                        >
                          {p.isDeleted ? "Restore" : "Moderate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Moderation Confirmation Modal */}
      <Modal
        open={Boolean(moderatingProject)}
        onClose={() => setModeratingProject(null)}
        title={
          moderatingProject?.isDeleted
            ? `Restore "${moderatingProject?.title}"`
            : `Moderate "${moderatingProject?.title}"`
        }
        description={
          moderatingProject?.isDeleted
            ? "Restoring this project will make it visible in public searches and feeds again."
            : "Moderating this project will hide it from public search, feeds, teammate recommendations, and hackathons without permanently deleting database records."
        }
      >
        <div className="space-y-4">
          {moderationError && <Alert tone="error">{moderationError}</Alert>}

          {!moderatingProject?.isDeleted && (
            <div className="space-y-1.5">
              <label htmlFor="moderation-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Moderation Reason:
              </label>
              <Input
                id="moderation-reason"
                placeholder="e.g. Inappropriate content, copyright violation, spam repository"
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                className="text-xs"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModeratingProject(null)}
              disabled={submittingModeration}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={moderatingProject?.isDeleted ? "default" : "destructive"}
              onClick={handleConfirmModerationToggle}
              disabled={submittingModeration}
            >
              {submittingModeration
                ? "Processing…"
                : moderatingProject?.isDeleted
                ? "Confirm Restoration"
                : "Confirm Removal"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
