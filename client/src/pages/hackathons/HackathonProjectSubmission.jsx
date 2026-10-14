import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Upload,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Plus
} from "lucide-react";
import { getHackathonRoom, submitProjectToRoom } from "../../api/hackathon.api";
import { getMyProjects } from "../../api/project.api";

export default function HackathonProjectSubmission() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [userProjects, setUserProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([getHackathonRoom(roomId), getMyProjects()])
      .then(([roomData, projectsData]) => {
        if (!active) return;
        setRoom(roomData);
        setUserProjects(projectsData || []);
        if (projectsData && projectsData.length > 0) {
          setSelectedProjectId(projectsData[0]._id);
        }
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to initialize submission form");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [roomId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError("Please select a project to submit.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await submitProjectToRoom(roomId, {
        projectId: selectedProjectId,
        notes,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate(`/hackathon/room/${roomId}`);
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit project");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading submission workspace...</span>
      </div>
    );
  }

  const selectedProject = userProjects.find((p) => p._id === selectedProjectId);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top back button */}
      <Link
        to={`/hackathon/room/${roomId}`}
        className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Room
      </Link>

      <div className="p-8 rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Upload className="h-6 w-6 text-indigo-400" />
            Submit Project to Hackathon
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Submitting to: <strong className="text-white">{room?.hackathon?.title}</strong>
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>Project submitted successfully! Redirecting to room gallery...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Select One of Your Projects *
              </label>
              <Link
                to="/projects/create"
                target="_blank"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Create New Project
              </Link>
            </div>

            {userProjects.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2">
                <p>You haven't created any projects on DevSpotlight yet.</p>
                <Link
                  to="/projects/create"
                  className="inline-block px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
                >
                  Create Project First
                </Link>
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                {userProjects.map((proj) => (
                  <option key={proj._id} value={proj._id}>
                    {proj.title} ({proj.category})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Project Preview Card */}
          {selectedProject && (
            <div className="p-4 rounded-xl border border-white/5 bg-slate-950/60 space-y-2 text-xs">
              <div className="font-semibold text-white text-sm">{selectedProject.title}</div>
              <p className="text-slate-400 line-clamp-2">{selectedProject.description}</p>
              <div className="flex items-center gap-3 text-slate-500 pt-1">
                {selectedProject.githubLink && <span>GitHub Linked</span>}
                {selectedProject.liveLink && <span>Live Demo Linked</span>}
              </div>
            </div>
          )}

          {/* Submission Notes / Pitch Link */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">
              Submission Notes / Slide Deck / Video Demo URL
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Include link to your presentation slides, loom video demo, or instructions for the judges..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Link
              to={`/hackathon/room/${roomId}`}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || userProjects.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Submitting..." : "Submit to Hackathon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
