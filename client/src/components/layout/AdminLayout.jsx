import { useState, Suspense } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderGit2,
  GraduationCap,
  Trophy,
  DoorOpen,
  ClipboardCheck,
  FileText,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Avatar } from "../ui/avatar";
import { cn } from "../../lib/utils";
import { LoadingState } from "../shared/PageState";

const adminNavItems = [
  { title: "Overview", href: "/admin", icon: LayoutDashboard, end: true },
  { title: "Students", href: "/admin/students", icon: Users },
  { title: "Projects", href: "/admin/projects", icon: FolderGit2 },
  { title: "Colleges", href: "/admin/colleges", icon: GraduationCap },
  { title: "Hackathons", href: "/admin/hackathons", icon: Trophy },
  { title: "Hackathon Rooms", href: "/admin/rooms", icon: DoorOpen },
  { title: "Submissions", href: "/admin/submissions", icon: ClipboardCheck },
  { title: "Reports", href: "/admin/reports", icon: FileText },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    setMobileOpen(false);
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border lg:hidden"
            aria-label={mobileOpen ? "Close admin menu" : "Open admin menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <Link to="/admin" className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-base font-semibold tracking-tight">DevSpotlight</span>
            <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs font-medium">
            <Avatar user={user} size="xs" />
            <span className="hidden max-w-[140px] truncate md:inline">{user?.fullName || user?.userName}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={cn(
            "fixed bottom-0 left-0 top-14 z-40 w-60 border-r border-border bg-card p-3 transition-transform lg:sticky lg:h-[calc(100vh-3.5rem)] lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          aria-label="Admin navigation"
        >
          <nav className="flex h-full flex-col">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Platform management
            </p>
            <div className="space-y-0.5">
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.title}</span>
                </NavLink>
              ))}
            </div>

            <div className="mt-auto border-t border-border pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
            </div>
          </nav>
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
