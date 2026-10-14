import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { Hackathon } from "../models/hackathon.model.js";
import { HackathonRoom } from "../models/hackathonRoom.model.js";
import { HackathonRegistration } from "../models/hackathonRegistration.model.js";
import { HackathonSubmission } from "../models/hackathonSubmission.model.js";
import { Project } from "../models/project.model.js";
import { College } from "../models/college.model.js";

const PUBLIC_USER_FIELDS = "userName fullName avatar githubLink";

/**
 * GET /api/v1/hackathons
 * List public hackathons available for discovery.
 */
export const getHackathons = asyncHandler(async (req, res) => {
  const status = req.query.status?.trim();
  const filter = { visibility: "public" };

  if (status && status !== "all") {
    filter.status = status;
  } else {
    // By default, exclude draft unless requested
    filter.status = { $ne: "draft" };
  }

  const hackathons = await Hackathon.find(filter)
    .populate("participatingColleges", "name code location")
    .sort({ startDate: 1 })
    .lean();

  const hackathonIds = hackathons.map((h) => h._id);

  const [registrationCounts, submissionCounts] = await Promise.all([
    HackathonRegistration.aggregate([
      { $match: { hackathon: { $in: hackathonIds }, status: "registered" } },
      { $group: { _id: "$hackathon", count: { $sum: 1 } } },
    ]),
    HackathonSubmission.aggregate([
      { $match: { hackathon: { $in: hackathonIds } } },
      { $group: { _id: "$hackathon", count: { $sum: 1 } } },
    ]),
  ]);

  const regMap = new Map(registrationCounts.map((r) => [String(r._id), r.count]));
  const subMap = new Map(submissionCounts.map((s) => [String(s._id), s.count]));

  const enriched = hackathons.map((h) => ({
    ...h,
    participantCount: regMap.get(String(h._id)) || 0,
    submissionCount: subMap.get(String(h._id)) || 0,
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, enriched, "Hackathons fetched successfully"));
});

/**
 * GET /api/v1/hackathons/:idOrSlug
 * Hackathon details with viewer's registration status.
 */
export const getHackathonDetails = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;

  const isObjectId = mongoose.isValidObjectId(idOrSlug);
  const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };

  const hackathon = await Hackathon.findOne(filter)
    .populate("participatingColleges", "name code location")
    .populate("createdBy", "userName fullName")
    .lean();

  if (!hackathon) {
    throw new ApiError(404, "Hackathon not found");
  }

  const room = await HackathonRoom.findOne({ hackathon: hackathon._id })
    .select("_id title visibility status publishedAt")
    .lean();

  let isRegistered = false;
  let userRegistration = null;

  if (req.user?._id) {
    userRegistration = await HackathonRegistration.findOne({
      hackathon: hackathon._id,
      user: req.user._id,
      status: "registered",
    }).lean();

    isRegistered = Boolean(userRegistration);
  }

  const [participantCount, submissionCount] = await Promise.all([
    HackathonRegistration.countDocuments({
      hackathon: hackathon._id,
      status: "registered",
    }),
    HackathonSubmission.countDocuments({ hackathon: hackathon._id }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...hackathon,
        room,
        isRegistered,
        userRegistration,
        participantCount,
        submissionCount,
      },
      "Hackathon details fetched successfully"
    )
  );
});

/**
 * POST /api/v1/hackathons/:hackathonId/register
 * Student registers for a hackathon.
 */
export const registerForHackathon = asyncHandler(async (req, res) => {
  const { hackathonId } = req.params;
  const { collegeId, teamName } = req.body;

  if (!mongoose.isValidObjectId(hackathonId)) {
    throw new ApiError(400, "Invalid hackathon id");
  }

  const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon) {
    throw new ApiError(404, "Hackathon not found");
  }

  if (hackathon.status === "cancelled") {
    throw new ApiError(400, "This hackathon has been cancelled");
  }

  if (hackathon.status === "completed") {
    throw new ApiError(400, "This hackathon has already ended");
  }

  // Check deadline
  if (new Date() > new Date(hackathon.registrationDeadline)) {
    throw new ApiError(400, "The registration deadline for this hackathon has passed");
  }

  // Check maximum participants if configured
  if (hackathon.maximumParticipants) {
    const currentCount = await HackathonRegistration.countDocuments({
      hackathon: hackathon._id,
      status: "registered",
    });

    if (currentCount >= hackathon.maximumParticipants) {
      throw new ApiError(400, "Registration is closed: Maximum participant limit reached");
    }
  }

  // Prevent duplicate registration
  const existing = await HackathonRegistration.findOne({
    hackathon: hackathon._id,
    user: req.user._id,
  });

  if (existing) {
    if (existing.status === "registered") {
      throw new ApiError(409, "You are already registered for this hackathon");
    }
    // Re-activate if previously withdrawn
    existing.status = "registered";
    existing.registeredAt = new Date();
    if (collegeId && mongoose.isValidObjectId(collegeId)) {
      existing.college = collegeId;
    }
    if (teamName?.trim()) {
      existing.teamName = teamName.trim();
    }
    await existing.save();

    // Ensure user is in room allowedParticipants
    await HackathonRoom.updateOne(
      { hackathon: hackathon._id },
      { $addToSet: { allowedParticipants: req.user._id } }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, existing, "Re-registered for hackathon successfully"));
  }

  const registration = await HackathonRegistration.create({
    hackathon: hackathon._id,
    user: req.user._id,
    college: collegeId && mongoose.isValidObjectId(collegeId) ? collegeId : req.user.college || null,
    teamName: teamName?.trim() || "",
    status: "registered",
    registeredAt: new Date(),
  });

  // Ensure user is added to the room allowedParticipants
  await HackathonRoom.updateOne(
    { hackathon: hackathon._id },
    { $addToSet: { allowedParticipants: req.user._id } }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, registration, "Registered for hackathon successfully"));
});

/**
 * Access Control Helper for Hackathon Rooms
 * - If public: accessible to all.
 * - If private: accessible ONLY to administrators or registered participants.
 */
const assertRoomAccess = async (room, user) => {
  if (room.visibility === "public") {
    return true;
  }

  if (!user) {
    throw new ApiError(401, "Sign in required to access this private hackathon room");
  }

  if (user.role === "admin") {
    return true;
  }

  // Check if student is an active registered participant
  const isRegistered = await HackathonRegistration.exists({
    hackathon: room.hackathon,
    user: user._id,
    status: "registered",
  });

  if (!isRegistered) {
    throw new ApiError(
      403,
      "Access denied. This hackathon room is private to registered participants."
    );
  }

  return true;
};

/**
 * GET /api/v1/hackathons/rooms/:roomId
 * Fetch room details with visibility enforcement.
 */
export const getHackathonRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  if (!mongoose.isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room id");
  }

  const room = await HackathonRoom.findById(roomId)
    .populate("hackathon")
    .populate("participatingColleges", "name code location")
    .lean();

  if (!room) {
    throw new ApiError(404, "Hackathon room not found");
  }

  // Enforce private room access
  await assertRoomAccess(room, req.user);

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Hackathon room fetched successfully"));
});

/**
 * GET /api/v1/hackathons/rooms/:roomId/submissions
 * Fetch submissions for a room with visibility enforcement.
 */
export const getRoomSubmissions = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  if (!mongoose.isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room id");
  }

  const room = await HackathonRoom.findById(roomId);
  if (!room) {
    throw new ApiError(404, "Hackathon room not found");
  }

  // Enforce private room access
  await assertRoomAccess(room, req.user);

  const submissions = await HackathonSubmission.find({ room: room._id })
    .populate({
      path: "project",
      select: "title description category techStack githubLink liveLink images userId",
    })
    .populate("submittedBy", PUBLIC_USER_FIELDS)
    .populate("teamMembers", PUBLIC_USER_FIELDS)
    .sort({ submittedAt: -1 })
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(200, submissions, "Room submissions fetched successfully")
    );
});

/**
 * POST /api/v1/hackathons/rooms/:roomId/submissions
 * Participant submits their project to the hackathon room.
 */
export const submitProjectToRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { projectId, notes, teamMembers = [] } = req.body;

  if (!mongoose.isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room id");
  }

  if (!mongoose.isValidObjectId(projectId)) {
    throw new ApiError(400, "Invalid project id");
  }

  const room = await HackathonRoom.findById(roomId).populate("hackathon");
  if (!room) {
    throw new ApiError(404, "Hackathon room not found");
  }

  // Check if room/hackathon is active
  const hackathon = room.hackathon;
  if (hackathon.status === "completed" || hackathon.status === "cancelled") {
    throw new ApiError(
      400,
      `Cannot submit: Hackathon is ${hackathon.status}. Submissions are closed.`
    );
  }

  // Check deadline (hackathon endDate)
  if (new Date() > new Date(hackathon.endDate)) {
    throw new ApiError(400, "The hackathon submission deadline has expired");
  }

  // Verify that the submitter is an approved registered participant
  const registration = await HackathonRegistration.findOne({
    hackathon: hackathon._id,
    user: req.user._id,
    status: "registered",
  });

  if (!registration && req.user.role !== "admin") {
    throw new ApiError(
      403,
      "You must be an approved registered participant to submit a project"
    );
  }

  // Verify that the project exists, belongs to the submitter, and is not deleted
  const project = await Project.findById(projectId);
  if (!project || project.isDeleted) {
    throw new ApiError(404, "Project not found or unavailable");
  }

  if (String(project.userId) !== String(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "You can only submit your own project");
  }

  // Prevent duplicate submission of the same project to this hackathon
  const existingSubmission = await HackathonSubmission.findOne({
    hackathon: hackathon._id,
    project: project._id,
  });

  if (existingSubmission) {
    throw new ApiError(
      409,
      "This project has already been submitted to this hackathon"
    );
  }

  const submission = await HackathonSubmission.create({
    hackathon: hackathon._id,
    room: room._id,
    project: project._id,
    submittedBy: req.user._id,
    teamMembers: Array.isArray(teamMembers) ? teamMembers.filter(mongoose.isValidObjectId) : [],
    notes: notes?.trim() || "",
    status: "submitted",
    submittedAt: new Date(),
  });

  const populated = await HackathonSubmission.findById(submission._id)
    .populate("project")
    .populate("submittedBy", PUBLIC_USER_FIELDS);

  return res.status(201).json(
    new ApiResponse(201, populated, "Project submitted to hackathon successfully")
  );
});

/**
 * GET /api/v1/hackathons/showcase
 * Public showcase of published hackathons and their winning / submitted projects.
 */
export const getPublicShowcase = asyncHandler(async (req, res) => {
  // Only published rooms are part of public showcase
  const publishedRooms = await HackathonRoom.find({ visibility: "public" })
    .populate("hackathon")
    .populate("participatingColleges", "name code")
    .sort({ publishedAt: -1 })
    .lean();

  const roomIds = publishedRooms.map((r) => r._id);

  const submissions = await HackathonSubmission.find({ room: { $in: roomIds } })
    .populate({
      path: "project",
      select: "title description category techStack githubLink liveLink images userId",
    })
    .populate("submittedBy", PUBLIC_USER_FIELDS)
    .sort({ submittedAt: -1 })
    .lean();

  const subByRoom = new Map();
  submissions.forEach((sub) => {
    const key = String(sub.room);
    if (!subByRoom.has(key)) subByRoom.set(key, []);
    subByRoom.get(key).push(sub);
  });

  const showcase = publishedRooms.map((r) => ({
    ...r,
    submissions: subByRoom.get(String(r._id)) || [],
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, showcase, "Public showcase fetched successfully"));
});

/**
 * GET /api/v1/colleges
 * Public active college list for student profiles and dropdowns.
 */
export const getPublicColleges = asyncHandler(async (req, res) => {
  const colleges = await College.find({ status: "active" })
    .select("_id name code location website")
    .sort({ name: 1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, colleges, "Colleges fetched successfully"));
});
