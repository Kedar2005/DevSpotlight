import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  FolderGit2,
  GraduationCap,
  Trophy,
  DoorOpen,
  ShieldCheck,
  RotateCw,
} from "lucide-react";
import { getAdminStats } from "../../api/admin.api";
import { getErrorMessage } from "../../lib/errors";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Alert } from "../../components/ui/alert";

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
        if (!active) return;
        setError(getErrorMessage(err, "Failed to load admin statistics."));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const fetchStats = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Platform Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Real-time platform metrics, user activity, moderation, and hackathon operations.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RotateCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Stats
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {/* Real Statistics Metric Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground font-code">{stats.totalUsers}</p>
              <p className="text-[11px] text-muted-foreground">{stats.totalStudents} student developers</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
                <FolderGit2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-foreground font-code">{stats.totalProjects}</p>
              <p className="text-[11px] text-muted-foreground">Excludes moderated/deleted</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Colleges</span>
                <GraduationCap className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-foreground font-code">{stats.totalColleges}</p>
              <p className="text-[11px] text-muted-foreground">Affiliated institutions</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Hackathons</span>
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-foreground font-code">{stats.totalHackathons}</p>
              <p className="text-[11px] text-emerald-500 font-medium">{stats.activeHackathons} active/open</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Hackathons</span>
                <Trophy className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-foreground font-code">{stats.activeHackathons}</p>
              <p className="text-[11px] text-muted-foreground">Registration or ongoing</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Private Rooms</span>
                <DoorOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground font-code">{stats.privateRooms}</p>
              <p className="text-[11px] text-muted-foreground">Restricted to participants</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Public Showcase</span>
                <DoorOpen className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-foreground font-code">{stats.publicRooms}</p>
              <p className="text-[11px] text-emerald-500 font-medium">Published hackathon rooms</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Platform Security</span>
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground">Role Guarded</p>
              <p className="text-[11px] text-muted-foreground">Admin JWT authorization active</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Quick Administration Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/admin/hackathons"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Manage Hackathons
              </p>
              <p className="text-xs text-muted-foreground">Create or schedule hackathons</p>
            </div>
          </Link>

          <Link
            to="/admin/rooms"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Publish Rooms
              </p>
              <p className="text-xs text-muted-foreground">Post-hackathon showcase</p>
            </div>
          </Link>

          <Link
            to="/admin/users"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                User Management
              </p>
              <p className="text-xs text-muted-foreground">Search, inspect, and suspend</p>
            </div>
          </Link>

          <Link
            to="/admin/projects"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Moderate Projects
              </p>
              <p className="text-xs text-muted-foreground">Remove spam or abusive posts</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
