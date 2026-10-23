import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Plus,
  Search,
  ExternalLink,
  Edit,
  RotateCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getAdminColleges,
  createCollege,
  updateCollege,
  updateCollegeStatus,
} from "../../api/admin.api";
import { getErrorMessage } from "../../lib/errors";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Alert } from "../../components/ui/alert";
import { Modal } from "../../components/ui/modal";
import { ConfirmDialog } from "../../components/shared/PageState";

export function AdminColleges() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    location: "",
    website: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    let active = true;

    getAdminColleges({ q: searchQuery.trim() || undefined })
      .then((data) => {
        if (!active) return;
        setColleges(data || []);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err, "Failed to load colleges."));
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
  }, [reloadKey]);

  const fetchColleges = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchColleges();
  };

  const handleOpenCreate = () => {
    setEditingCollege(null);
    setFormData({
      name: "",
      code: "",
      location: "",
      website: "",
      description: "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleOpenEdit = (college) => {
    setEditingCollege(college);
    setFormData({
      name: college.name,
      code: college.code,
      location: college.location || "",
      website: college.website || "",
      description: college.description || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      if (editingCollege) {
        await updateCollege(editingCollege._id, formData);
        setActionSuccess(`College "${formData.name}" updated successfully.`);
      } else {
        await createCollege(formData);
        setActionSuccess(`College "${formData.name}" registered successfully.`);
      }
      setModalOpen(false);
      fetchColleges();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save college."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    const college = statusTarget;
    const nextStatus = college.status === "active" ? "inactive" : "active";
    setStatusBusy(true);
    setStatusError("");
    try {
      await updateCollegeStatus(college._id, nextStatus);
      setActionSuccess(`College "${college.name}" marked as ${nextStatus}.`);
      setStatusTarget(null);
      fetchColleges();
    } catch (err) {
      setStatusError(getErrorMessage(err, "Failed to update college status."));
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Colleges
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Registered colleges, their students, and activation status.
          </p>
        </div>

        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add College
        </Button>
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

      {/* Search Bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by college name, code, or location…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
          <Button type="submit" size="xs">
            Search
          </Button>
        </form>

        <span className="text-xs text-muted-foreground font-code">
          {colleges.length} Institutions
        </span>
      </div>

      {/* College Directory Grid / Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <RotateCw className="h-4 w-4 animate-spin text-primary" />
            <span>Loading colleges…</span>
          </div>
        ) : colleges.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p>No colleges found. Click "Add College" to register the first institution.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">College Name</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {colleges.map((c) => (
                  <tr key={c._id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-code font-bold text-primary">{c.code}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">{c.name}</p>
                        {c.website && (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {c.website} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.location || "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{c.studentCount ?? 0}</td>
                    <td className="px-4 py-3">
                      {c.status === "active" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold border border-emerald-500/20">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-semibold border border-border">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button asChild variant="outline" size="xs">
                          <Link to={`/admin/students?college=${c._id}`}>Students</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleOpenEdit(c)}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant={c.status === "active" ? "outline" : "default"}
                          size="xs"
                          onClick={() => {
                            setStatusError("");
                            setStatusTarget(c);
                          }}
                        >
                          {c.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.status === "active" ? `Deactivate ${statusTarget?.name}?` : `Activate ${statusTarget?.name}?`}
        description={
          statusTarget?.status === "active"
            ? "Inactive colleges are hidden from registration and profile college lists. Existing students keep their accounts."
            : "The college will appear again in registration and profile college lists."
        }
        confirmLabel={statusTarget?.status === "active" ? "Deactivate" : "Activate"}
        destructive={statusTarget?.status === "active"}
        busy={statusBusy}
        error={statusError}
        onConfirm={handleToggleStatus}
        onClose={() => setStatusTarget(null)}
      />

      {/* Add / Edit College Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCollege ? "Edit College" : "Add College"}
        description="Register or modify college identifiers, location, and official domain website."
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="space-y-1.5">
            <label htmlFor="college-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              College Name *
            </label>
            <Input
              id="college-name"
              required
              placeholder="e.g. Sardar Patel Institute of Technology"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="college-code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              College Code *
            </label>
            <Input
              id="college-code"
              required
              placeholder="e.g. SPIT, COEP, VJTI"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="text-xs font-code uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="college-location" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Location
            </label>
            <Input
              id="college-location"
              placeholder="e.g. Mumbai, Maharashtra"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="college-website" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Official Website
            </label>
            <Input
              id="college-website"
              type="url"
              placeholder="https://spit.ac.in"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Saving…" : editingCollege ? "Save Changes" : "Create College"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
