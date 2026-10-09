import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import { Terminal, LogOut, Menu, Plus, Compass } from "lucide-react";

export function Navbar({ onMenuClick }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2.5 font-semibold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
              <Terminal className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight">DevSpotlight</span>
            <span className="hidden rounded bg-secondary px-1.5 py-0.5 font-code text-[11px] font-medium text-muted-foreground lg:inline-block">
              student builds
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/feed"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === "/feed" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              Explore
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/create-project"><Plus className="h-4 w-4" /> New project</Link>
              </Button>
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-sm font-medium text-foreground hover:bg-accent"
              >
                <Avatar user={user} size="xs" />
                <span className="hidden sm:inline-block">{user?.fullName?.split(" ")[0]}</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => logout().catch(() => {})} aria-label="Log out" title="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/login">Log in</Link></Button>
              <Button asChild size="sm"><Link to="/register">Create account</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
