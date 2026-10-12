import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { LayoutDashboard, Compass, User, Users, Bell, Sparkles } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getReceivedRequests } from "../../api/collaboration.api";

const guestNavItems = [
  { title: "Home", href: "/", icon: Compass },
  { title: "Explore projects", href: "/feed", icon: LayoutDashboard },
];

const authNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Explore projects", href: "/feed", icon: Compass },
  { title: "Find Teammates", href: "/find-teammates", icon: Sparkles },
  { title: "Collaboration", href: "/requests", icon: Users, badgeKey: "pending" },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "My profile", href: "/profile", icon: User },
];

export function Sidebar({ open, onNavigate }) {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [pending, setPending] = useState(0);

  // Count of requests waiting for the user's answer. Refreshed on every navigation so it
  // drops as soon as a request is answered.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    getReceivedRequests("pending")
      .then((requests) => active && setPending(requests.length))
      .catch(() => active && setPending(0));
    return () => {
      active = false;
    };
  }, [isAuthenticated, pathname]);

  const items = isAuthenticated ? authNavItems : guestNavItems;
  const count = isAuthenticated ? pending : 0;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-60 border-r border-border bg-card pt-14 transition-transform duration-150 md:sticky md:top-14 md:z-auto md:h-[calc(100vh-3.5rem)] md:translate-x-0 md:pt-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-full flex-col justify-between p-3">
        <nav className="flex flex-col gap-1" aria-label="Main">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                <span className="flex-1">{item.title}</span>
                {item.badgeKey === "pending" && count > 0 ? (
                  <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning" aria-label={`${count} pending`}>
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border pt-3">
          <p className="px-3 text-xs text-muted-foreground">
            Built for college developers to showcase and collaborate.
          </p>
        </div>
      </div>
    </aside>
  );
}
