import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getProjectById, updateProject } from "../api/project.api";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../lib/errors";
import { ProjectForm } from "../components/shared/ProjectForm";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";

export function EditProject() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getProjectById(id)
      .then((data) => active && setProject(data))
      .catch((err) => active && setLoadError(getErrorMessage(err, "Project not found.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const handleSubmit = async (payload) => {
    setError("");
    try {
      await updateProject(id, payload);
      navigate(`/project/${id}`, { state: { saved: true } });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save changes"));
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-sm text-muted-foreground">
        Loading project details...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl p-8 space-y-4">
        <Alert tone="error">{loadError}</Alert>
        <Button asChild variant="outline" size="sm">
          <Link to="/explore">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Explore
          </Link>
        </Button>
      </div>
    );
  }

  if (project.userId?._id !== user?._id) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <Alert tone="error">Only the owner of this project can edit it.</Alert>
        <Button asChild variant="outline" size="sm">
          <Link to={`/project/${id}`}>Back to project</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-4">
        <Link
          to={`/project/${id}`}
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Project
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your project info, screenshots, repository link, or tech stack.
        </p>
      </div>

      <ProjectForm
        initial={project}
        submitLabel="Save Changes"
        submittingLabel="Saving Changes..."
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/project/${id}`)}
        error={error}
      />
    </div>
  );
}
