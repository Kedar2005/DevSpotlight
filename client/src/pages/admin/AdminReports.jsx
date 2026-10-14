import { useState, useEffect } from "react";
import {
  FileText,
  ShieldAlert,
  UserX,
  Trophy,
  RefreshCw,
  AlertCircle,
  Download,
  CheckCircle,
  Activity
} from "lucide-react";
import { getAdminReports } from "../../api/admin.api";

export default function AdminReports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("moderation");

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    getAdminReports()
      .then((data) => {
        if (!active) return;
        setReports(data || {});
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load audit reports");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const fetchReports = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const handleDownloadReport = () => {
    if (!reports) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(reports, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `devspotlight-audit-report-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-400" />
            Audit & Compliance Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time platform logs, moderation records, suspension audits, and hackathon registrations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleDownloadReport}
            disabled={!reports}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium transition cursor-pointer disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-indigo-400" />
            Export JSON
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Stat Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Moderated Projects</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {reports?.moderatedProjects?.length ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Hidden from public discovery</div>
        </div>

        <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Suspended Accounts</span>
            <UserX className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {reports?.suspendedUsers?.length ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Blocked from platform APIs</div>
        </div>

        <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Recent Hackathon Signups</span>
            <Trophy className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {reports?.recentRegistrations?.length ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Participants enrolled in events</div>
        </div>

        <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">System Health</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" /> Healthy
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Audit logs active and logging</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("moderation")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "moderation"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Project Moderation Log ({reports?.moderatedProjects?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("suspensions")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "suspensions"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Suspension Audit ({reports?.suspendedUsers?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("registrations")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "registrations"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Hackathon Registrations ({reports?.recentRegistrations?.length || 0})
        </button>
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
          <span>Generating audit logs...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === "moderation" && (
            <div className="space-y-3">
              {reports?.moderatedProjects?.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-white/5 bg-slate-900/30 text-slate-400 text-sm">
                  No moderated or soft-deleted projects on record.
                </div>
              ) : (
                reports?.moderatedProjects?.map((p) => (
                  <div
                    key={p._id}
                    className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        {p.title}
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300">
                          {p.category}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        Owner: <span className="text-slate-300">@{p.userId?.userName || "unknown"}</span>
                        {p.moderatedBy && (
                          <span> • Moderated by: <span className="text-slate-300">@{p.moderatedBy.userName}</span></span>
                        )}
                      </div>
                      <div className="text-amber-200/90 font-medium">
                        Reason: "{p.moderationReason || "Violates community guidelines"}"
                      </div>
                    </div>
                    <div className="text-right text-slate-500 text-[11px] shrink-0">
                      <div>Deleted: {p.deletedAt ? new Date(p.deletedAt).toLocaleString() : "N/A"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "suspensions" && (
            <div className="space-y-3">
              {reports?.suspendedUsers?.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-white/5 bg-slate-900/30 text-slate-400 text-sm">
                  No accounts currently under suspension.
                </div>
              ) : (
                reports?.suspendedUsers?.map((u) => (
                  <div
                    key={u._id}
                    className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        {u.fullName || u.userName}
                        <span className="text-slate-400 text-xs font-normal">@{u.userName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-rose-500/20 text-rose-300">
                          Suspended
                        </span>
                      </div>
                      <div className="text-slate-400">{u.email}</div>
                      <div className="text-rose-300/90 font-medium">
                        Reason: "{u.suspendedReason || "Platform policy violation"}"
                      </div>
                    </div>
                    <div className="text-right text-slate-500 text-[11px] shrink-0">
                      <div>Suspended At: {u.suspendedAt ? new Date(u.suspendedAt).toLocaleString() : "N/A"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "registrations" && (
            <div className="space-y-3">
              {reports?.recentRegistrations?.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-white/5 bg-slate-900/30 text-slate-400 text-sm">
                  No hackathon registrations recorded yet.
                </div>
              ) : (
                reports?.recentRegistrations?.map((r) => (
                  <div
                    key={r._id}
                    className="p-4 rounded-xl border border-white/10 bg-slate-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-white text-sm">
                        {r.hackathon?.title || "Hackathon"}
                      </div>
                      <div className="text-slate-400">
                        Student: <span className="text-indigo-300 font-medium">{r.user?.fullName || r.user?.userName}</span> (@{r.user?.userName})
                      </div>
                      <div className="text-slate-500">{r.user?.email}</div>
                    </div>
                    <div className="text-right text-slate-400 text-[11px] shrink-0">
                      <div>Status: <span className="text-emerald-400 uppercase font-semibold">{r.status || "registered"}</span></div>
                      <div>Registered: {new Date(r.registeredAt || r.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
