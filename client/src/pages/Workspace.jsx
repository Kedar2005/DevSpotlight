import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  PlusCircle,
  Trash2,
  Send,
  ArrowLeft,
  GitBranch,
  ExternalLink,
  ShieldAlert,
  MessageSquare,
  ListTodo,
} from "lucide-react";
import {
  getWorkspace,
  createWorkspaceTask,
  updateWorkspaceTask,
  deleteWorkspaceTask,
  sendWorkspaceMessage,
  getWorkspaceMessages,
} from "../api/workspace.api";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../lib/errors";
import { normalizeUrl } from "../lib/utils";
import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select } from "../components/ui/select";
import { Alert } from "../components/ui/alert";

export function Workspace() {
  const { projectId } = useParams();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  // Task state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFilter, setTaskFilter] = useState("all");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    status: "todo",
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState("");

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatScrollRef = useRef(null);

  // Fetch initial workspace data
  useEffect(() => {
    let active = true;
    getWorkspace(projectId)
      .then((data) => {
        if (!active) return;
        setWorkspace(data);
        setMessages(data.messages || []);
        setError("");
        setIsAccessDenied(false);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 403) {
          setIsAccessDenied(true);
        } else {
          setError(getErrorMessage(err, "Couldn't load workspace."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Periodic poll for chat messages
  useEffect(() => {
    if (isAccessDenied || loading) return undefined;

    const interval = setInterval(async () => {
      try {
        const fresh = await getWorkspaceMessages(projectId);
        setMessages(fresh);
      } catch {
        // Silent poll error ignore
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId, isAccessDenied, loading]);

  // Create task handler
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setCreatingTask(true);
    setTaskError("");

    try {
      const created = await createWorkspaceTask(projectId, {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        assignedTo: newTask.assignedTo || null,
        status: newTask.status || "todo",
      });

      setWorkspace((prev) => {
        const nextTasks = [created, ...(prev.tasks || [])];
        return {
          ...prev,
          tasks: nextTasks,
          // Recalculate memberWork
          memberWork: prev.members.map((m) => {
            const memberTasks = nextTasks.filter(
              (t) => t.assignedTo && String(t.assignedTo._id) === String(m._id)
            );
            return {
              ...m,
              memberId: m._id,
              totalAssigned: memberTasks.length,
              todo: memberTasks.filter((t) => t.status === "todo").length,
              inProgress: memberTasks.filter((t) => t.status === "in_progress").length,
              completed: memberTasks.filter((t) => t.status === "completed").length,
            };
          }),
        };
      });

      setNewTask({ title: "", description: "", assignedTo: "", status: "todo" });
      setShowTaskForm(false);
    } catch (err) {
      setTaskError(getErrorMessage(err, "Failed to create task"));
    } finally {
      setCreatingTask(false);
    }
  };

  // Update task status or assignment
  const handleUpdateTask = async (taskId, updates) => {
    try {
      const updated = await updateWorkspaceTask(projectId, taskId, updates);
      setWorkspace((prev) => {
        const nextTasks = prev.tasks.map((t) => (t._id === taskId ? updated : t));
        return {
          ...prev,
          tasks: nextTasks,
          memberWork: prev.members.map((m) => {
            const memberTasks = nextTasks.filter(
              (t) => t.assignedTo && String(t.assignedTo._id) === String(m._id)
            );
            return {
              ...m,
              memberId: m._id,
              totalAssigned: memberTasks.length,
              todo: memberTasks.filter((t) => t.status === "todo").length,
              inProgress: memberTasks.filter((t) => t.status === "in_progress").length,
              completed: memberTasks.filter((t) => t.status === "completed").length,
            };
          }),
        };
      });
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  // Delete task handler
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteWorkspaceTask(projectId, taskId);
      setWorkspace((prev) => {
        const nextTasks = prev.tasks.filter((t) => t._id !== taskId);
        return {
          ...prev,
          tasks: nextTasks,
          memberWork: prev.members.map((m) => {
            const memberTasks = nextTasks.filter(
              (t) => t.assignedTo && String(t.assignedTo._id) === String(m._id)
            );
            return {
              ...m,
              memberId: m._id,
              totalAssigned: memberTasks.length,
              todo: memberTasks.filter((t) => t.status === "todo").length,
              inProgress: memberTasks.filter((t) => t.status === "in_progress").length,
              completed: memberTasks.filter((t) => t.status === "completed").length,
            };
          }),
        };
      });
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  // Send chat message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setSendingChat(true);
    try {
      const message = await sendWorkspaceMessage(projectId, chatInput.trim());
      setMessages((prev) => [...prev, message]);
      setChatInput("");
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSendingChat(false);
    }
  };

  // Access denied state (Requirement 6)
  if (isAccessDenied) {
    return (
      <div className="mx-auto max-w-xl p-8 my-12 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-8 w-8 stroke-[1.5]" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Workspace Access Restricted
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Only the project owner and accepted collaborators can access this collaboration workspace.
          If you have requested to join, please wait for the project owner to accept your request.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to={`/project/${projectId}`}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Project
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/requests">My Requests</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-6 sm:p-8 space-y-6 animate-pulse">
        <div className="h-6 w-36 rounded bg-muted" />
        <div className="h-10 w-2/3 rounded bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 rounded-lg bg-muted" />
          <div className="h-64 rounded-lg bg-muted" />
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="mx-auto max-w-3xl p-8 space-y-4">
        <Alert tone="error">{error || "Failed to load workspace"}</Alert>
        <Button asChild variant="outline" size="sm">
          <Link to={`/project/${projectId}`}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Project
          </Link>
        </Button>
      </div>
    );
  }

  const { project, owner, isOwner, members = [], tasks = [], memberWork = [] } = workspace;
  const filteredTasks =
    taskFilter === "all" ? tasks : tasks.filter((t) => t.status === taskFilter);

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2">
            <Link
              to={`/project/${project._id}`}
              className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Project Page
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
              Collaboration Workspace
            </span>
            {isOwner && (
              <span className="rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">
                You are Owner
              </span>
            )}
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-xs text-muted-foreground font-medium">{project.category}</span>
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {project.title}
          </h1>

          <p className="mt-1 text-xs text-muted-foreground max-w-2xl line-clamp-2">
            {project.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Owner:</span>
              <Link to={`/u/${owner?.userName}`} className="font-semibold text-foreground hover:underline">
                {owner?.fullName || owner?.userName}
              </Link>
              <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-medium">
                Lead
              </span>
            </div>

            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{members.length} {members.length === 1 ? "Team Member" : "Team Members"}</span>

            {project.githubLink && (
              <>
                <span className="text-muted-foreground">•</span>
                <a
                  href={normalizeUrl(project.githubLink)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-code text-[11px]"
                >
                  <GitBranch className="h-3 w-3" /> Source Code
                </a>
              </>
            )}

            {project.liveLink && (
              <>
                <span className="text-muted-foreground">•</span>
                <a
                  href={normalizeUrl(project.liveLink)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-[11px]"
                >
                  <ExternalLink className="h-3 w-3" /> Live Demo
                </a>
              </>
            )}
          </div>
        </div>

        {/* Quick Team Badge */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto rounded-lg border border-border bg-card p-3">
          <div className="flex -space-x-2 overflow-hidden">
            {members.slice(0, 4).map((m) => (
              <Avatar key={m._id} user={m} size="xs" className="ring-2 ring-background" />
            ))}
          </div>
          <div className="text-xs pl-1">
            <p className="font-semibold text-foreground">{members.length - 1} Active</p>
            <p className="text-[10px] text-muted-foreground">{members.length - 1 === 1 ? "Collaborator" : "Collaborators"}</p>
          </div>
        </div>
      </div>

      {/* Team Contribution Section (Requirement 5) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Team Contributions & Assigned Work</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {tasks.length} Total Project Tasks
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {memberWork.map((work) => (
            <div
              key={work.memberId}
              className="rounded-lg border border-border bg-card p-4 transition-all hover:border-border/80"
            >
              <div className="flex items-center justify-between gap-2">
                <Link
                  to={`/u/${work.userName}`}
                  className="flex items-center gap-2.5 min-w-0 hover:opacity-80"
                >
                  <Avatar user={work} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {work.fullName || work.userName}
                    </p>
                    <p className="truncate font-code text-[10px] text-muted-foreground">
                      @{work.userName}
                    </p>
                  </div>
                </Link>

                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    work.role === "Owner"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {work.role}
                </span>
              </div>

              {/* Task progress stats */}
              <div className="mt-4 space-y-1.5 border-t border-border/70 pt-3 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Assigned Tasks:</span>
                  <span className="font-semibold text-foreground">{work.totalAssigned}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] text-center font-code">
                  <div className="rounded bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 py-1">
                    <div className="font-bold">{work.todo}</div>
                    <div className="text-[9px] uppercase">To Do</div>
                  </div>
                  <div className="rounded bg-muted text-muted-foreground py-1">
                    <div className="font-bold">{work.inProgress}</div>
                    <div className="text-[9px] uppercase">Doing</div>
                  </div>
                  <div className="rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 py-1">
                    <div className="font-bold">{work.completed}</div>
                    <div className="text-[9px] uppercase">Done</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Workspace Split: Tasks (Left) + Chat (Right) */}
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* Left Column: Task Management (Requirement 3) */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Task Management</h2>
              <span className="rounded bg-muted px-2 py-0.5 font-code text-xs font-semibold text-muted-foreground">
                {tasks.length}
              </span>
            </div>

            <Button
              size="sm"
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="font-medium self-start sm:self-auto"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              {showTaskForm ? "Close Form" : "Create Task"}
            </Button>
          </div>

          {/* Create Task Form */}
          {showTaskForm && (
            <form
              onSubmit={handleCreateTask}
              className="rounded-lg border border-border bg-card p-4 space-y-4 transition-all"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                New Workspace Task
              </h3>

              {taskError ? <Alert tone="error">{taskError}</Alert> : null}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="taskTitle">
                  Task Title *
                </label>
                <Input
                  id="taskTitle"
                  required
                  placeholder="e.g. Implement authentication token refresh"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="bg-background text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="taskDesc">
                  Description
                </label>
                <Textarea
                  id="taskDesc"
                  rows={2}
                  placeholder="Detailed requirements, endpoints, or notes..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="bg-background text-xs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="assignedTo">
                    Assign To
                  </label>
                  <Select
                    id="assignedTo"
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="bg-background text-xs"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.fullName || m.userName} ({m.role})
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="taskStatus">
                    Initial Status
                  </label>
                  <Select
                    id="taskStatus"
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    className="bg-background text-xs"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setShowTaskForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="xs" disabled={creatingTask || !newTask.title.trim()}>
                  {creatingTask ? "Adding..." : "Add Task"}
                </Button>
              </div>
            </form>
          )}

          {/* Filter Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground mr-1 font-medium">Status:</span>
            {["all", "todo", "in_progress", "completed"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTaskFilter(st)}
                className={`rounded border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  taskFilter === st
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {st === "in_progress" ? "In Progress" : st} (
                {st === "all" ? tasks.length : tasks.filter((t) => t.status === st).length})
              </button>
            ))}
          </div>

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-xs text-muted-foreground">
              <ListTodo className="mx-auto h-8 w-8 stroke-1 text-muted-foreground/60 mb-2" />
              <p className="font-semibold text-foreground">No tasks found</p>
              <p className="mt-1">
                {taskFilter === "all"
                  ? "Get started by creating your first task for the collaboration team."
                  : `No tasks currently in "${taskFilter}" status.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task._id}
                  className="rounded-lg border border-border bg-card p-4 transition-all hover:border-border/80 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-foreground">{task.title}</h4>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            task.status === "completed"
                              ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                              : task.status === "in_progress"
                              ? "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300"
                              : "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task._id)}
                      title="Delete Task"
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Task Metadata & Quick status toggles */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Assigned:</span>
                      {task.assignedTo ? (
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Avatar user={task.assignedTo} size="xs" />
                          <span>{task.assignedTo.fullName || task.assignedTo.userName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Unassigned</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status quick select */}
                      <Select
                        value={task.status}
                        onChange={(e) => handleUpdateTask(task._id, { status: e.target.value })}
                        className="h-7 text-xs py-0 px-2 bg-background border-border"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </Select>

                      {/* Re-assign select */}
                      <Select
                        value={task.assignedTo?._id || ""}
                        onChange={(e) =>
                          handleUpdateTask(task._id, { assignedTo: e.target.value || null })
                        }
                        className="h-7 text-xs py-0 px-2 bg-background border-border max-w-[120px]"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.fullName?.split(" ")[0] || m.userName}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Team Chat (Requirement 4) */}
        <section className="flex flex-col h-[650px] rounded-lg border border-border bg-card">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-border p-3.5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Workspace Chat</h3>
            </div>
            <span className="font-code text-[11px] text-muted-foreground">
              {messages.length} msgs
            </span>
          </div>

          {/* Messages Stream */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-transparent"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs text-muted-foreground p-4">
                <MessageSquare className="h-8 w-8 stroke-1 text-muted-foreground/40 mb-2" />
                <p className="font-medium text-foreground">No messages yet</p>
                <p className="mt-1">
                  Start the discussion with your collaborators on tasks, pull requests, and ideas.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = String(msg.sender?._id) === String(user?._id);
                return (
                  <div
                    key={msg._id}
                    className={`flex items-start gap-2.5 text-xs ${
                      isMe ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <Avatar user={msg.sender} size="xs" className="mt-0.5 shrink-0" />
                    <div
                      className={`max-w-[80%] rounded-lg p-2.5 space-y-1 ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none border border-border/60"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={`font-semibold text-[11px] ${
                            isMe ? "text-primary-foreground" : "text-foreground"
                          }`}
                        >
                          {msg.sender?.fullName || msg.sender?.userName || "Member"}
                        </span>
                        <span
                          className={`text-[9px] font-code ${
                            isMe ? "text-primary-foreground/75" : "text-muted-foreground"
                          }`}
                        >
                          {msg.createdAt
                            ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })
                            : ""}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed break-words text-xs font-sans">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-border p-3 flex items-center gap-2 bg-muted/20"
          >
            <Input
              type="text"
              placeholder="Type message to team..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="bg-background text-xs h-9 flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={sendingChat || !chatInput.trim()}
              className="shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
