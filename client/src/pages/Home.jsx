import { Link } from "react-router-dom";
import { Terminal, ArrowRight, GitPullRequest, Code2, Layers } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";

const steps = [
  {
    step: "01",
    icon: Code2,
    title: "Document & Publish",
    desc: "Post your semester project, hackathon prototype, or personal build with screenshots, GitHub repo, and live demo links.",
  },
  {
    step: "02",
    icon: Layers,
    title: "Tag Tech Stack",
    desc: "Filter and discover peers by frameworks like React, Node.js, Flutter, and PyTorch so students with complementary skills connect.",
  },
  {
    step: "03",
    icon: GitPullRequest,
    title: "Request Collaboration",
    desc: "Need a frontend lead or backend teammate? Send a direct collaboration request with a note explaining how you want to contribute.",
  },
];

export function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 rounded border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Terminal className="h-3.5 w-3.5" />
            <span>Campus developer community</span>
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl sm:leading-tight">
            The student platform for showcasing projects and finding collaborators.
          </h1>

          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Stop letting your college projects get lost on your hard drive. Publish your work, get genuine feedback from fellow students, and team up on your next build.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button asChild size="lg">
                  <Link to={user?.role === "admin" ? "/admin" : "/dashboard"}>
                    Go to dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/feed">Explore projects</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link to="/register">
                    Create account <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/login">Log in</Link>
                </Button>
              </>
            )}
          </div>

        </div>
      </section>

      {/* How it Works Section */}
      <section className="border-t border-border bg-card/60 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-foreground">How DevSpotlight works</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A straightforward process designed specifically for student developers and academic project requirements.
            </p>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="font-code text-xs font-bold text-primary">{step}</span>
                  <div className="rounded border border-border p-2 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer-Focused Footer */}
      <footer className="border-t border-border bg-card py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
              <Terminal className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold text-foreground">DevSpotlight</span>
            <span className="text-xs text-muted-foreground">· Built by students, for students</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            <Link to="/feed" className="hover:text-foreground">Browse Projects</Link>
            <Link to="/register" className="hover:text-foreground">Create Account</Link>
            <Link to="/login" className="hover:text-foreground">Log In</Link>
            <Link to="/hackathons" className="hover:text-foreground">Hackathons</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
