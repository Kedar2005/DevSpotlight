import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  Globe,
  Lock,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Calendar,
  EyeOff,
  ShieldCheck
} from "lucide-react";
import {
  getAdminRooms,
  publishRoom,
  unpublishRoom
} from "../../api/admin.api";

export default function AdminHackathonRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    getAdminRooms()
      .then((data) => {
        if (!active) return;
        setRooms(data || []);
      })
      .catch((err) => {
        if (!active) return;
        setActionError(err?.response?.data?.message || "Failed to load hackathon rooms");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const fetchRooms = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const handlePublish = async (room) => {
    if (room.hackathon?.status !== "completed") {
      setActionError(`Cannot publish room: Linked hackathon "${room.hackathon?.title}" is currently "${room.hackathon?.status}". Only completed hackathons can be published to the public showcase.`);
      return;
    }

    setActionError("");
    setActionSuccess("");
    setProcessingId(room._id);

    try {
      await publishRoom(room._id);
      setActionSuccess(`Room for "${room.hackathon?.title}" is now PUBLIC and featured on the Showcase!`);
      fetchRooms();
    } catch (err) {
      setActionError(err?.response?.data?.message || "Failed to publish room");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnpublish = async (room) => {
    setActionError("");
    setActionSuccess("");
    setProcessingId(room._id);

    try {
      await unpublishRoom(room._id);
      setActionSuccess(`Room for "${room.hackathon?.title}" has been set to PRIVATE.`);
      fetchRooms();
    } catch (err) {
      setActionError(err?.response?.data?.message || "Failed to unpublish room");
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = rooms.filter(r => {
    const title = r.hackathon?.title?.toLowerCase() || "";
    const college = r.hackathon?.college?.name?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return title.includes(term) || college.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-400" />
            Hackathon Rooms & Visibility Control
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Govern room access, participant collaboration spaces, and public showcase publication.
          </p>
        </div>
        <button
          onClick={fetchRooms}
          className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition self-start md:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Policy banner */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Visibility and Access Control Policy</p>
          <p className="text-indigo-200/80 leading-relaxed">
            By default, every hackathon room is provisioned as <strong>Private</strong>. Only registered participants and administrators can access private rooms to view problem statements, team submissions, and real-time feeds. A room can only be published to the <strong>Public Showcase</strong> once the hackathon status has officially transitioned to <strong>Completed</strong>.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError("")} className="text-rose-400 hover:text-white">&times;</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess("")} className="text-emerald-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by hackathon title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <div className="text-xs text-slate-400">
          Total Rooms: <span className="font-semibold text-white">{filtered.length}</span>
        </div>
      </div>

      {/* Room list */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
          <span>Loading rooms...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-white/5 bg-slate-900/30">
          <Layers className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No rooms found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? "Try adjusting your search query."
              : "Rooms are automatically created when new hackathons are added."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((room) => {
            const isPublic = room.visibility === "public";
            const hackathonStatus = room.hackathon?.status || "unknown";
            const canPublish = hackathonStatus === "completed";
            const isProcessing = processingId === room._id;

            return (
              <div
                key={room._id}
                className="p-5 rounded-2xl border border-white/10 bg-slate-900/50 hover:border-white/20 transition flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Info */}
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isPublic ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
                        <Globe className="h-3 w-3" />
                        Public Showcase
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1.5">
                        <Lock className="h-3 w-3" />
                        Private Room
                      </span>
                    )}

                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold px-2 py-0.5 rounded bg-white/5">
                      Hackathon Status: <span className="text-white">{hackathonStatus.replace("_", " ")}</span>
                    </span>

                    <span className="text-xs text-slate-400 px-2 py-0.5 rounded bg-white/5">
                      Room Status: <span className="text-white capitalize">{room.status}</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {room.hackathon?.title || "Untitled Hackathon Room"}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap">
                    {room.publishedAt && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Published on {new Date(room.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      Created: {new Date(room.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-slate-500">
                      Room ID: <code className="text-slate-400">{room._id}</code>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-row items-stretch sm:items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5">
                  <Link
                    to={`/hackathon/room/${room._id}`}
                    target="_blank"
                    className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
                    Enter Room View
                  </Link>

                  {isPublic ? (
                    <button
                      onClick={() => handleUnpublish(room)}
                      disabled={isProcessing}
                      className="px-3.5 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      {isProcessing ? "Updating..." : "Make Private"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePublish(room)}
                      disabled={isProcessing}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm ${
                        canPublish
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20 cursor-pointer"
                          : "bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10 hover:text-slate-400 cursor-help"
                      } disabled:opacity-50`}
                      title={
                        canPublish
                          ? "Publish completed hackathon to Public Showcase"
                          : `Cannot publish: Hackathon is currently "${hackathonStatus}". It must be marked "completed" first.`
                      }
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {isProcessing
                        ? "Publishing..."
                        : canPublish
                        ? "Publish to Showcase"
                        : "Make Public (Requires Completed)"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
