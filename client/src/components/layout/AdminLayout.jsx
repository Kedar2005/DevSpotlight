import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderGit2,
  GraduationCap,
  Trophy,
  DoorOpen,
  FileBarChart,
  Settings,
  ArrowLeft,
  ShieldAlert,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

const adminNavItems = [
  { title: "Overview", href: "/admin", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Projects", href: "/admin/projects", icon: FolderGit2 },
  { title: "Colleges", href: "/admin/colleges", icon: GraduationCap },
  { title: "Hackathons", href: "/admin/hackathons", icon: Trophy },
  { title: "Hackathon Rooms", href: "/admin/rooms", icon: DoorOpen },
  { title: "Reports", href: "/admin/reports", icon: FileBarChart },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Admin Top Navbar */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded border border-border"
            aria-label="Toggle admin menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <Link to="/admin" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded border border-primary/30 bg-primary/10 text-primary">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight text-foreground">DevSpotlight</span>
            <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
              Admin
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex text-xs">
            <Link to="/dashboard">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Student View
            </Link>
          </Button>

          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium">
            <Avatar user={user} size="xs" />
            <span className="hidden md:inline-block max-w-[120px] truncate">
              {user?.fullName || user?.userName}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Log out"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Admin Sidebar Navigation (Desktop) */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 top-14 w-60 border-r border-border bg-card p-3 transition-transform md:static md:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <div className="flex h-full flex-col justify-between">
            <nav className="space-y-1">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Platform Management
              </p>
              {adminNavItems.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin" || pathname === "/admin/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border pt-3">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Student App</span>
              </Link>
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-foreground/30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Admin Content Area */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
