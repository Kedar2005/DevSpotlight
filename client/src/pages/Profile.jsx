import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, Pencil, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getMyProjects } from "../api/project.api";
import { getMyCollaborations, updateProfile } from "../api/user.api";
import { getErrorMessage } from "../lib/errors";
import { ProjectCard } from "../components/shared/ProjectCard";
import { ProfileSummary, CollaborationActivity } from "../components/shared/ProfileSummary";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Alert } from "../components/ui/alert";
import { ChangePasswordForm } from "../components/shared/ChangePasswordForm";

export function Profile() {
  const { user, updateUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [collabs, setCollabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    userName: "",
    fullName: "",
    email: "",
    bio: "",
    skills: "",
    githubLink: "",
    avatarFile: null,
    coverImageFile: null,
  });

  useEffect(() => {
    let active = true;
    Promise.all([getMyProjects(), getMyCollaborations()])
      .then(([mine, joined]) => {
        if (!active) return;
        setProjects(mine);
        setCollabs(joined.map((project) => ({ _id: project._id, project })));
      })
      .catch((err) => console.error("Failed to load profile data", err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  const toggleEditor = () => {
    if (!isEditing) {
      setError("");
      setFormData({
        userName: user.userName || "",
        fullName: user.fullName || user.name || "",
        email: user.email || "",
        bio: user.bio || "",
        skills: (user.skills || []).join(", "),
        githubLink: user.githubLink || "",
        avatarFile: null,
        coverImageFile: null,
      });
    }
    setIsEditing((current) => !current);
  };

  const handleChange = (event) =>
    setFormData((current) => ({ ...current, [event.target.id]: event.target.value }));
  const handleFileChange = (event) =>
    setFormData((current) => ({ ...current, [event.target.id]: event.target.files?.[0] || null }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload = new FormData();
      ["userName", "fullName", "email", "bio", "skills", "githubLink"].forEach((key) =>
        payload.append(key, formData[key])
      );
      if (formData.avatarFile) payload.append("avatar", formData.avatarFile);
      if (formData.coverImageFile) payload.append("coverImage", formData.coverImageFile);

      updateUser(await updateProfile(payload));
      setIsEditing(false);
      setSaved(true);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const patchProject = (id, patch) =>
    setProjects((list) => list.map((p) => (p._id === id ? { ...p, ...patch } : p)));

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      {saved ? (
        <Alert tone="success" className="mb-6">
          Profile details updated successfully.
        </Alert>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
        {/* Left Column: Profile Card & Inline Editor */}
        <div className="space-y-4">
          <ProfileSummary
            user={user}
            stats={{
              projectsCount: projects.length,
              collaborationsCount: collabs.length,
            }}
          >
            <Button
              className="w-full font-medium"
              variant="outline"
              size="sm"
              onClick={toggleEditor}
            >
              {isEditing ? (
                <>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Close Editor
                </>
              ) : (
                <>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
                </>
              )}
            </Button>
          </ProfileSummary>

          {isEditing && (
            <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
                Edit Profile Information
              </h2>
              {error ? <Alert tone="error">{error}</Alert> : null}

              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-xs font-semibold text-foreground">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="userName" className="text-xs font-semibold text-foreground">
                  Username
                </label>
                <Input
                  id="userName"
                  type="text"
                  value={formData.userName}
                  onChange={handleChange}
                  required
                  className="bg-background font-code text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-foreground">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bio" className="text-xs font-semibold text-foreground">
                  Bio
                </label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  className="bg-background min-h-[90px] text-xs leading-relaxed"
                  placeholder="Tell other students what you enjoy building..."
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="skills" className="text-xs font-semibold text-foreground">
                  Skills & Tools
                </label>
                <Input
                  id="skills"
                  placeholder="React, TypeScript, Python, Docker"
                  value={formData.skills}
                  onChange={handleChange}
                  className="bg-background font-code text-xs"
                />
                <p className="text-[11px] text-muted-foreground">Comma-separated tags</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="githubLink" className="text-xs font-semibold text-foreground">
                  GitHub Profile URL
                </label>
                <Input
                  id="githubLink"
                  placeholder="https://github.com/username"
                  value={formData.githubLink}
                  onChange={handleChange}
                  className="bg-background font-code text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="avatarFile" className="text-xs font-semibold text-foreground">
                  New Avatar Picture
                </label>
                <Input id="avatarFile" type="file" accept="image/*" onChange={handleFileChange} className="bg-background" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="coverImageFile" className="text-xs font-semibold text-foreground">
                  New Banner Image
                </label>
                <Input id="coverImageFile" type="file" accept="image/*" onChange={handleFileChange} className="bg-background" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={toggleEditor} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          )}

          <ChangePasswordForm />
        </div>

        {/* Right Column: User's Projects & Collaboration Activity */}
        <div className="min-w-0 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">My Projects</h2>
                <p className="text-xs text-muted-foreground">
                  Projects you own and have published to the DevSpotlight feed.
                </p>
              </div>
              <Button asChild size="sm" className="font-medium">
                <Link to="/create-project">
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Publish Project
                </Link>
              </Button>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-lg border border-border bg-card" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
                <p className="font-medium text-foreground text-sm">No projects published yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Share your semester projects or personal hacks with other student developers.
                </p>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/create-project">Publish your first project</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {projects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onChange={(patch) => patchProject(project._id, patch)}
                  />
                ))}
              </div>
            )}
          </section>

          <CollaborationActivity items={collabs} />
        </div>
      </div>
    </div>
  );
}
