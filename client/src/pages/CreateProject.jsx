import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { createProject } from "../api/project.api";
import { getErrorMessage } from "../lib/errors";
import { ProjectForm } from "../components/shared/ProjectForm";

export function CreateProject() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleSubmit = async (payload) => {
    setError("");
    try {
      const created = await createProject(payload);
      navigate(`/project/${created._id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to publish project"));
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-4">
        <Link
          to="/explore"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Explore
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Publish a Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Showcase your hackathon project, semester build, or open source tool to the student community.
        </p>
      </div>

      <ProjectForm
        submitLabel="Publish Project"
        submittingLabel="Publishing..."
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
        error={error}
      />
    </div>
  );
}
