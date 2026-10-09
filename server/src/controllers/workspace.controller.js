import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Project } from "../models/project.model.js";
import { CollaborationRequest } from "../models/collaborationRequest.model.js";
import { WorkspaceTask, WorkspaceMessage } from "../models/workspace.model.js";

const USER_SELECT = "userName fullName avatar email";

/**
 * Access control check: Only the project owner and accepted collaborators
 * may view or interact with this workspace.
 */
export const assertWorkspaceMember = async (projectId, userId) => {
  if (!mongoose.isValidObjectId(projectId)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId).populate("userId", USER_SELECT);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const isOwner = String(project.userId._id) === String(userId);

  // If not owner, check if user is an approved collaborator
  if (!isOwner) {
    const approvedRequest = await CollaborationRequest.findOne({
      project: projectId,
      sender: userId,
      status: "approved",
    });

    if (!approvedRequest) {
      throw new ApiError(
        403,
        "Access denied. Only the project owner and accepted collaborators can access this workspace."
      );
    }
  }

  // Retrieve all approved collaborators
  const approvedCollabs = await CollaborationRequest.find({
    project: projectId,
    status: "approved",
  })
    .populate("sender", USER_SELECT)
    .lean();

  const members = [
    {
      _id: project.userId._id,
      userName: project.userId.userName,
      fullName: project.userId.fullName,
      avatar: project.userId.avatar,
      email: project.userId.email,
      role: "Owner",
    },
    ...approvedCollabs
      .filter((c) => c.sender)
      .map((c) => ({
        _id: c.sender._id,
        userName: c.sender.userName,
        fullName: c.sender.fullName,
        avatar: c.sender.avatar,
        email: c.sender.email,
        role: "Collaborator",
        acceptedAt: c.respondedAt || c.updatedAt,
      })),
  ];

  return { project, isOwner, members };
};

// GET /api/v1/workspace/:projectId
export const getWorkspaceDetails = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { project, isOwner, members } = await assertWorkspaceMember(projectId, req.user._id);

  const [tasks, messages] = await Promise.all([
    WorkspaceTask.find({ project: projectId })
      .populate("assignedTo", USER_SELECT)
      .populate("createdBy", USER_SELECT)
      .sort({ createdAt: -1 }),
    WorkspaceMessage.find({ project: projectId })
      .populate("sender", USER_SELECT)
      .sort({ createdAt: 1 })
      .limit(100),
  ]);

  // Calculate task contribution breakdown per member
  const memberWork = members.map((member) => {
    const memberTasks = tasks.filter(
      (task) => task.assignedTo && String(task.assignedTo._id) === String(member._id)
    );
    return {
      memberId: member._id,
      userName: member.userName,
      fullName: member.fullName,
      avatar: member.avatar,
      role: member.role,
      totalAssigned: memberTasks.length,
      todo: memberTasks.filter((t) => t.status === "todo").length,
      inProgress: memberTasks.filter((t) => t.status === "in_progress").length,
      completed: memberTasks.filter((t) => t.status === "completed").length,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        project: {
          _id: project._id,
          title: project.title,
          description: project.description,
          category: project.category,
          techStack: project.techStack,
          githubLink: project.githubLink,
          liveLink: project.liveLink,
          images: project.images,
        },
        owner: project.userId,
        isOwner,
        members,
        tasks,
        messages,
        memberWork,
      },
      "Workspace details fetched successfully"
    )
  );
});

// POST /api/v1/workspace/:projectId/tasks
export const createWorkspaceTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assignedTo, status } = req.body;

  await assertWorkspaceMember(projectId, req.user._id);

  if (!title || !title.trim()) {
    throw new ApiError(400, "Task title is required");
  }

  const task = await WorkspaceTask.create({
    project: projectId,
    title: title.trim(),
    description: (description || "").trim(),
    status: ["todo", "in_progress", "completed"].includes(status) ? status : "todo",
    assignedTo: mongoose.isValidObjectId(assignedTo) ? assignedTo : null,
    createdBy: req.user._id,
  });

  const populatedTask = await WorkspaceTask.findById(task._id)
    .populate("assignedTo", USER_SELECT)
    .populate("createdBy", USER_SELECT);

  return res
    .status(201)
    .json(new ApiResponse(201, populatedTask, "Task created successfully"));
});

// PATCH /api/v1/workspace/:projectId/tasks/:taskId
export const updateWorkspaceTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title, description, assignedTo, status } = req.body;

  await assertWorkspaceMember(projectId, req.user._id);

  if (!mongoose.isValidObjectId(taskId)) {
    throw new ApiError(400, "Invalid task id");
  }

  const task = await WorkspaceTask.findOne({ _id: taskId, project: projectId });
  if (!task) {
    throw new ApiError(404, "Task not found in this workspace");
  }

  if (title !== undefined) {
    if (!title.trim()) throw new ApiError(400, "Task title cannot be empty");
    task.title = title.trim();
  }

  if (description !== undefined) {
    task.description = description.trim();
  }

  if (status !== undefined) {
    if (!["todo", "in_progress", "completed"].includes(status)) {
      throw new ApiError(400, "Invalid status. Must be todo, in_progress, or completed");
    }
    task.status = status;
  }

  if (assignedTo !== undefined) {
    task.assignedTo = mongoose.isValidObjectId(assignedTo) ? assignedTo : null;
  }

  await task.save();

  const populatedTask = await WorkspaceTask.findById(task._id)
    .populate("assignedTo", USER_SELECT)
    .populate("createdBy", USER_SELECT);

  return res
    .status(200)
    .json(new ApiResponse(200, populatedTask, "Task updated successfully"));
});

// DELETE /api/v1/workspace/:projectId/tasks/:taskId
export const deleteWorkspaceTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  await assertWorkspaceMember(projectId, req.user._id);

  if (!mongoose.isValidObjectId(taskId)) {
    throw new ApiError(400, "Invalid task id");
  }

  const task = await WorkspaceTask.findOneAndDelete({ _id: taskId, project: projectId });
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res.status(200).json(new ApiResponse(200, {}, "Task deleted successfully"));
});

// GET /api/v1/workspace/:projectId/messages
export const getWorkspaceMessages = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  await assertWorkspaceMember(projectId, req.user._id);

  const messages = await WorkspaceMessage.find({ project: projectId })
    .populate("sender", USER_SELECT)
    .sort({ createdAt: 1 })
    .limit(100);

  return res
    .status(200)
    .json(new ApiResponse(200, messages, "Workspace messages fetched successfully"));
});

// POST /api/v1/workspace/:projectId/messages
export const sendWorkspaceMessage = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { content } = req.body;

  await assertWorkspaceMember(projectId, req.user._id);

  if (!content || !content.trim()) {
    throw new ApiError(400, "Message content cannot be empty");
  }

  const message = await WorkspaceMessage.create({
    project: projectId,
    sender: req.user._id,
    content: content.trim(),
  });

  const populatedMessage = await WorkspaceMessage.findById(message._id).populate(
    "sender",
    USER_SELECT
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedMessage, "Message sent successfully"));
});
