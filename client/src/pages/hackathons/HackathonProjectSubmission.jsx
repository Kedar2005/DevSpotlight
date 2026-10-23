import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus } from "lucide-react";
import { getHackathonRoom, submitProjectToRoom } from "../../api/hackathon.api";
import { getMyProjects } from "../../api/project.api";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../lib/errors";
import { formatDate } from "../../lib/hackathon";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Alert } from "../../components/ui/alert";
import { LoadingState } from "../../components/shared/PageState";

export default function HackathonProjectSubmission() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getHackathonRoom(roomId), getMyProjects()])
      .then(([roomData, projectData]) => {
        if (!active) return;
        const live = (projectData || []).filter((p) => !p.isDeleted);
        setRoom(roomData);
        setProjects(live);
        setProjectId(live[0]?._id || "");
      })
      .catch((err) => {
        if (active) setLoadError(getErrorMessage(err, "Failed to load the submission form."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [roomId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId) {
      setError("Select a project to submit.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitProjectToRoom(roomId, { projectId, notes, teamMembers });
      setSuccess(true);
      setTimeout(() => navigate(`/hackathon/room/${roomId}`), 1200);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to submit project."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading submission form…" />;

  if (loadError || !room) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-12">
        <Alert tone="error">{loadError || "Room not found."}</Alert>
        <Link to="/hackathons" className="text-sm text-primary hover:underline">
          Back to hackathons
        </Link>
      </div>
    );
  }

  const h = room.hackathon;
  const isTeam = h.participationMode === "team";
  const maxExtraMembers = Math.max((h.maximumTeamSize || 4) - 1, 0);
  const otherParticipants = (room.participants || []).filter((p) => p.user && String(p.user._id) !== String(user?._id));

  const toggleMember = (id) =>
    setTeamMembers((current) => (current.includes(id) ? current.filter((m) => m !== id) : [...current, id]));

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        to={`/hackathon/room/${roomId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back to room
      </Link>

      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold tracking-tight">Submit a project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {h.title} · submissions close {formatDate(h.endDate, true)}
        </p>

        {success ? (
          <Alert tone="success" className="mt-5">
            Project submitted. Returning to the room…
          </Alert>
        ) : projects.length === 0 ? (
          <div className="mt-5 space-y-3">
            <Alert tone="info">You need a project on DevSpotlight before you can submit.</Alert>
            <Button asChild>
              <Link to="/create-project">
                <Plus className="h-4 w-4" aria-hidden="true" /> Create a project
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && <Alert tone="error">{error}</Alert>}

            <div className="space-y-1.5">
              <label htmlFor="project" className="text-xs font-medium">
                Project *
              </label>
              <Select id="project" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </div>

            {isTeam && (
              <fieldset className="space-y-2 rounded-md border border-border p-3">
                <legend className="px-1 text-xs font-medium">
                  Team members (up to {maxExtraMembers} besides you)
                </legend>
                {otherParticipants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No other registered participants yet.</p>
                ) : (
                  <div className="grid max-h-48 gap-1.5 overflow-y-auto">
                    {otherParticipants.map((p) => {
                      const id = p.user._id;
                      const checked = teamMembers.includes(id);
                      return (
                        <label key={p._id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!checked && teamMembers.length >= maxExtraMembers}
                            onChange={() => toggleMember(id)}
                          />
                          {p.user.fullName || p.user.userName}
                          {p.teamName && <span className="text-xs text-muted-foreground">· Team {p.teamName}</span>}
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>
            )}

            <div className="space-y-1.5">
              <label htmlFor="notes" className="text-xs font-medium">
                Notes for the organizers
              </label>
              <Textarea
                id="notes"
                rows={4}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional: what you built, how to run it, anything the judges should know."
              />
              <p className="text-[11px] text-muted-foreground">Visible only to your team and the organizers.</p>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button asChild type="button" variant="outline">
                <Link to={`/hackathon/room/${roomId}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit project"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
