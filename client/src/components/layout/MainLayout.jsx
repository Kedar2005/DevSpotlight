import { useState, useEffect, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { LoadingState } from "../shared/PageState";

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("devspotlight_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen((open) => !open);
    } else {
      setCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("devspotlight_sidebar_collapsed", String(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    }
  };

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleToggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar onToggleSidebar={handleToggle} isCollapsed={collapsed} />
      <div className="flex flex-1 relative">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
        />
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-foreground/30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <main className="min-w-0 flex-1 transition-all duration-200 ease-in-out">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
