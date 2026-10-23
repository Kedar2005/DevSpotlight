import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  FolderGit2,
  GraduationCap,
  Trophy,
  Activity,
  ClipboardCheck,
  RotateCw,
  Plus,
  DoorOpen,
} from "lucide-react";
import { getAdminStats } from "../../api/admin.api";
import { getErrorMessage } from "../../lib/errors";
import { formatDate } from "../../lib/hackathon";
import { Button } from "../../components/ui/button";
import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { PageHeader, LoadingState, EmptyState } from "../../components/shared/PageState";

const SUMMARY_CARDS = [
  { key: "totalStudents", label: "Total Students", icon: Users, href: "/admin/students" },
  { key: "totalProjects", label: "Total Projects", icon: FolderGit2, href: "/admin/projects" },
  { key: "totalColleges", label: "Total Colleges", icon: GraduationCap, href: "/admin/colleges" },
  { key: "totalHackathons", label: "Total Hackathons", icon: Trophy, href: "/admin/hackathons" },
  { key: "activeHackathons", label: "Active Hackathons", icon: Activity, href: "/admin/hackathons" },
  { key: "pendingSubmissions", label: "Pending Reviews", icon: ClipboardCheck, href: "/admin/submissions" },
];

const QUICK_ACTIONS = [
  { label: "Create Hackathon", href: "/admin/hackathons?create=1", icon: Plus },
  { label: "Manage Students", href: "/admin/students", icon: Users },
  { label: "Manage Projects", href: "/admin/projects", icon: FolderGit2 },
  { label: "Manage Colleges", href: "/admin/colleges", icon: GraduationCap },
  { label: "Manage Hackathon Rooms", href: "/admin/rooms", icon: DoorOpen },
  { label: "Review Submissions", href: "/admin/submissions", icon: ClipboardCheck },
];

const ACTIVITY_LABEL = {
  student: "New student",
  project: "New project",
  hackathon: "Hackathon",
  submission: "Submission",
};

const STATUS_VARIANT = {
  active: "success",
  suspended: "danger",
  moderated: "danger",
  submitted: "warning",
  accepted: "success",
  rejected: "danger",
};

export function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getAdminStats()
      .then((data) => {
        if (!active) return;
        setStats(data);
        setError("");
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Failed to load dashboard data."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const refresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Current platform totals and the latest activity."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      <section aria-label="Summary">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {SUMMARY_CARDS.map((card) => (
            <Link
              key={card.key}
              to={card.href}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{card.label}</span>
                <card.icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                {loading && !stats ? "…" : stats?.[card.key] ?? "—"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card lg:col-span-2" aria-labelledby="recent-activity">
          <div className="border-b border-border px-4 py-3">
            <h2 id="recent-activity" className="text-sm font-semibold">Recent activity</h2>
          </div>
          {loading && !stats ? (
            <LoadingState label="Loading activity…" />
          ) : !stats?.recentActivity?.length ? (
            <EmptyState title="No activity yet" description="New students, projects, hackathons and submissions will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Item</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recentActivity.map((item, index) => (
                    <tr key={`${item.type}-${index}`}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                        {ACTIVITY_LABEL[item.type] || item.type}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link to={item.link} className="font-medium text-foreground hover:text-primary">
                          {item.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={STATUS_VARIANT[item.status] || "outline"} className="capitalize">
                          {item.status?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                        {formatDate(item.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card" aria-labelledby="quick-actions">
          <div className="border-b border-border px-4 py-3">
            <h2 id="quick-actions" className="text-sm font-semibold">Quick actions</h2>
          </div>
          <div className="grid gap-2 p-3">
            {QUICK_ACTIONS.map((action) => (
              <Button key={action.label} asChild variant="outline" className="justify-start">
                <Link to={action.href}>
                  <action.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
