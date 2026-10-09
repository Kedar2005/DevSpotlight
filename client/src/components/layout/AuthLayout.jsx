import { Outlet, Link } from "react-router-dom";
import { Code2 } from "lucide-react";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10 sm:justify-center">
      <Link to="/" className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <Code2 className="h-5 w-5 text-primary" aria-hidden="true" />
        DevSpotlight
      </Link>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
      <Link to="/feed" className="mt-6 text-sm text-muted-foreground hover:text-foreground hover:underline">
        Browse projects without an account
      </Link>
    </div>
  );
}
