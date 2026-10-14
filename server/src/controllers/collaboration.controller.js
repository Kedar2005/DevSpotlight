import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Project } from "../models/project.model.js";
import { User } from "../models/user.model.js";
import { CollaborationRequest } from "../models/collaborationRequest.model.js";
import { COLLABORATION_STATUSES } from "../constants.js";

const USER_FIELDS = "userName fullName avatar bio skills githubLink";
const PROJECT_FIELDS = "title category images techStack userId";

// Always populate the people and the project so the frontend never has to look them up.
const populateRequest = (query) =>
  query
    .populate("sender", USER_FIELDS)
    .populate("receiver", USER_FIELDS)
    .populate("project", PROJECT_FIELDS);

const assertValidId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${label} id`);
  }
};

const isDuplicateKeyError = (error) => error?.code === 11000;

// POST /collaboration-requests            body: { projectId, message?, recipientId? }
// POST /collaboration-requests/project/:projectId   body: { message?, recipientId? }   (legacy path)
// The sender ALWAYS comes from the JWT (req.user); any sender id in the body is ignored.
const sendCollaborationRequest = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId ?? req.body?.projectId;
  assertValidId(projectId, "project");

  const rawMessage = req.body?.message;
  if (rawMessage !== undefined && typeof rawMessage !== "string") {
    throw new ApiError(400, "Message must be text");
  }
  const message = (rawMessage ?? "").trim();
  if (message.length > 500) {
    throw new ApiError(400, "Message must be 500 characters or fewer");
  }

  const project = await Project.findById(projectId).select("userId title");
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const senderId = req.user._id;
  const isOwner = String(project.userId) === String(senderId);

  let receiverId;

  if (isOwner) {
    // Project owner sending an invitation / request to a candidate teammate
    const targetRecipientId = req.body?.recipientId ?? req.body?.receiverId;
    if (!targetRecipientId) {
      throw new ApiError(
        400,
        "Recipient student ID is required when inviting a teammate to your project"
      );
    }
    assertValidId(targetRecipientId, "recipient");

    if (String(targetRecipientId) === String(senderId)) {
      throw new ApiError(400, "You cannot send a collaboration request to yourself");
    }

    const recipientUser = await User.findById(targetRecipientId).select("_id isBanned");
    if (!recipientUser || recipientUser.isBanned) {
      throw new ApiError(404, "Recipient user not found or unavailable");
    }

    receiverId = recipientUser._id;
  } else {
    // Student requesting to join a project owned by someone else
    receiverId = project.userId;
  }

  // Prevent duplicate requests: check both directions between this user and candidate on this project
  const existing = await CollaborationRequest.findOne({
    project: project._id,
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
    status: { $in: ["pending", "approved"] },
  }).select("status");

  if (existing) {
    throw new ApiError(
      409,
      existing.status === "pending"
        ? isOwner
          ? "A pending collaboration request already exists for this student on this project"
          : "You already have a pending request for this project"
        : isOwner
          ? "This student is already a collaborator on this project"
          : "You're already a collaborator on this project"
    );
  }

  let created;
  try {
    created = await CollaborationRequest.create({
      sender: senderId,
      receiver: receiverId,
      project: project._id,
      message,
    });
  } catch (error) {
    // Two simultaneous clicks: the partial unique index rejects the second one.
    if (isDuplicateKeyError(error)) {
      throw new ApiError(
        409,
        "A pending collaboration request already exists for this student on this project"
      );
    }
    throw error;
  }

  const populated = await populateRequest(CollaborationRequest.findById(created._id));

  return res
    .status(201)
    .json(new ApiResponse(201, populated, "Collaboration request sent successfully"));
});

const buildListFilter = (base, statusQuery) => {
  if (statusQuery === undefined || statusQuery === "" || statusQuery === "all") {
    return base;
  }
  if (!COLLABORATION_STATUSES.includes(statusQuery)) {
    throw new ApiError(
      400,
      `Status must be one of: ${COLLABORATION_STATUSES.join(", ")}`
    );
  }
  return { ...base, status: statusQuery };
};

// GET /collaboration-requests/received  - requests received by the logged-in user
const getReceivedRequests = asyncHandler(async (req, res) => {
  const filter = buildListFilter({ receiver: req.user._id }, req.query.status);
  const requests = await populateRequest(
    CollaborationRequest.find(filter).sort({ createdAt: -1 }).limit(200)
  ).lean();

  return res
    .status(200)
    .json(new ApiResponse(200, requests, "Received requests fetched successfully"));
});

// GET /collaboration-requests/sent  - requests the logged-in user has made
const getSentRequests = asyncHandler(async (req, res) => {
  const filter = buildListFilter({ sender: req.user._id }, req.query.status);
  const requests = await populateRequest(
    CollaborationRequest.find(filter).sort({ createdAt: -1 }).limit(200)
  ).lean();

  return res
    .status(200)
    .json(new ApiResponse(200, requests, "Sent requests fetched successfully"));
});

// GET /collaboration-requests/project/:projectId  - owner only
const getProjectRequests = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  assertValidId(projectId, "project");

  const project = await Project.findById(projectId).select("userId");
  if (!project) {
    throw new ApiError(404, "Project not found");
  }
  if (String(project.userId) !== String(req.user._id)) {
    throw new ApiError(403, "You are not allowed to view these requests");
  }

  const requests = await populateRequest(
    CollaborationRequest.find({ project: projectId }).sort({ createdAt: -1 })
  ).lean();

  return res
    .status(200)
    .json(new ApiResponse(200, requests, "Project requests fetched successfully"));
});

// Shared by approve and reject. Only the designated receiver may respond, and only
// while the request is pending. The status change is a single atomic update.
const respondToRequest = (nextStatus) =>
  asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    assertValidId(requestId, "request");

    const request = await CollaborationRequest.findById(requestId).select(
      "receiver status project"
    );
    if (!request) {
      throw new ApiError(404, "Collaboration request not found");
    }

    const isRecipient = String(request.receiver) === String(req.user._id);
    if (!isRecipient) {
      throw new ApiError(
        403,
        `Only the recipient can ${nextStatus === "approved" ? "approve" : "reject"} this request`
      );
    }

    const updated = await CollaborationRequest.findOneAndUpdate(
      { _id: request._id, status: "pending" },
      { $set: { status: nextStatus, respondedAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      throw new ApiError(409, `This request has already been ${request.status}`);
    }

    const populated = await populateRequest(CollaborationRequest.findById(updated._id));

    return res
      .status(200)
      .json(new ApiResponse(200, populated, `Request ${nextStatus}`));
  });

const approveCollaborationRequest = respondToRequest("approved");
const rejectCollaborationRequest = respondToRequest("rejected");

// DELETE /collaboration-requests/:requestId  - sender withdraws their own pending request
const cancelCollaborationRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  assertValidId(requestId, "request");

  const request = await CollaborationRequest.findById(requestId).select("sender status");
  if (!request) {
    throw new ApiError(404, "Collaboration request not found");
  }
  if (String(request.sender) !== String(req.user._id)) {
    throw new ApiError(403, "You can only withdraw your own requests");
  }
  if (request.status !== "pending") {
    throw new ApiError(409, `This request has already been ${request.status}`);
  }

  await request.deleteOne();

  return res.status(200).json(new ApiResponse(200, {}, "Request withdrawn"));
});

export {
  sendCollaborationRequest,
  getReceivedRequests,
  getSentRequests,
  getProjectRequests,
  approveCollaborationRequest,
  rejectCollaborationRequest,
  cancelCollaborationRequest,
};
