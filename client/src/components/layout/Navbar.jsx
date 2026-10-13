import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getReceivedRequests } from "../../api/collaboration.api";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import { Terminal, Bell } from "lucide-react";

export function Navbar({ onToggleSidebar, onMenuClick, isCollapsed }) {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    getReceivedRequests("pending")
      .then((requests) => {
        if (active) {
          setUnreadCount(Array.isArray(requests) ? requests.length : 0);
        }
      })
      .catch(() => {
        if (active) setUnreadCount(0);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left: Brand with integrated sidebar collapse toggle (no separate toggle button icon) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleSidebar || onMenuClick}
            aria-label="Toggle sidebar"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-7 w-7 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <Terminal className="h-4 w-4" aria-hidden="true" />
          </button>
          <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-base font-semibold tracking-tight">DevSpotlight</span>
            <span className="hidden rounded bg-secondary px-1.5 py-0.5 font-code text-[11px] font-medium text-muted-foreground lg:inline-block">
              student builds
            </span>
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Notification Bell with Badge */}
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
                title="Notifications"
              >
                <Link to="/notifications" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-card"
                      aria-label={`${unreadCount} unread notifications`}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              </Button>

              {/* User Profile Link */}
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <Avatar user={user} size="xs" />
                <span className="hidden sm:inline-block">
                  {user?.fullName?.split(" ")[0] || user?.userName}
                </span>
              </Link>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
