import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Award,
  CheckCircle,
  AlertCircle,
  Layers,
  Shield,
  ChevronLeft,
  Sparkles
} from "lucide-react";
import { getHackathonDetails, registerForHackathon } from "../../api/hackathon.api";
import { useAuth } from "../../hooks/useAuth";

export default function HackathonDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [hackathon, setHackathon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Form for registration modal
  const [regData, setRegData] = useState({
    teamName: "",
    college: user?.collegeName || "",
    agreeToRules: true,
  });

  useEffect(() => {
    let active = true;
    getHackathonDetails(id)
      .then((data) => {
        if (!active) return;
        setHackathon(data);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load hackathon details");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: `/hackathon/${id}` } });
      return;
    }

    try {
      setRegistering(true);
      setError("");
      await registerForHackathon(hackathon._id, {
        teamName: regData.teamName || undefined,
        college: regData.college || undefined,
      });
      setRegisterSuccess(true);
      setShowRegModal(false);
      // Trigger reload to fetch updated isRegistered and participant count
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading event details...</span>
      </div>
    );
  }

  if (error && !hackathon) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Event Not Found</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <Link
          to="/hackathons"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Hackathons
        </Link>
      </div>
    );
  }

  const isRegOpen = hackathon.status === "registration_open";
  const isRegistered = Boolean(hackathon.isRegistered);
  const roomId = hackathon.room?._id || hackathon.room;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/hackathons"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
        >
          <ChevronLeft className="h-4 w-4" /> All Hackathons
        </Link>

        {user?.role === "admin" && (
          <Link
            to="/admin/hackathons"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
          >
            <Shield className="h-3.5 w-3.5" /> Manage in Admin Panel
          </Link>
        )}
      </div>

      {/* Main Banner Header */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-slate-900/80 shadow-2xl">
        <div className="h-64 sm:h-80 w-full relative bg-slate-950">
          {hackathon.bannerImage ? (
            <img
              src={hackathon.bannerImage}
              alt={hackathon.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center">
              <Trophy className="h-28 w-28 text-indigo-500/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          {/* Banner Floating Metadata */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-600/80 backdrop-blur-md text-white border border-indigo-400/30">
                  {hackathon.status?.replace("_", " ")}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/60 backdrop-blur-md text-slate-200">
                  {hackathon.mode?.toUpperCase()}
                </span>
                {hackathon.college && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-black/60 backdrop-blur-md text-indigo-300 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {hackathon.college?.name || hackathon.college}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {hackathon.title}
              </h1>
            </div>

            {/* Quick Action in Header */}
            <div className="shrink-0">
              {isRegistered ? (
                <div className="flex flex-col items-start md:items-end gap-2">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle className="h-4 w-4" /> Registered Participant
                  </span>
                  {roomId && (
                    <Link
                      to={`/hackathon/room/${roomId}`}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition cursor-pointer"
                    >
                      <Layers className="h-4 w-4" />
                      Enter Hackathon Room
                    </Link>
                  )}
                </div>
              ) : isRegOpen ? (
                <button
                  onClick={() => setShowRegModal(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  Register Now
                </button>
              ) : (
                <span className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 bg-white/5 border border-white/10">
                  Registration Closed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {registerSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>Registration successful! You now have full access to the private hackathon room.</span>
          </div>
          {roomId && (
            <Link
              to={`/hackathon/room/${roomId}`}
              className="text-xs font-bold underline hover:text-white"
            >
              Go to Room &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Description & Prizes */}
        <div className="lg:col-span-2 space-y-8">
          {/* Overview */}
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/50 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-indigo-400" />
              Event Description & Guidelines
            </h2>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {hackathon.description || "No specific guidelines provided for this event."}
            </div>

            {hackathon.location && (
              <div className="pt-4 border-t border-white/10 text-xs text-slate-400 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-400" />
                <span>Venue / Platform: <strong className="text-white">{hackathon.location}</strong></span>
              </div>
            )}
          </div>

          {/* Prizes */}
          {hackathon.prizes && hackathon.prizes.length > 0 && (
            <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/50 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                Prize Pool & Awards
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hackathon.prizes.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1"
                  >
                    <div className="text-xs text-amber-400 font-semibold">{p.name}</div>
                    <div className="text-xl font-extrabold text-white">{p.amount}</div>
                    {p.description && (
                      <p className="text-xs text-slate-400 pt-1">{p.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {hackathon.tags && hackathon.tags.length > 0 && (
            <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/50 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-400" />
                Domains & Themes
              </h3>
              <div className="flex flex-wrap gap-2">
                {hackathon.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Timeline & Participant Info */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/50 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Event Timeline
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-slate-400">Registration Closes</div>
                  <div className="text-white font-medium text-sm">
                    {hackathon.registrationEnd
                      ? new Date(hackathon.registrationEnd).toLocaleString()
                      : "Open until start"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-slate-400">Hackathon Begins</div>
                  <div className="text-white font-medium text-sm">
                    {hackathon.startDate ? new Date(hackathon.startDate).toLocaleString() : "TBD"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-slate-400">Hackathon Ends / Submission Deadline</div>
                  <div className="text-white font-medium text-sm">
                    {hackathon.endDate ? new Date(hackathon.endDate).toLocaleString() : "TBD"}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Enrolled Students:</span>
                <span className="font-bold text-white">
                  {hackathon.registeredCount || 0} / {hackathon.maxParticipants || "Unlimited"}
                </span>
              </div>
            </div>
          </div>

          {/* Room Access Widget */}
          <div className="p-6 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Hackathon Room</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every hackathon features a dedicated room for live announcements, submission tracking, and project showcase.
            </p>

            {isRegistered ? (
              roomId ? (
                <Link
                  to={`/hackathon/room/${roomId}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  <span>Go to Room</span>
                </Link>
              ) : null
            ) : isRegOpen ? (
              <button
                onClick={() => setShowRegModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
              >
                <span>Register to Enter Room</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                Register for Hackathon
              </h3>
              <button
                onClick={() => setShowRegModal(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Team Name (Optional if participating solo)
                </label>
                <input
                  type="text"
                  value={regData.teamName}
                  onChange={(e) => setRegData({ ...regData, teamName: e.target.value })}
                  placeholder="e.g. CodeCraft Innovators"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  College / University
                </label>
                <input
                  type="text"
                  value={regData.college}
                  onChange={(e) => setRegData({ ...regData, college: e.target.value })}
                  placeholder="e.g. Pune Institute of Computer Technology"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300 pt-2">
                <input
                  type="checkbox"
                  id="agreeRules"
                  required
                  checked={regData.agreeToRules}
                  onChange={(e) => setRegData({ ...regData, agreeToRules: e.target.checked })}
                  className="rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="agreeRules">
                  I agree to abide by the event code of conduct and submission deadlines.
                </label>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition disabled:opacity-50"
                >
                  {registering ? "Registering..." : "Confirm Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
