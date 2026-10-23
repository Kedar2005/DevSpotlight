import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  Users,
  Check,
  X,
  Clock,
  ExternalLink,
  PlusCircle,
  Pencil,
  RotateCw,
  FolderGit2,
  AlertCircle,
  Search,
  UserPlus,
  Send,
} from "lucide-react";
import { getMyProjects } from "../api/project.api";
import { getTeammateRecommendations, getAiTeammateRecommendations } from "../api/recommendation.api";
import { sendCollaborationRequest } from "../api/collaboration.api";
import { getErrorMessage } from "../lib/errors";
import { Avatar } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";
import { Card, CardContent } from "../components/ui/card";
import { Modal } from "../components/ui/modal";
import { Textarea } from "../components/ui/textarea";
import { LoadingState, EmptyState } from "../components/shared/PageState";

// Request button for a recommended student; pending/approved states block duplicates.
function RequestActions({ student, onRequest }) {
  return (
    <div className="flex items-center gap-2 ml-auto">
      {student.collaborationStatus === "pending" ? (
        <Button variant="secondary" size="sm" disabled className="text-xs font-medium cursor-not-allowed">
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          Request Pending
        </Button>
      ) : student.collaborationStatus === "approved" ? (
        <Button variant="secondary" size="sm" disabled className="text-xs font-medium cursor-not-allowed">
          <Check className="mr-1.5 h-3.5 w-3.5 text-success" />
          Collaborator
        </Button>
      ) : (
        <Button size="sm" onClick={() => onRequest(student)} className="text-xs font-medium">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          {student.collaborationStatus === "rejected" ? "Request Again" : "Request Collaboration"}
        </Button>
      )}

      <Button asChild variant="outline" size="sm">
        <Link to={`/u/${student.userName}`}>
          View Profile
          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

export function FindTeammates() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "";

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const [recommendationData, setRecommendationData] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(Boolean(initialProjectId));
  const [recsError, setRecsError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Collaboration request state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // AI recommendations: fetched only when the owner clicks Generate/Refresh.
  const [aiData, setAiData] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleGenerateAi = async () => {
    setLoadingAi(true);
    setAiError("");
    try {
      setAiData(await getAiTeammateRecommendations(selectedProjectId));
    } catch (err) {
      setAiError(getErrorMessage(err, "Couldn't generate AI recommendations."));
    } finally {
      setLoadingAi(false);
    }
  };

  // Keep a student's request status in sync on both the skill-based and AI lists.
  const markStudent = (studentId, changes) => {
    const update = (prev) =>
      prev?.recommendations
        ? { ...prev, recommendations: prev.recommendations.map((item) => (item._id === studentId ? { ...item, ...changes } : item)) }
        : prev;
    setRecommendationData(update);
    setAiData(update);
  };

  const handleOpenInviteModal = (student) => {
    setTargetStudent(student);
    setInviteMessage("");
    setInviteError("");
    setRequestModalOpen(true);
  };

  const handleCloseInviteModal = () => {
    if (sendingInvite) return;
    setRequestModalOpen(false);
    setTargetStudent(null);
    setInviteMessage("");
    setInviteError("");
  };

  const handleSendInvite = async (e) => {
    e?.preventDefault();
    if (!targetStudent || !selectedProjectId) return;

    setSendingInvite(true);
    setInviteError("");

    try {
      const savedRequest = await sendCollaborationRequest(
        selectedProjectId,
        inviteMessage,
        targetStudent._id
      );

      // Immediately update student's status on card without refreshing page
      markStudent(targetStudent._id, { collaborationStatus: "pending", collaborationRequest: savedRequest });

      const studentName = targetStudent.fullName || `@${targetStudent.userName}`;
      const projectTitle = selectedProject?.title || "your project";
      setActionSuccess(`Collaboration request sent to ${studentName} for "${projectTitle}".`);
      setActionError("");
      setRequestModalOpen(false);
      setTargetStudent(null);
      setInviteMessage("");
    } catch (err) {
      const msg = getErrorMessage(err, "Couldn't send the collaboration request.");
      setInviteError(msg);

      // If already pending or approved, update UI to reflect that status
      if (err.response?.status === 409) {
        const errorDetail = err.response?.data?.message || "";
        const isApproved = errorDetail.toLowerCase().includes("already a collaborator");
        markStudent(targetStudent._id, { collaborationStatus: isApproved ? "approved" : "pending" });
      }
    } finally {
      setSendingInvite(false);
    }
  };

  // Load user's projects on mount
  useEffect(() => {
    let active = true;
    getMyProjects()
      .then((myProjects) => {
        if (!active) return;
        setProjects(myProjects || []);
        if (myProjects && myProjects.length > 0) {
          // If query param matches one of the user's projects, keep it; otherwise pick first
          const exists = myProjects.some((p) => p._id === initialProjectId);
          const chosenId = exists ? initialProjectId : myProjects[0]._id;
          setSelectedProjectId(chosenId);
          setLoadingRecs(true);
        }
      })
      .catch((err) => {
        if (!active) return;
        setProjectsError(getErrorMessage(err, "Failed to load your projects."));
      })
      .finally(() => {
        if (active) setLoadingProjects(false);
      });

    return () => {
      active = false;
    };
  }, [initialProjectId]);

  // Sync selected project ID into URL query param
  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setSearchParams(projectId ? { projectId } : {});
    setLoadingRecs(Boolean(projectId));
    setRecsError("");
    setAiData(null);
    setAiError("");
    if (!projectId) {
      setRecommendationData(null);
    }
  };

  // Fetch recommendations whenever selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) return;

    let active = true;

    getTeammateRecommendations(selectedProjectId)
      .then((data) => {
        if (!active) return;
        setRecommendationData(data);
      })
      .catch((err) => {
        if (!active) return;
        setRecsError(
          getErrorMessage(err, "Failed to fetch teammate recommendations.")
        );
      })
      .finally(() => {
        if (active) setLoadingRecs(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p._id === selectedProjectId) || null;

  // Filter recommendations by candidate name/skills search query
  const filteredRecommendations = useMemo(() => {
    const list = recommendationData?.recommendations || [];
    if (!searchQuery.trim()) return list;
    const query = searchQuery.trim().toLowerCase();
    return list.filter((student) => {
      const name = (student.fullName || "").toLowerCase();
      const username = (student.userName || "").toLowerCase();
      const skillsMatch = (student.skills || []).some((s) =>
        s.toLowerCase().includes(query)
      );
      return name.includes(query) || username.includes(query) || skillsMatch;
    });
  }, [recommendationData?.recommendations, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Teammate recommendations: skill match + optional AI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Find Teammates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Discover student collaborators whose skills match your project's technical requirements.
          </p>
        </div>

        {projects.length > 0 && (
          <Button asChild variant="outline" size="sm">
            <Link to="/create-project">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              New Project
            </Link>
          </Button>
        )}
      </div>

      {projectsError && <Alert tone="error">{projectsError}</Alert>}

      {/* Loading Projects State */}
      {loadingProjects ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
          <RotateCw className="mr-2 h-4 w-4 animate-spin" />
          Loading your projects…
        </div>
      ) : projects.length === 0 ? (
        /* Empty State: User has no projects */
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FolderGit2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                No Projects Found
              </h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                You haven't created any projects yet. Create a project and specify required skills to discover matching teammates.
              </p>
            </div>
            <Button asChild>
              <Link to="/create-project">
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Create a Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Project Selection and Recommendations Section */
        <div className="space-y-6">
          {/* Project Selector Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <label
                htmlFor="project-select"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0"
              >
                Select Project:
              </label>
              <Select
                id="project-select"
                value={selectedProjectId}
                onChange={(e) => handleSelectProject(e.target.value)}
                className="w-full sm:w-72 bg-background"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title} ({p.category || "General"})
                  </option>
                ))}
              </Select>
            </div>

            {selectedProject && (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/project/${selectedProject._id}`}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    View Project
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/project/${selectedProject._id}/edit`}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit Skills
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Project Skills Summary Card */}
          {selectedProject && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Required Skills:
                  </span>
                  {recommendationData?.project?.requiredSkills?.length > 0 ? (
                    <span className="text-xs font-medium text-foreground">
                      ({recommendationData.project.requiredSkills.length} defined)
                    </span>
                  ) : null}
                </div>

                <Link
                  to={`/project/${selectedProject._id}/edit`}
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" />
                  Update required skills
                </Link>
              </div>

              {recommendationData?.project?.requiredSkills?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {recommendationData.project.requiredSkills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="default"
                      className="font-code text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      This project does not have any required skills defined yet. Add required skills so our matching algorithm can recommend student collaborators.
                    </span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="border-warning/30 text-warning hover:bg-warning/20 shrink-0">
                    <Link to={`/project/${selectedProject._id}/edit`}>
                      Add Required Skills
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* AI Recommendations (Gemini), generated on demand */}
          {selectedProject && (
            <Card className="border-border bg-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Recommendations
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Gemini reads the project and eligible students&apos; skills, bios and public projects, then explains who fits. Emails and messages are never sent.
                    </p>
                  </div>
                  <Button size="sm" onClick={handleGenerateAi} disabled={loadingAi} className="shrink-0">
                    <RotateCw className={`mr-1.5 h-3.5 w-3.5 ${loadingAi ? "animate-spin" : ""}`} />
                    {aiData ? "Refresh" : "Generate"}
                  </Button>
                </div>

                {aiError && <Alert tone="error">{aiError}</Alert>}

                {loadingAi ? (
                  <LoadingState label="Asking Gemini to analyse eligible students…" />
                ) : aiData?.source === "unavailable" ? (
                  <Alert tone="error">
                    {aiData.message} The skill-based matches below are not AI-generated and are still available.
                  </Alert>
                ) : aiData?.source === "none" ? (
                  <EmptyState icon={Users} title="No eligible students" description={aiData.message} />
                ) : aiData?.source === "gemini" && aiData.recommendations.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No strong AI matches"
                    description="Gemini found no relevant candidate among eligible students. Try adding more detail or skills to the project."
                  />
                ) : aiData?.source === "gemini" ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      {aiData.recommendations.length} suggested from {aiData.candidatesAnalysed} eligible students · model {aiData.model}
                      {aiData.cached ? " · cached result" : ""}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiData.recommendations.map((student) => (
                        <div key={student._id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <Link to={`/u/${student.userName}`} className="flex items-start gap-3 group">
                              <Avatar user={student} size="md" />
                              <div className="space-y-0.5">
                                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary leading-tight">
                                  {student.fullName || `@${student.userName}`}
                                </h3>
                                <p className="font-code text-xs text-muted-foreground">@{student.userName}</p>
                              </div>
                            </Link>
                            <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
                              <Badge variant="default" title="How relevant Gemini judged this student to the project. Not a probability.">
                                AI relevance {student.aiScore}/100
                              </Badge>
                              <span className="font-code text-muted-foreground">{student.matchPercentage}% skill match</span>
                            </div>
                          </div>

                          {student.reasons.length > 0 && (
                            <ul className="list-disc space-y-1 pl-4 text-xs text-foreground/80">
                              {student.reasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          )}

                          {student.potentialContribution && (
                            <p className="text-xs text-foreground/80">
                              <span className="font-semibold text-foreground">Could contribute: </span>
                              {student.potentialContribution}
                            </p>
                          )}

                          <div className="space-y-2 border-t border-border/60 pt-2">
                            <div>
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Matching required skills ({student.matchingSkills.length})
                              </p>
                              {student.matchingSkills.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {student.matchingSkills.map((skill) => (
                                    <Badge key={skill} variant="success" className="font-code text-[11px] py-0 px-1.5">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] italic text-muted-foreground">None of the listed required skills</p>
                              )}
                            </div>
                            {student.complementarySkills.length > 0 && (
                              <div>
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Complementary skills the team lacks
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {student.complementarySkills.map((skill) => (
                                    <Badge key={skill} variant="tech" className="text-[11px] py-0 px-1.5">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="mt-auto flex items-center border-t border-border pt-3">
                            <RequestActions student={student} onRequest={handleOpenInviteModal} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Click Generate to get AI suggestions. The skill-based matches below are calculated without AI.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {recsError && (
            <Alert tone="error">
              <div className="flex items-center justify-between w-full">
                <span>{recsError}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedProjectId((prev) => prev)}
                >
                  Retry
                </Button>
              </div>
            </Alert>
          )}

          {/* Loading Recommendations */}
          {loadingRecs ? (
            <div className="flex flex-col items-center justify-center p-16 text-sm text-muted-foreground space-y-2">
              <RotateCw className="h-6 w-6 animate-spin text-primary" />
              <p>Analyzing student profiles and matching skills…</p>
            </div>
          ) : recommendationData && recommendationData.hasRequiredSkills === false ? (
            /* Helpful Message when required skills are missing */
            <Card className="border-dashed border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center p-10 text-center space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Define Required Skills to Get Recommendations
                </h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Specify the technologies, languages, or frameworks your project needs (e.g. React, Python, Docker). We'll find student developers who have those skills in their profile.
                </p>
                <Button asChild size="sm">
                  <Link to={`/project/${selectedProjectId}/edit`}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit Project to Add Skills
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : recommendationData && recommendationData.recommendations ? (
            /* Recommendations Loaded */
            <div className="space-y-4">
              {actionSuccess && (
                <Alert tone="success" className="flex items-center justify-between">
                  <span>{actionSuccess}</span>
                  <button
                    type="button"
                    onClick={() => setActionSuccess("")}
                    className="text-xs font-semibold hover:underline cursor-pointer ml-3 shrink-0"
                  >
                    Dismiss
                  </button>
                </Alert>
              )}

              {actionError && (
                <Alert tone="error" className="flex items-center justify-between">
                  <span>{actionError}</span>
                  <button
                    type="button"
                    onClick={() => setActionError("")}
                    className="text-xs font-semibold hover:underline cursor-pointer ml-3 shrink-0"
                  >
                    Dismiss
                  </button>
                </Alert>
              )}

              {/* Filter and Count Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Found{" "}
                  <strong className="text-foreground">
                    {filteredRecommendations.length}
                  </strong>{" "}
                  potential student {filteredRecommendations.length === 1 ? "collaborator" : "collaborators"}
                </p>

                {recommendationData.recommendations.length > 0 && (
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filter by name or skill…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs bg-background"
                    />
                  </div>
                )}
              </div>

              {filteredRecommendations.length === 0 ? (
                /* No Candidates Match State */
                <Card className="border-border bg-card">
                  <CardContent className="flex flex-col items-center justify-center p-10 text-center space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {recommendationData.totalEligibleStudents === 0
                        ? "No Other Students Registered Yet"
                        : "No Matching Collaborators Found"}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md">
                      {searchQuery
                        ? "No students match your filter search. Try clearing the filter."
                        : recommendationData.totalEligibleStudents === 0
                        ? "No other student developer profiles currently exist in the database. When students register and add skills to their profiles, they will be matched here."
                        : "No students currently have matching skills for this project's requirements. Try broadening the required skills or check back as more students update their profile skills."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                /* Student Recommendation Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRecommendations.map((student) => {
                    const matchPercent = student.matchPercentage || 0;
                    const isHighMatch = matchPercent >= 75;
                    const isMedMatch = matchPercent >= 40 && matchPercent < 75;

                    return (
                      <Card
                        key={student._id}
                        className="flex flex-col justify-between border-border bg-card hover:border-border/80 transition-shadow"
                      >
                        <CardContent className="p-5 space-y-4">
                          {/* Student Header */}
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              to={`/u/${student.userName}`}
                              className="flex items-start gap-3 group"
                            >
                              <Avatar user={student} size="md" />
                              <div className="space-y-0.5">
                                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                                  {student.fullName || `@${student.userName}`}
                                </h3>
                                <p className="font-code text-xs text-muted-foreground">
                                  @{student.userName}
                                </p>
                              </div>
                            </Link>

                            {/* Match Percentage Badge */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-code border ${
                                  isHighMatch
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400"
                                    : isMedMatch
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400"
                                    : "bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                {matchPercent}% Match
                              </span>
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isHighMatch
                                      ? "bg-emerald-500"
                                      : isMedMatch
                                      ? "bg-amber-500"
                                      : "bg-muted-foreground"
                                  }`}
                                  style={{ width: `${matchPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Student Bio */}
                          {student.bio && (
                            <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                              {student.bio}
                            </p>
                          )}

                          {/* Skills Comparison Section */}
                          <div className="space-y-2.5 pt-1 border-t border-border/60">
                            {/* Matching Skills */}
                            <div>
                              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                <Check className="h-3 w-3 text-emerald-500" />
                                <span>
                                  Matching Skills ({student.matchingSkills?.length || 0})
                                </span>
                              </div>
                              {student.matchingSkills?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {student.matchingSkills.map((skill) => (
                                    <Badge
                                      key={skill}
                                      variant="success"
                                      className="font-code text-[11px] py-0 px-1.5"
                                    >
                                      ✓ {skill}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-muted-foreground italic">
                                  No matching required skills
                                </p>
                              )}
                            </div>

                            {/* Missing Skills */}
                            {student.missingSkills?.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                  <X className="h-3 w-3 text-muted-foreground" />
                                  <span>
                                    Missing Skills ({student.missingSkills.length})
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {student.missingSkills.map((skill) => (
                                    <Badge
                                      key={skill}
                                      variant="outline"
                                      className="font-code text-[11px] py-0 px-1.5 text-muted-foreground border-dashed"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* All Student Profile Skills */}
                            {student.skills?.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                  Profile Skills:
                                </p>
                                <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
                                  {student.skills.map((skill) => (
                                    <Badge
                                      key={skill}
                                      variant="tech"
                                      className="text-[10px] py-0 px-1.5"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card Footer Actions */}
                          <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
                            {/* Existing Collaboration Status */}
                            <div className="flex items-center gap-1.5">
                              {student.collaborationStatus === "pending" && (
                                <Badge variant="warning" className="gap-1 text-xs">
                                  <Clock className="h-3 w-3" />
                                  Request Pending
                                </Badge>
                              )}
                              {student.collaborationStatus === "approved" && (
                                <Badge variant="success" className="gap-1 text-xs">
                                  <Check className="h-3 w-3" />
                                  Active Collaborator
                                </Badge>
                              )}
                              {student.collaborationStatus === "rejected" && (
                                <Badge variant="danger" className="gap-1 text-xs">
                                  <X className="h-3 w-3" />
                                  Request Rejected
                                </Badge>
                              )}
                            </div>

                            {/* Buttons: Request Collaboration & View Profile */}
                            <RequestActions student={student} onRequest={handleOpenInviteModal} />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Collaboration Request Invitation Modal */}
      <Modal
        open={requestModalOpen}
        onClose={handleCloseInviteModal}
        title="Request Collaboration"
        description={
          targetStudent
            ? `Invite ${targetStudent.fullName || `@${targetStudent.userName}`} to collaborate on "${selectedProject?.title}".`
            : "Invite teammate to collaborate"
        }
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          {inviteError && <Alert tone="error">{inviteError}</Alert>}

          <div className="space-y-1.5">
            <label htmlFor="invite-message" className="text-sm font-medium">
              Invitation Note <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="invite-message"
              rows={4}
              maxLength={500}
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Hi, I noticed your skills match our project requirements and would love to collaborate with you on this project."
              className="resize-none"
            />
            <p className="text-right text-xs text-muted-foreground">{inviteMessage.length}/500</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseInviteModal}
              disabled={sendingInvite}
            >
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={sendingInvite}>
              {sendingInvite ? (
                <>
                  <RotateCw className="mr-1.5 h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" /> Send Request
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
