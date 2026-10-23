import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { RotateCw, Download } from "lucide-react";
import { getAdminReports } from "../../api/admin.api";
import { getErrorMessage } from "../../lib/errors";
import { formatDate } from "../../lib/hackathon";
import { Button } from "../../components/ui/button";
import { Alert } from "../../components/ui/alert";
import { cn } from "../../lib/utils";
import { PageHeader, LoadingState, EmptyState } from "../../components/shared/PageState";

const TABS = [
  { key: "moderatedProjects", label: "Moderated projects" },
  { key: "suspendedUsers", label: "Suspended accounts" },
  { key: "recentRegistrations", label: "Hackathon registrations" },
];

// Rows per report: [primary text, secondary text, date]
const ROWS = {
  moderatedProjects: (p) => [
    p.title,
    `${p.category || "Other"} · by @${p.userId?.userName || "unknown"}${p.moderatedBy ? ` · moderated by @${p.moderatedBy.userName}` : ""}${p.moderationReason ? ` · ${p.moderationReason}` : ""}`,
    p.deletedAt,
  ],
  suspendedUsers: (u) => [
    `${u.fullName || u.userName} (@${u.userName})`,
    `${u.email}${u.suspendedReason ? ` · ${u.suspendedReason}` : ""}`,
    u.suspendedAt,
  ],
  recentRegistrations: (r) => [
    `${r.user?.fullName || r.user?.userName || "Deleted user"} → ${r.hackathon?.title || "Deleted hackathon"}`,
    `${r.user?.email || ""}${r.status ? ` · ${r.status}` : ""}`,
    r.registeredAt,
  ],
};

const MANAGE_LINK = {
  moderatedProjects: "/admin/projects",
  suspendedUsers: "/admin/students",
  recentRegistrations: "/admin/hackathons",
};

export default function AdminReports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(TABS[0].key);
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
        if (active) setError(getErrorMessage(err, "Failed to load reports."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `devspotlight-report-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const rows = reports?.[activeTab] || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Moderation records, suspended accounts and recent hackathon registrations."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                setReloadKey((k) => k + 1);
              }}
              disabled={loading}
            >
              <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!reports}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export JSON
            </Button>
          </>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex gap-1 border-b border-border" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              activeTab === tab.key
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {reports?.[tab.key] ? ` (${reports[tab.key].length})` : ""}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card" role="tabpanel">
        {loading && !reports ? (
          <LoadingState label="Loading reports…" />
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing to report" />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const [primary, secondary, date] = ROWS[activeTab](row);
              return (
                <li key={row._id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{primary}</p>
                    <p className="truncate text-xs text-muted-foreground">{secondary}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(date)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {rows.length > 0 && (
          <div className="border-t border-border px-4 py-2 text-right">
            <Link to={MANAGE_LINK[activeTab]} className="text-xs text-primary hover:underline">
              Manage →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
