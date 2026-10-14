import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  Compass,
  Sparkles,
  Users,
  Bell,
  User,
  Settings,
  LogOut,
  Trophy,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getReceivedRequests } from "../../api/collaboration.api";

const guestNavItems = [
  { title: "Home", href: "/", icon: Compass },
  { title: "Explore Projects", href: "/feed", icon: LayoutDashboard },
  { title: "Hackathons", href: "/hackathons", icon: Trophy },
];

const authNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Explore Projects", href: "/feed", icon: Compass },
  { title: "Find Teammates", href: "/find-teammates", icon: Sparkles },
  { title: "Hackathons", href: "/hackathons", icon: Trophy },
  { title: "Collaboration", href: "/requests", icon: Users, badgeKey: "pending" },
  { title: "Notifications", href: "/notifications", icon: Bell, badgeKey: "pending" },
  { title: "My Profile", href: "/profile", icon: User },
];

export function Sidebar({ collapsed = false, mobileOpen = false, onNavigate }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  // Count of requests waiting for the user's answer
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    getReceivedRequests("pending")
      .then((requests) => active && setPending(requests?.length || 0))
      .catch(() => active && setPending(0));
    return () => {
      active = false;
    };
  }, [isAuthenticated, pathname]);

  // Close settings popover when clicking outside
  useEffect(() => {
    if (!settingsOpen) return undefined;
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [settingsOpen]);

  const handleLogout = async () => {
    setSettingsOpen(false);
    onNavigate?.();
    try {
      await logout();
    } catch {
      // Continue navigation even if network fails
    }
    navigate("/login");
  };

  const items = isAuthenticated ? authNavItems : guestNavItems;
  const count = isAuthenticated ? pending : 0;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 border-r border-border bg-card pt-14 transition-all duration-200 ease-in-out md:sticky md:top-14 md:z-auto md:h-[calc(100vh-3.5rem)] md:pt-0",
        // Width behavior: w-60 on mobile; on desktop: md:w-16 if collapsed, md:w-60 if expanded
        collapsed ? "w-60 md:w-16" : "w-60 md:w-60",
        // Mobile visibility toggle
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="flex h-full flex-col justify-between p-2.5">
        {/* Navigation Items */}
        <nav className="flex flex-col gap-1" aria-label="Main Navigation">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                title={item.title}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center rounded-md text-sm font-medium transition-colors",
                  collapsed
                    ? "justify-start px-3 py-2 md:justify-center md:px-2 md:py-2.5"
                    : "gap-2.5 px-3 py-2",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <div className="relative flex items-center justify-center">
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                    aria-hidden="true"
                  />
                  {/* Indicator dot in collapsed mode on desktop */}
                  {item.badgeKey === "pending" && count > 0 && collapsed && (
                    <span className="hidden md:block absolute -top-1 -right-1 h-2 w-2 rounded-full bg-warning ring-2 ring-card" />
                  )}
                </div>

                {/* Text label: always shown on mobile, hidden on desktop if collapsed */}
                <span
                  className={cn(
                    "truncate flex-1 ml-2.5",
                    collapsed && "md:hidden"
                  )}
                >
                  {item.title}
                </span>

                {/* Full badge count in expanded mode */}
                {item.badgeKey === "pending" && count > 0 && (
                  <span
                    className={cn(
                      "rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning ml-auto",
                      collapsed && "md:hidden"
                    )}
                    aria-label={`${count} pending`}
                  >
                    {count}
                  </span>
                )}

                {/* Tooltip on desktop in collapsed state */}
                {collapsed && (
                  <div className="pointer-events-none absolute left-full ml-2 z-50 hidden rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg whitespace-nowrap md:group-hover:block">
                    {item.title}
                    {item.badgeKey === "pending" && count > 0 ? ` (${count})` : ""}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Settings Section */}
        {isAuthenticated && (
          <div className="border-t border-border pt-2 relative" ref={settingsRef}>
            {/* Settings Dropdown Popover */}
            {settingsOpen && (
              <div
                className={cn(
                  "absolute bottom-full mb-2 z-50 rounded-lg border border-border bg-card p-1 shadow-xl text-xs animate-in fade-in zoom-in-95",
                  collapsed
                    ? "left-0 w-52 md:left-14 md:w-52"
                    : "left-0 right-0 w-full"
                )}
              >
                <div className="px-3 py-2 border-b border-border/60">
                  <p className="font-semibold text-foreground truncate">
                    {user?.fullName || user?.userName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate font-code">
                    @{user?.userName}
                  </p>
                </div>

                <div className="p-1 space-y-0.5">
                  <Link
                    to="/profile"
                    onClick={() => {
                      setSettingsOpen(false);
                      onNavigate?.();
                    }}
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-foreground hover:bg-accent transition-colors font-medium"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Profile & Account</span>
                  </Link>

                  <Link
                    to="/requests"
                    onClick={() => {
                      setSettingsOpen(false);
                      onNavigate?.();
                    }}
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-foreground hover:bg-accent transition-colors font-medium"
                  >
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Collaboration Requests</span>
                  </Link>

                  {user?.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => {
                        setSettingsOpen(false);
                        onNavigate?.();
                      }}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-indigo-400 hover:bg-indigo-500/10 transition-colors font-semibold"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
                </div>

                <div className="border-t border-border/60 p-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-destructive hover:bg-destructive/10 transition-colors font-medium text-left cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Settings Trigger Button */}
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              title="Settings"
              className={cn(
                "group relative flex w-full items-center rounded-md text-sm font-medium transition-colors cursor-pointer",
                collapsed
                  ? "justify-start px-3 py-2 md:justify-center md:px-2 md:py-2.5"
                  : "gap-2.5 px-3 py-2",
                settingsOpen
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              aria-label="Settings"
              aria-expanded={settingsOpen}
            >
              <Settings className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
              <span
                className={cn(
                  "truncate ml-2.5",
                  collapsed && "md:hidden"
                )}
              >
                Settings
              </span>

              {collapsed && (
                <div className="pointer-events-none absolute left-full ml-2 z-50 hidden rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg whitespace-nowrap md:group-hover:block">
                  Settings
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
