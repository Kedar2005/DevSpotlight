import { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getPublicProfile } from "../api/user.api";
import { getErrorMessage } from "../lib/errors";
import { useAuth } from "../hooks/useAuth";
import { ProjectCard } from "../components/shared/ProjectCard";
import { ProfileSummary, CollaborationActivity } from "../components/shared/ProfileSummary";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";

export function PublicProfile() {
  const { userName } = useParams();
  return <PublicProfileView key={userName} userName={userName} />;
}

function PublicProfileView({ userName }) {
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPublicProfile(userName)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(getErrorMessage(err, "Couldn't load this profile.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userName]);

  if (me && me.userName === userName?.toLowerCase()) return <Navigate to="/profile" replace />;
  
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-8 text-center text-xs text-muted-foreground">
        Loading student developer profile...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-8 space-y-4">
        <Alert tone="error">{error}</Alert>
        <Button asChild variant="outline" size="sm">
          <Link to="/explore">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Explore
          </Link>
        </Button>
      </div>
    );
  }

  const patchProject = (id, patch) =>
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p._id === id ? { ...p, ...patch } : p)),
    }));

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-4">
        <Link
          to="/explore"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Explore
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
        <ProfileSummary
          user={data.user}
          stats={{
            projectsCount: data.projects?.length || 0,
            collaborationsCount: data.collaborations?.length || 0,
          }}
        />

        <div className="min-w-0 space-y-8">
          <section className="space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">
                Projects by {data.user?.fullName || `@${data.user?.userName}`}
              </h2>
              <p className="text-xs text-muted-foreground">
                Showcased portfolio projects open for feedback or collaboration.
              </p>
            </div>

            {data.projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground">
                This student developer hasn't published any projects yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.projects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onChange={(patch) => patchProject(project._id, patch)}
                  />
                ))}
              </div>
            )}
          </section>

          <CollaborationActivity items={data.collaborations || []} />
        </div>
      </div>
    </div>
  );
}
