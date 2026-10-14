import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Layers,
  Lock,
  Globe,
  Upload,
  Trophy,
  ExternalLink,
  GitBranch,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  Award
} from "lucide-react";
import { getHackathonRoom, getRoomSubmissions } from "../../api/hackathon.api";
import { useAuth } from "../../hooks/useAuth";

export default function HackathonRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();

  const [room, setRoom] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState("submissions");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([getHackathonRoom(roomId), getRoomSubmissions(roomId)])
      .then(([roomData, subsData]) => {
        if (!active) return;
        setRoom(roomData);
        setSubmissions(subsData || []);
        setError("");
        setIsAccessDenied(false);
      })
      .catch((err) => {
        if (!active) return;
        if (err?.response?.status === 403) {
          setIsAccessDenied(true);
        } else {
          setError(err?.response?.data?.message || "Failed to load hackathon room");
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [roomId, reloadKey]);

  const handleRefresh = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
        <span className="text-sm font-medium">Entering hackathon room...</span>
      </div>
    );
  }

  // Access Denied / 403 Forbidden Screen
  if (isAccessDenied) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="h-20 w-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Private Hackathon Room</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            This collaboration room is restricted to registered hackathon participants and administrators. You must register for this hackathon to access this space.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 pt-2">
          <Link
            to="/hackathons"
            className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition"
          >
            Browse Hackathons
          </Link>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Room Unavailable</h2>
        <p className="text-sm text-slate-400">{error || "Hackathon room could not be loaded."}</p>
        <Link
          to="/hackathons"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Hackathons
        </Link>
      </div>
    );
  }

  const hackathon = room.hackathon;
  const isPublic = room.visibility === "public";
  const canSubmit = room.status === "open" && hackathon?.status !== "completed";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/hackathon/${hackathon?._id || ""}`}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Event Info
            </Link>

            <span className="text-slate-600">•</span>

            {isPublic ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                <Globe className="h-3 w-3" /> Public Showcase
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Private Participant Room
              </span>
            )}

            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-slate-300 capitalize">
              Status: {room.status}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <Layers className="h-7 w-7 text-indigo-400" />
            {hackathon?.title || "Hackathon Collaboration Room"}
          </h1>
        </div>

        {/* Action Button: Submit Project & Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {canSubmit && (
            <Link
              to={`/hackathon/room/${roomId}/submit`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-xs shadow-lg shadow-indigo-500/20 transition cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              Submit Your Project
            </Link>
          )}

          {user?.role === "admin" && (
            <Link
              to="/admin/rooms"
              className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition"
            >
              Room Admin
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === "submissions"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Project Submissions ({submissions.length})
        </button>

        <button
          onClick={() => setActiveTab("briefing")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === "briefing"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Guidelines & Rules
        </button>
      </div>

      {/* Tab 1: Submissions Gallery */}
      {activeTab === "submissions" && (
        <div className="space-y-6">
          {submissions.length === 0 ? (
            <div className="p-16 text-center rounded-3xl border border-white/5 bg-slate-900/30 space-y-4">
              <Trophy className="h-12 w-12 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No submissions yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Be the first team to submit your hackathon project before the deadline.
                </p>
              </div>
              {canSubmit && (
                <Link
                  to={`/hackathon/room/${roomId}/submit`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                >
                  <Upload className="h-3.5 w-3.5" /> Submit Project Now
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {submissions.map((sub) => {
                const proj = sub.project || {};
                return (
                  <div
                    key={sub._id}
                    className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 hover:border-indigo-500/40 transition flex flex-col justify-between space-y-4 shadow-lg"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          {sub.status || "Submitted"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white hover:text-indigo-400 transition">
                        {proj.title || "Untitled Project"}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {proj.description || "Hackathon project submission."}
                      </p>

                      {/* Required skills / tags */}
                      {proj.requiredSkills && proj.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {proj.requiredSkills.slice(0, 3).map((sk, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-300"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Team & Links */}
                    <div className="space-y-3 pt-3 border-t border-white/5">
                      <div className="text-xs text-slate-400 flex items-center justify-between">
                        <span>Submitted by:</span>
                        <span className="font-semibold text-white">
                          {sub.submittedBy?.fullName || sub.submittedBy?.userName || "Participant"}
                        </span>
                      </div>

                      {/* External links */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {proj._id && (
                          <Link
                            to={`/projects/${proj._id}`}
                            target="_blank"
                            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Project
                          </Link>
                        )}
                        {proj.githubUrl && (
                          <a
                            href={proj.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                            title="GitHub Repo"
                          >
                            <GitBranch className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {sub.presentationUrl && (
                          <a
                            href={sub.presentationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-300 text-xs hover:bg-purple-500/20 transition flex items-center gap-1"
                          >
                            <span>Slide Deck</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Guidelines & Rules */}
      {activeTab === "briefing" && (
        <div className="max-w-3xl space-y-6">
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/50 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-indigo-400" />
              Event Description & Requirements
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {hackathon?.description || "No specific details provided."}
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/50 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              Judging & Submission Criteria
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside leading-relaxed">
              <li>Originality & Innovation: The solution demonstrates unique problem-solving.</li>
              <li>Technical Execution: Code quality, architecture, and technology stack appropriateness.</li>
              <li>Completeness: Working prototype or demo presentation.</li>
              <li>Impact & Practicality: Potential real-world collegiate or community application.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
