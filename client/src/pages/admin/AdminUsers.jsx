import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  Ban,
  CheckCircle,
  ExternalLink,
  FolderGit2,
  RotateCw,
} from "lucide-react";
import {
  getAdminUsers,
  updateUserSuspension,
  getUserProjects,
  getAdminColleges,
} from "../../api/admin.api";
import { getErrorMessage } from "../../lib/errors";
import { Avatar } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Alert } from "../../components/ui/alert";
import { Modal } from "../../components/ui/modal";

export function AdminUsers() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [collegeFilter, setCollegeFilter] = useState(searchParams.get("college") || "all");
  const [colleges, setColleges] = useState([]);

  useEffect(() => {
    getAdminColleges()
      .then((data) => setColleges(data || []))
      .catch(() => setColleges([]));
  }, []);

  // User Projects modal
  const [selectedUserForProjects, setSelectedUserForProjects] = useState(null);
  const [userProjects, setUserProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Suspension confirmation modal
  const [suspendingUser, setSuspendingUser] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [submittingSuspension, setSubmittingSuspension] = useState(false);
  const [suspensionError, setSuspensionError] = useState("");

  useEffect(() => {
    let active = true;

    getAdminUsers({
      page,
      limit: 10,
      q: searchQuery.trim() || undefined,
      role: roleFilter !== "all" ? roleFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      college: collegeFilter !== "all" ? collegeFilter : undefined,
    })
      .then((data) => {
        if (!active) return;
        setUsers(data.users || []);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages || 1);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err, "Failed to load users."));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
    // searchQuery is applied on submit (reloadKey), not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, statusFilter, collegeFilter, reloadKey]);

  const fetchUsers = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  // Open user projects viewer
  const handleViewProjects = async (user) => {
    setSelectedUserForProjects(user);
    setLoadingProjects(true);
    try {
      const projects = await getUserProjects(user._id);
      setUserProjects(projects || []);
    } catch {
      setUserProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Open suspension modal
  const handleOpenSuspensionModal = (user) => {
    setSuspendingUser(user);
    setSuspensionReason(user.suspendedReason || "");
    setSuspensionError("");
  };

  // Submit suspension or reactivation
  const handleConfirmSuspensionToggle = async () => {
    if (!suspendingUser) return;
    setSubmittingSuspension(true);
    setSuspensionError("");

    const targetSuspendedState = !suspendingUser.isSuspended;

    try {
      await updateUserSuspension(suspendingUser._id, {
        isSuspended: targetSuspendedState,
        reason: targetSuspendedState ? suspensionReason : "",
      });

      setActionSuccess(
        `User ${suspendingUser.userName} has been ${
          targetSuspendedState ? "suspended" : "reactivated"
        } successfully.`
      );
      setSuspendingUser(null);
      fetchUsers();
    } catch (err) {
      setSuspensionError(getErrorMessage(err, "Action failed."));
    } finally {
      setSubmittingSuspension(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Students
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Search students, view their profiles and projects, and activate or suspend accounts.
          </p>
        </div>

        <span className="text-xs font-semibold text-muted-foreground font-code">
          {total} accounts
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
              placeholder="Search by name, username, email, or college…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
          <Button type="submit" size="xs">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 text-xs w-28 bg-background"
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </Select>

          <Select
            aria-label="Filter by account status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 text-xs w-32 bg-background"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>

          <Select
            aria-label="Filter by college"
            value={collegeFilter}
            onChange={(e) => {
              setCollegeFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 text-xs w-40 bg-background"
          >
            <option value="all">All Colleges</option>
            {colleges.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <RotateCw className="h-4 w-4 animate-spin text-primary" />
            <span>Loading user directory…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p>No users found matching your search and filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-muted/10 transition-colors">
                    {/* User Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar user={u} size="xs" />
                        <div>
                          <p className="font-semibold text-foreground">{u.fullName || u.userName}</p>
                          <p className="font-code text-[11px] text-muted-foreground">@{u.userName}</p>
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {u.role === "admin" ? (
                        <Badge variant="danger" className="text-[10px] font-bold">
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Student
                        </Badge>
                      )}
                    </td>

                    {/* College */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.collegeName || "Not specified"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {u.isSuspended ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 text-[10px] font-semibold border border-red-500/20">
                            <Ban className="h-3 w-3" /> Suspended
                          </span>
                          {u.suspendedReason && (
                            <p className="text-[10px] text-muted-foreground italic truncate max-w-[140px]" title={u.suspendedReason}>
                              {u.suspendedReason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold border border-emerald-500/20">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleViewProjects(u)}
                          title="View profile and projects"
                        >
                          <FolderGit2 className="mr-1 h-3 w-3" />
                          Details
                        </Button>

                        <Button asChild variant="outline" size="xs">
                          <Link to={`/u/${u.userName}`} target="_blank" aria-label={`Open public profile of ${u.userName}`}>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>

                        <Button
                          variant={u.isSuspended ? "default" : "outline"}
                          size="xs"
                          onClick={() => handleOpenSuspensionModal(u)}
                          className={u.isSuspended ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-destructive hover:bg-destructive/10"}
                        >
                          {u.isSuspended ? "Reactivate" : "Suspend"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
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

      {/* User Projects Modal */}
      <Modal
        open={Boolean(selectedUserForProjects)}
        onClose={() => setSelectedUserForProjects(null)}
        title={selectedUserForProjects ? selectedUserForProjects.fullName || selectedUserForProjects.userName : "Student"}
        description="Profile details and all projects by this student, including moderated ones."
        wide
      >
        <div className="space-y-3">
          {selectedUserForProjects && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-md border border-border p-3 text-xs sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Username</dt><dd className="font-medium">@{selectedUserForProjects.userName}</dd></div>
              <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium break-all">{selectedUserForProjects.email}</dd></div>
              <div><dt className="text-muted-foreground">College</dt><dd className="font-medium">{selectedUserForProjects.collegeName || "Not specified"}</dd></div>
              <div><dt className="text-muted-foreground">Joined</dt><dd className="font-medium">{new Date(selectedUserForProjects.createdAt).toLocaleDateString()}</dd></div>
              <div><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{selectedUserForProjects.isSuspended ? `Suspended${selectedUserForProjects.suspendedReason ? ` — ${selectedUserForProjects.suspendedReason}` : ""}` : "Active"}</dd></div>
              <div><dt className="text-muted-foreground">Skills</dt><dd className="font-medium">{selectedUserForProjects.skills?.length ? selectedUserForProjects.skills.join(", ") : "—"}</dd></div>
              {selectedUserForProjects.bio && <div className="sm:col-span-2"><dt className="text-muted-foreground">Bio</dt><dd>{selectedUserForProjects.bio}</dd></div>}
            </dl>
          )}
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects</h3>
          {loadingProjects ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <RotateCw className="mx-auto h-4 w-4 animate-spin text-primary mb-2" />
              Loading projects…
            </div>
          ) : userProjects.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              This user has not submitted any projects yet.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {userProjects.map((p) => (
                <div
                  key={p._id}
                  className="rounded border border-border bg-card p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{p.title}</p>
                    {p.isDeleted ? (
                      <Badge variant="danger" className="text-[10px]">
                        Moderated
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px]">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground line-clamp-2">{p.description}</p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                    <span>Category: {p.category}</span>
                    <span>•</span>
                    <span>{p.visits || 0} visits</span>
                    <Link
                      to={`/project/${p._id}`}
                      target="_blank"
                      className="ml-auto text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setSelectedUserForProjects(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suspend / Reactivate Confirmation Modal */}
      <Modal
        open={Boolean(suspendingUser)}
        onClose={() => setSuspendingUser(null)}
        title={
          suspendingUser?.isSuspended
            ? `Reactivate account for @${suspendingUser?.userName}`
            : `Suspend account for @${suspendingUser?.userName}`
        }
        description={
          suspendingUser?.isSuspended
            ? "Reactivating this account will restore full access to protected platform features."
            : "Suspended users are blocked from logging in and accessing platform features."
        }
      >
        <div className="space-y-4">
          {suspensionError && <Alert tone="error">{suspensionError}</Alert>}

          {!suspendingUser?.isSuspended && (
            <div className="space-y-1.5">
              <label htmlFor="suspension-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reason for suspension:
              </label>
              <Input
                id="suspension-reason"
                placeholder="e.g. Terms violation, spam activity, abusive behavior"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="text-xs"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuspendingUser(null)}
              disabled={submittingSuspension}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={suspendingUser?.isSuspended ? "default" : "destructive"}
              onClick={handleConfirmSuspensionToggle}
              disabled={submittingSuspension}
            >
              {submittingSuspension
                ? "Processing…"
                : suspendingUser?.isSuspended
                ? "Confirm Reactivation"
                : "Confirm Suspension"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
