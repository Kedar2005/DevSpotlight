import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Trophy, Users, Pencil, ClipboardCheck, ExternalLink } from "lucide-react";
import {
  getAdminHackathons,
  createHackathon,
  updateHackathon,
  updateHackathonStatus,
  getHackathonParticipants,
  getAdminColleges,
} from "../../api/admin.api";
import { getErrorMessage } from "../../lib/errors";
import { HACKATHON_STATUS, formatDate, toDateTimeInput } from "../../lib/hackathon";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Alert } from "../../components/ui/alert";
import { Modal } from "../../components/ui/modal";
import { Avatar } from "../../components/ui/avatar";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  StatusPill,
  ConfirmDialog,
} from "../../components/shared/PageState";

const EMPTY_FORM = {
  title: "",
  description: "",
  theme: "",
  organizer: "",
  eligibility: "",
  rules: "",
  registrationStartDate: "",
  registrationDeadline: "",
  startDate: "",
  endDate: "",
  status: "upcoming",
  visibility: "public",
  participationMode: "individual",
  maximumParticipants: "",
  maximumTeamSize: "4",
  participatingColleges: [],
};

// Mirrors buildHackathonFields on the server so mistakes show before submitting.
function validateForm(form) {
  if (!form.title.trim()) return "Title is required.";
  if (!form.description.trim()) return "Description is required.";
  if (!form.startDate || !form.endDate || !form.registrationDeadline) {
    return "Event start, event end and registration end dates are required.";
  }
  const start = new Date(form.startDate);
  const end = new Date(form.endDate);
  const regEnd = new Date(form.registrationDeadline);
  if (start >= end) return "Event start must be before event end.";
  if (regEnd > end) return "Registration end cannot be after the event end.";
  if (form.registrationStartDate && new Date(form.registrationStartDate) >= regEnd) {
    return "Registration start must be before registration end.";
  }
  if (form.maximumParticipants && !(Number(form.maximumParticipants) >= 1)) {
    return "Maximum participants must be at least 1.";
  }
  const teamSize = Number(form.maximumTeamSize);
  if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 20) {
    return "Maximum team size must be between 1 and 20.";
  }
  return "";
}

const toPayload = (form) => ({
  ...form,
  registrationStartDate: form.registrationStartDate ? new Date(form.registrationStartDate).toISOString() : "",
  registrationDeadline: new Date(form.registrationDeadline).toISOString(),
  startDate: new Date(form.startDate).toISOString(),
  endDate: new Date(form.endDate).toISOString(),
  maximumParticipants: form.maximumParticipants || null,
});

function Field({ label, htmlFor, hint, children, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function AdminHackathons() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hackathons, setHackathons] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create / edit
  const [formOpen, setFormOpen] = useState(searchParams.get("create") === "1");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Status change confirmation
  const [statusChange, setStatusChange] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");

  // Participants
  const [participantsFor, setParticipantsFor] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getAdminHackathons(), getAdminColleges()])
      .then(([hackathonData, collegeData]) => {
        if (!active) return;
        setHackathons(hackathonData || []);
        setColleges(collegeData || []);
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
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hackathons.filter(
      (h) =>
        (statusFilter === "all" || h.status === statusFilter) &&
        (!q || h.title.toLowerCase().includes(q) || h.organizer?.toLowerCase().includes(q))
    );
  }, [hackathons, query, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (h) => {
    setEditing(h);
    setForm({
      title: h.title || "",
      description: h.description || "",
      theme: h.theme || "",
      organizer: h.organizer || "",
      eligibility: h.eligibility || "",
      rules: h.rules || "",
      registrationStartDate: toDateTimeInput(h.registrationStartDate),
      registrationDeadline: toDateTimeInput(h.registrationDeadline),
      startDate: toDateTimeInput(h.startDate),
      endDate: toDateTimeInput(h.endDate),
      status: h.status,
      visibility: h.visibility,
      participationMode: h.participationMode,
      maximumParticipants: h.maximumParticipants ?? "",
      maximumTeamSize: String(h.maximumTeamSize ?? 4),
      participatingColleges: (h.participatingColleges || []).map((c) => c._id || c),
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    if (searchParams.has("create")) setSearchParams({}, { replace: true });
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleCollege = (id) =>
    setForm((f) => ({
      ...f,
      participatingColleges: f.participatingColleges.includes(id)
        ? f.participatingColleges.filter((c) => c !== id)
        : [...f.participatingColleges, id],
    }));

  const handleSave = async (e) => {
    e.preventDefault();
    const problem = validateForm(form);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await updateHackathon(editing._id, toPayload(form));
        setNotice(`"${form.title}" updated.`);
      } else {
        await createHackathon(toPayload(form));
        setNotice(`"${form.title}" created with a private hackathon room.`);
      }
      closeForm();
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save hackathon."));
    } finally {
      setSaving(false);
    }
  };

  const confirmStatusChange = async () => {
    setStatusBusy(true);
    setStatusError("");
    try {
      await updateHackathonStatus(statusChange.hackathon._id, statusChange.status);
      setNotice(`"${statusChange.hackathon.title}" is now ${HACKATHON_STATUS[statusChange.status].label.toLowerCase()}.`);
      setStatusChange(null);
      reload();
    } catch (err) {
      setStatusError(getErrorMessage(err, "Failed to change status."));
    } finally {
      setStatusBusy(false);
    }
  };

  const openParticipants = async (h) => {
    setParticipantsFor(h);
    setParticipants([]);
    setParticipantsError("");
    setParticipantsLoading(true);
    try {
      setParticipants((await getHackathonParticipants(h._id)) || []);
    } catch (err) {
      setParticipantsError(getErrorMessage(err, "Failed to load participants."));
    } finally {
      setParticipantsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hackathons"
        description="Create and schedule hackathons, manage registrations and close events."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create hackathon
          </Button>
        }
      />

      {notice && (
        <Alert tone="success" className="flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button type="button" className="text-xs hover:underline" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Search hackathons"
            placeholder="Search by title or organizer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 text-xs sm:w-48"
        >
          <option value="all">All statuses</option>
          {Object.entries(HACKATHON_STATUS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <LoadingState label="Loading hackathons…" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={hackathons.length ? "No hackathons match your filters" : "No hackathons yet"}
            description={hackathons.length ? undefined : "Create the first hackathon to open registrations."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Hackathon</th>
                  <th className="px-4 py-2.5 font-medium">Registration</th>
                  <th className="px-4 py-2.5 font-medium">Event</th>
                  <th className="px-4 py-2.5 font-medium">Participants</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((h) => (
                  <tr key={h._id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{h.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.organizer} · {h.participationMode === "team" ? `Teams of up to ${h.maximumTeamSize}` : "Individual"}
                        {h.visibility === "private" ? " · Private" : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {h.registrationStartDate ? `${formatDate(h.registrationStartDate)} – ` : "Until "}
                      {formatDate(h.registrationDeadline)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(h.startDate)} – {formatDate(h.endDate)}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      {h.participantCount}
                      {h.maximumParticipants ? ` / ${h.maximumParticipants}` : ""}
                      <span className="block text-muted-foreground">{h.submissionCount} submissions</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill map={HACKATHON_STATUS} status={h.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Select
                          aria-label={`Change status of ${h.title}`}
                          value={h.status}
                          onChange={(e) => {
                            setStatusError("");
                            setStatusChange({ hackathon: h, status: e.target.value });
                          }}
                          className="h-7 w-auto text-xs"
                        >
                          {Object.entries(HACKATHON_STATUS).map(([value, { label }]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                        <Button variant="outline" size="xs" onClick={() => openEdit(h)}>
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button variant="outline" size="xs" onClick={() => openParticipants(h)}>
                          <Users className="h-3 w-3" aria-hidden="true" />
                          Participants
                        </Button>
                        <Button asChild variant="outline" size="xs">
                          <Link to={`/admin/submissions?hackathon=${h._id}`}>
                            <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
                            Submissions
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="xs" aria-label={`Open public page of ${h.title}`}>
                          <Link to={`/hackathon/${h._id}`} target="_blank">
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </Link>
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

      {/* Create / edit */}
      <Modal
        open={formOpen}
        onClose={saving ? () => {} : closeForm}
        title={editing ? `Edit ${editing.title}` : "Create hackathon"}
        description={editing ? undefined : "A private hackathon room is created automatically."}
        wide
      >
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title *" htmlFor="h-title" className="sm:col-span-2">
              <Input id="h-title" value={form.title} onChange={setField("title")} required maxLength={120} />
            </Field>
            <Field label="Description *" htmlFor="h-description" className="sm:col-span-2">
              <Textarea id="h-description" rows={4} value={form.description} onChange={setField("description")} required />
            </Field>
            <Field label="Theme" htmlFor="h-theme">
              <Input id="h-theme" value={form.theme} onChange={setField("theme")} placeholder="Open Innovation" />
            </Field>
            <Field label="Organizer" htmlFor="h-organizer">
              <Input id="h-organizer" value={form.organizer} onChange={setField("organizer")} placeholder="DevSpotlight" />
            </Field>
          </div>

          <fieldset className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
            <legend className="px-1 text-xs font-semibold text-muted-foreground">Dates</legend>
            <Field label="Registration start" htmlFor="h-reg-start" hint="Leave empty to open registration immediately.">
              <Input id="h-reg-start" type="datetime-local" value={form.registrationStartDate} onChange={setField("registrationStartDate")} />
            </Field>
            <Field label="Registration end *" htmlFor="h-reg-end">
              <Input id="h-reg-end" type="datetime-local" value={form.registrationDeadline} onChange={setField("registrationDeadline")} required />
            </Field>
            <Field label="Event start *" htmlFor="h-start">
              <Input id="h-start" type="datetime-local" value={form.startDate} onChange={setField("startDate")} required />
            </Field>
            <Field label="Event end (submission deadline) *" htmlFor="h-end">
              <Input id="h-end" type="datetime-local" value={form.endDate} onChange={setField("endDate")} required />
            </Field>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Eligibility" htmlFor="h-eligibility" className="sm:col-span-2">
              <Textarea id="h-eligibility" rows={2} value={form.eligibility} onChange={setField("eligibility")} placeholder="e.g. Undergraduate students of participating colleges" />
            </Field>
            <Field label="Rules" htmlFor="h-rules" className="sm:col-span-2">
              <Textarea id="h-rules" rows={4} value={form.rules} onChange={setField("rules")} placeholder="One rule per line" />
            </Field>
            <Field label="Participation" htmlFor="h-mode">
              <Select id="h-mode" value={form.participationMode} onChange={setField("participationMode")}>
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </Select>
            </Field>
            <Field label="Maximum team size" htmlFor="h-team-size">
              <Input id="h-team-size" type="number" min={1} max={20} value={form.maximumTeamSize} onChange={setField("maximumTeamSize")} />
            </Field>
            <Field label="Maximum participants" htmlFor="h-max" hint="Leave empty for no limit.">
              <Input id="h-max" type="number" min={1} value={form.maximumParticipants} onChange={setField("maximumParticipants")} />
            </Field>
            <Field label="Visibility" htmlFor="h-visibility" hint="Private hackathons are not listed publicly.">
              <Select id="h-visibility" value={form.visibility} onChange={setField("visibility")}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </Select>
            </Field>
            <Field label="Status" htmlFor="h-status">
              <Select id="h-status" value={form.status} onChange={setField("status")}>
                {Object.entries(HACKATHON_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {colleges.length > 0 && (
            <fieldset className="rounded-md border border-border p-3">
              <legend className="px-1 text-xs font-semibold text-muted-foreground">Participating colleges</legend>
              <div className="grid max-h-40 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {colleges.map((c) => (
                  <label key={c._id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.participatingColleges.includes(c._id)}
                      onChange={() => toggleCollege(c._id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" size="sm" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create hackathon"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(statusChange)}
        title={`Change status to "${statusChange ? HACKATHON_STATUS[statusChange.status].label : ""}"?`}
        description={
          statusChange?.status === "completed"
            ? "Completing the hackathon closes submissions. The room can then be published to the showcase."
            : statusChange?.status === "cancelled"
              ? "Cancelling closes registration and submissions."
              : `"${statusChange?.hackathon.title}" will be updated for all participants.`
        }
        confirmLabel="Change status"
        destructive={statusChange?.status === "cancelled"}
        busy={statusBusy}
        error={statusError}
        onConfirm={confirmStatusChange}
        onClose={() => setStatusChange(null)}
      />

      <Modal
        open={Boolean(participantsFor)}
        onClose={() => setParticipantsFor(null)}
        title={`Participants · ${participantsFor?.title || ""}`}
        wide
      >
        {participantsError && <Alert tone="error">{participantsError}</Alert>}
        {participantsLoading ? (
          <LoadingState label="Loading participants…" />
        ) : participants.length === 0 && !participantsError ? (
          <EmptyState icon={Users} title="No registrations yet" />
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {participants.map((r) => (
              <li key={r._id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <Avatar user={r.user} size="xs" />
                <span className="font-medium">{r.user?.fullName || r.user?.userName || "Deleted user"}</span>
                <span className="text-xs text-muted-foreground">{r.user?.email}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {r.teamName ? `Team ${r.teamName} · ` : ""}
                  {r.college?.name || r.user?.collegeName || "No college"} · {r.status} · {formatDate(r.registeredAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
