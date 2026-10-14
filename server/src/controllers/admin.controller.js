import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Project } from "../models/project.model.js";
import { College } from "../models/college.model.js";
import { Hackathon } from "../models/hackathon.model.js";
import { HackathonRoom } from "../models/hackathonRoom.model.js";
import { HackathonRegistration } from "../models/hackathonRegistration.model.js";
import { HackathonSubmission } from "../models/hackathonSubmission.model.js";
import { escapeRegex } from "../utils/validators.js";

const SAFE_USER_FIELDS =
  "_id userName fullName email role avatar bio skills college collegeName isSuspended suspendedReason suspendedAt isBanned createdAt";

/**
 * GET /api/v1/admin/stats
 * Real database statistics via MongoDB aggregation and counts.
 */
export const getAdminStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalStudents,
    totalProjects,
    totalColleges,
    totalHackathons,
    activeHackathons,
    privateRooms,
    publicRooms,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: { $ne: "admin" } }),
    Project.countDocuments({ isDeleted: { $ne: true } }),
    College.countDocuments({ status: "active" }),
    Hackathon.countDocuments(),
    Hackathon.countDocuments({
      status: { $in: ["registration_open", "ongoing"] },
    }),
    HackathonRoom.countDocuments({ visibility: "private" }),
    HackathonRoom.countDocuments({ visibility: "public" }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalUsers,
        totalStudents,
        totalProjects,
        totalColleges,
        totalHackathons,
        activeHackathons,
        privateRooms,
        publicRooms,
      },
      "Admin statistics fetched successfully"
    )
  );
});

/**
 * GET /api/v1/admin/users
 * Paginated user management with search and filters.
 */
export const getAdminUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page ?? "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit ?? "10", 10) || 10, 1),
    100
  );
  const skip = (page - 1) * limit;

  const q = req.query.q?.trim();
  const role = req.query.role?.trim();
  const status = req.query.status?.trim();

  const filter = {};

  if (q) {
    const pattern = escapeRegex(q);
    filter.$or = [
      { userName: { $regex: pattern, $options: "i" } },
      { fullName: { $regex: pattern, $options: "i" } },
      { email: { $regex: pattern, $options: "i" } },
      { collegeName: { $regex: pattern, $options: "i" } },
    ];
  }

  if (role === "admin") {
    filter.role = "admin";
  } else if (role === "student") {
    filter.role = { $ne: "admin" };
  }

  if (status === "suspended") {
    filter.$or = [{ isSuspended: true }, { isBanned: true }];
  } else if (status === "active") {
    filter.isSuspended = { $ne: true };
    filter.isBanned = { $ne: true };
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(SAFE_USER_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const sanitizedUsers = users.map((u) => ({
    ...u,
    role: u.role === "admin" ? "admin" : "student",
    isSuspended: Boolean(u.isSuspended || u.isBanned),
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users: sanitizedUsers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Users fetched successfully"
    )
  );
});

/**
 * PATCH /api/v1/admin/users/:userId/status
 * Suspend or reactivate a user account with safety guard for last admin.
 */
export const updateUserSuspension = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isSuspended, reason = "" } = req.body;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Guard: Never suspend the last active administrator
  if (isSuspended && user.role === "admin") {
    const activeAdminsCount = await User.countDocuments({
      role: "admin",
      isSuspended: { $ne: true },
      isBanned: { $ne: true },
    });

    if (activeAdminsCount <= 1) {
      throw new ApiError(
        400,
        "Cannot suspend the last active administrator on the platform"
      );
    }
  }

  user.isSuspended = Boolean(isSuspended);
  user.isBanned = Boolean(isSuspended);
  user.suspendedReason = isSuspended ? reason.trim() : "";
  user.suspendedAt = isSuspended ? new Date() : null;

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: user._id,
        userName: user.userName,
        fullName: user.fullName,
        email: user.email,
        role: user.role === "admin" ? "admin" : "student",
        isSuspended: user.isSuspended,
        suspendedReason: user.suspendedReason,
        suspendedAt: user.suspendedAt,
      },
      `User account ${isSuspended ? "suspended" : "reactivated"} successfully`
    )
  );
});

/**
 * GET /api/v1/admin/users/:userId/projects
 * View submitted projects by a user.
 */
export const getUserProjects = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const projects = await Project.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "User projects fetched successfully"));
});

/**
 * GET /api/v1/admin/projects
 * Paginated project moderation list.
 */
export const getAdminProjects = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page ?? "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit ?? "10", 10) || 10, 1),
    100
  );
  const skip = (page - 1) * limit;

  const q = req.query.q?.trim();
  const category = req.query.category?.trim();
  const status = req.query.status?.trim(); // "active", "moderated", "all"

  const filter = {};

  if (q) {
    const pattern = escapeRegex(q);
    filter.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { description: { $regex: pattern, $options: "i" } },
    ];
  }

  if (category && category !== "All") {
    filter.category = category;
  }

  if (status === "moderated") {
    filter.isDeleted = true;
  } else if (status === "active") {
    filter.isDeleted = { $ne: true };
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate("userId", "userName fullName avatar email")
      .populate("moderatedBy", "userName fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        projects,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Projects fetched successfully"
    )
  );
});

/**
 * PATCH /api/v1/admin/projects/:projectId/moderation
 * Soft-delete or restore a project with moderation reason.
 */
export const moderateProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { isDeleted, reason = "" } = req.body;

  if (!mongoose.isValidObjectId(projectId)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  project.isDeleted = Boolean(isDeleted);
  project.deletedAt = isDeleted ? new Date() : null;
  project.moderatedBy = isDeleted ? req.user._id : null;
  project.moderationReason = isDeleted ? reason.trim() : "";

  await project.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      project,
      `Project ${isDeleted ? "removed by moderation" : "restored"} successfully`
    )
  );
});

/**
 * College Management Controllers
 */
export const getAdminColleges = asyncHandler(async (req, res) => {
  const q = req.query.q?.trim();
  const filter = {};

  if (q) {
    const pattern = escapeRegex(q);
    filter.$or = [
      { name: { $regex: pattern, $options: "i" } },
      { code: { $regex: pattern, $options: "i" } },
      { location: { $regex: pattern, $options: "i" } },
    ];
  }

  const colleges = await College.find(filter).sort({ name: 1 }).lean();
  return res
    .status(200)
    .json(new ApiResponse(200, colleges, "Colleges fetched successfully"));
});

export const createCollege = asyncHandler(async (req, res) => {
  const { name, code, location, description, website } = req.body;

  if (!name?.trim() || !code?.trim()) {
    throw new ApiError(400, "College name and code are required");
  }

  const normalizedCode = code.trim().toUpperCase();
  const existing = await College.findOne({
    $or: [{ code: normalizedCode }, { name: name.trim() }],
  });

  if (existing) {
    throw new ApiError(
      409,
      "A college with this name or code already exists"
    );
  }

  const college = await College.create({
    name: name.trim(),
    code: normalizedCode,
    location: location?.trim() || "",
    description: description?.trim() || "",
    website: website?.trim() || "",
    createdBy: req.user._id,
    status: "active",
  });

  return res
    .status(201)
    .json(new ApiResponse(201, college, "College created successfully"));
});

export const updateCollege = asyncHandler(async (req, res) => {
  const { collegeId } = req.params;
  const { name, code, location, description, website, status } = req.body;

  if (!mongoose.isValidObjectId(collegeId)) {
    throw new ApiError(400, "Invalid college id");
  }

  const college = await College.findById(collegeId);
  if (!college) {
    throw new ApiError(404, "College not found");
  }

  if (name?.trim()) college.name = name.trim();
  if (code?.trim()) college.code = code.trim().toUpperCase();
  if (location !== undefined) college.location = location.trim();
  if (description !== undefined) college.description = description.trim();
  if (website !== undefined) college.website = website.trim();
  if (status && ["active", "inactive"].includes(status)) college.status = status;

  await college.save();

  return res
    .status(200)
    .json(new ApiResponse(200, college, "College updated successfully"));
});

export const updateCollegeStatus = asyncHandler(async (req, res) => {
  const { collegeId } = req.params;
  const { status } = req.body;

  if (!["active", "inactive"].includes(status)) {
    throw new ApiError(400, "Status must be 'active' or 'inactive'");
  }

  const college = await College.findByIdAndUpdate(
    collegeId,
    { $set: { status } },
    { new: true }
  );

  if (!college) {
    throw new ApiError(404, "College not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, college, `College marked as ${status}`));
});

/**
 * Hackathon Admin Controllers
 */
export const getAdminHackathons = asyncHandler(async (req, res) => {
  const hackathons = await Hackathon.find()
    .populate("participatingColleges", "name code location")
    .sort({ createdAt: -1 })
    .lean();

  const hackathonIds = hackathons.map((h) => h._id);

  const [registrationCounts, submissionCounts, rooms] = await Promise.all([
    HackathonRegistration.aggregate([
      { $match: { hackathon: { $in: hackathonIds }, status: "registered" } },
      { $group: { _id: "$hackathon", count: { $sum: 1 } } },
    ]),
    HackathonSubmission.aggregate([
      { $match: { hackathon: { $in: hackathonIds } } },
      { $group: { _id: "$hackathon", count: { $sum: 1 } } },
    ]),
    HackathonRoom.find({ hackathon: { $in: hackathonIds } }).lean(),
  ]);

  const regMap = new Map(
    registrationCounts.map((r) => [String(r._id), r.count])
  );
  const subMap = new Map(submissionCounts.map((s) => [String(s._id), s.count]));
  const roomMap = new Map(rooms.map((rm) => [String(rm.hackathon), rm]));

  const enriched = hackathons.map((h) => ({
    ...h,
    participantCount: regMap.get(String(h._id)) || 0,
    submissionCount: subMap.get(String(h._id)) || 0,
    room: roomMap.get(String(h._id)) || null,
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, enriched, "Hackathons fetched successfully"));
});

export const createHackathon = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    theme,
    organizer,
    participatingColleges,
    startDate,
    endDate,
    registrationDeadline,
    status = "upcoming",
    visibility = "public",
    participationMode = "individual",
    maximumParticipants,
    maximumTeamSize,
  } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  const deadlineValue = registrationDeadline || req.body.registrationEnd || startDate;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const deadline = new Date(deadlineValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(deadline.getTime())) {
    throw new ApiError(400, "Valid start, end, and registration deadline dates are required");
  }

  if (start >= end) {
    throw new ApiError(400, "Start date must be before end date");
  }

  if (deadline > end) {
    throw new ApiError(400, "Registration deadline cannot be after hackathon end date");
  }

  // Create unique slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const hackathon = await Hackathon.create({
    title: title.trim(),
    slug,
    description: description.trim(),
    theme: theme?.trim() || "Open Innovation",
    organizer: organizer?.trim() || "DevSpotlight",
    participatingColleges: Array.isArray(participatingColleges)
      ? participatingColleges
      : [],
    startDate: start,
    endDate: end,
    registrationDeadline: deadline,
    status,
    visibility,
    participationMode,
    maximumParticipants: maximumParticipants ? Number(maximumParticipants) : null,
    maximumTeamSize: maximumTeamSize ? Number(maximumTeamSize) : 4,
    createdBy: req.user._id,
  });

  // Automatically provision the single dedicated HackathonRoom (1-to-1 relationship)
  const room = await HackathonRoom.create({
    hackathon: hackathon._id,
    title: `${hackathon.title} Room`,
    description: `Official collaboration and project submission space for ${hackathon.title}.`,
    participatingColleges: hackathon.participatingColleges,
    visibility: "private", // Always private during hackathon
    status: "open",
    createdBy: req.user._id,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      { hackathon, room },
      "Hackathon and dedicated room created successfully"
    )
  );
});

export const updateHackathon = asyncHandler(async (req, res) => {
  const { hackathonId } = req.params;
  const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon) {
    throw new ApiError(404, "Hackathon not found");
  }

  const {
    title,
    description,
    theme,
    organizer,
    participatingColleges,
    startDate,
    endDate,
    registrationDeadline,
    status,
    visibility,
    participationMode,
    maximumParticipants,
    maximumTeamSize,
  } = req.body;

  if (title?.trim()) hackathon.title = title.trim();
  if (description?.trim()) hackathon.description = description.trim();
  if (theme !== undefined) hackathon.theme = theme.trim();
  if (organizer !== undefined) hackathon.organizer = organizer.trim();
  if (Array.isArray(participatingColleges)) {
    hackathon.participatingColleges = participatingColleges;
    // Keep room colleges in sync
    await HackathonRoom.updateOne(
      { hackathon: hackathon._id },
      { $set: { participatingColleges } }
    );
  }
  if (startDate) hackathon.startDate = new Date(startDate);
  if (endDate) hackathon.endDate = new Date(endDate);
  if (registrationDeadline) hackathon.registrationDeadline = new Date(registrationDeadline);
  if (status) hackathon.status = status;
  if (visibility) hackathon.visibility = visibility;
  if (participationMode) hackathon.participationMode = participationMode;
  if (maximumParticipants !== undefined) {
    hackathon.maximumParticipants = maximumParticipants ? Number(maximumParticipants) : null;
  }
  if (maximumTeamSize !== undefined) {
    hackathon.maximumTeamSize = Number(maximumTeamSize) || 4;
  }

  await hackathon.save();

  return res
    .status(200)
    .json(new ApiResponse(200, hackathon, "Hackathon updated successfully"));
});

export const updateHackathonStatus = asyncHandler(async (req, res) => {
  const { hackathonId } = req.params;
  const { status } = req.body;

  const validStatuses = [
    "draft",
    "upcoming",
    "registration_open",
    "ongoing",
    "completed",
    "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${validStatuses.join(", ")}`);
  }

  const hackathon = await Hackathon.findByIdAndUpdate(
    hackathonId,
    { $set: { status } },
    { new: true }
  );

  if (!hackathon) {
    throw new ApiError(404, "Hackathon not found");
  }

  // If hackathon is marked completed, update room status
  if (status === "completed") {
    await HackathonRoom.updateOne(
      { hackathon: hackathon._id },
      { $set: { status: "completed" } }
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, hackathon, `Hackathon status changed to ${status}`));
});

export const getHackathonParticipants = asyncHandler(async (req, res) => {
  const { hackathonId } = req.params;
  if (!mongoose.isValidObjectId(hackathonId)) {
    throw new ApiError(400, "Invalid hackathon id");
  }

  const registrations = await HackathonRegistration.find({
    hackathon: hackathonId,
  })
    .populate("user", SAFE_USER_FIELDS)
    .populate("college", "name code location")
    .sort({ registeredAt: -1 })
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(200, registrations, "Participants fetched successfully")
    );
});

export const getHackathonSubmissions = asyncHandler(async (req, res) => {
  const { hackathonId } = req.params;
  if (!mongoose.isValidObjectId(hackathonId)) {
    throw new ApiError(400, "Invalid hackathon id");
  }

  const submissions = await HackathonSubmission.find({ hackathon: hackathonId })
    .populate("project")
    .populate("submittedBy", SAFE_USER_FIELDS)
    .populate("teamMembers", SAFE_USER_FIELDS)
    .sort({ submittedAt: -1 })
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(200, submissions, "Submissions fetched successfully")
    );
});

/**
 * Hackathon Room Management & Publication
 */
export const getAdminRooms = asyncHandler(async (req, res) => {
  const rooms = await HackathonRoom.find()
    .populate("hackathon")
    .populate("participatingColleges", "name code")
    .populate("publishedBy", "userName fullName email")
    .sort({ createdAt: -1 })
    .lean();

  const roomIds = rooms.map((r) => r._id);
  const submissionCounts = await HackathonSubmission.aggregate([
    { $match: { room: { $in: roomIds } } },
    { $group: { _id: "$room", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(submissionCounts.map((s) => [String(s._id), s.count]));

  const enriched = rooms.map((r) => ({
    ...r,
    submissionCount: countMap.get(String(r._id)) || 0,
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, enriched, "Hackathon rooms fetched successfully"));
});

export const publishRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  if (!mongoose.isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room id");
  }

  const room = await HackathonRoom.findById(roomId).populate("hackathon");
  if (!room) {
    throw new ApiError(404, "Hackathon room not found");
  }

  // Publication Requirement: The associated hackathon must be completed before publication!
  if (room.hackathon?.status !== "completed") {
    throw new ApiError(
      400,
      `Cannot publish room: The associated hackathon "${room.hackathon?.title}" is "${room.hackathon?.status}". Hackathons must be completed before their rooms can be published.`
    );
  }

  room.visibility = "public";
  room.publishedAt = new Date();
  room.publishedBy = req.user._id;

  await room.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      room,
      "Hackathon room has been published to the public showcase successfully"
    )
  );
});

export const unpublishRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  if (!mongoose.isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room id");
  }

  const room = await HackathonRoom.findById(roomId);
  if (!room) {
    throw new ApiError(404, "Hackathon room not found");
  }

  room.visibility = "private";
  room.publishedAt = null;
  room.publishedBy = null;

  await room.save();

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Hackathon room made private successfully"));
});

/**
 * GET /api/v1/admin/reports
 * Summary metrics and recent security / moderation activity.
 */
export const getAdminReports = asyncHandler(async (req, res) => {
  const [
    moderatedProjects,
    suspendedUsers,
    recentRegistrations,
    recentHackathons,
  ] = await Promise.all([
    Project.find({ isDeleted: true })
      .select("title category moderationReason deletedAt")
      .populate("userId", "userName fullName")
      .populate("moderatedBy", "userName fullName")
      .sort({ deletedAt: -1 })
      .limit(20)
      .lean(),
    User.find({ $or: [{ isSuspended: true }, { isBanned: true }] })
      .select("userName fullName email suspendedReason suspendedAt createdAt")
      .sort({ suspendedAt: -1 })
      .limit(20)
      .lean(),
    HackathonRegistration.find()
      .populate("user", "userName fullName email")
      .populate("hackathon", "title slug")
      .sort({ registeredAt: -1 })
      .limit(20)
      .lean(),
    Hackathon.find()
      .select("title status visibility startDate endDate")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        moderatedProjects,
        suspendedUsers,
        recentRegistrations,
        recentHackathons,
      },
      "Platform reports fetched successfully"
    )
  );
});
