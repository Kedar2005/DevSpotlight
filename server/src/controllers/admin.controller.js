import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Project } from "../models/project.model.js";
import { College } from "../models/college.model.js";
import { Hackathon, HACKATHON_STATUSES } from "../models/hackathon.model.js";
import { HackathonRoom } from "../models/hackathonRoom.model.js";
import { HackathonRegistration } from "../models/hackathonRegistration.model.js";
import { HackathonSubmission } from "../models/hackathonSubmission.model.js";
import { getProjectCollaborators } from "../utils/projectMembers.js";
import { escapeRegex } from "../utils/validators.js";

const SAFE_USER_FIELDS =
  "_id userName fullName email role avatar bio skills college collegeName isSuspended suspendedReason suspendedAt isBanned createdAt";

/**
 * GET /api/v1/admin/stats
 * Real database statistics via MongoDB aggregation and counts.
 */
export const getAdminStats = asyncHandler(async (req, res) => {
  const RECENT = 5;
  const [
    totalUsers,
    totalStudents,
    totalProjects,
    totalColleges,
    totalHackathons,
    activeHackathons,
    pendingSubmissions,
    privateRooms,
    publicRooms,
    recentStudents,
    recentProjects,
    recentHackathons,
    recentSubmissions,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: { $ne: "admin" } }),
    Project.countDocuments({ isDeleted: { $ne: true } }),
    College.countDocuments(),
    Hackathon.countDocuments(),
    Hackathon.countDocuments({
      status: { $in: ["registration_open", "ongoing"] },
    }),
    HackathonSubmission.countDocuments({ status: "submitted" }),
    HackathonRoom.countDocuments({ visibility: "private" }),
    HackathonRoom.countDocuments({ visibility: "public" }),
    User.find({ role: { $ne: "admin" } })
      .select("userName fullName createdAt isSuspended isBanned")
      .sort({ createdAt: -1 })
      .limit(RECENT)
      .lean(),
    Project.find()
      .select("title createdAt isDeleted userId")
      .populate("userId", "userName fullName")
      .sort({ createdAt: -1 })
      .limit(RECENT)
      .lean(),
    Hackathon.find()
      .select("title status createdAt")
      .sort({ createdAt: -1 })
      .limit(RECENT)
      .lean(),
    HackathonSubmission.find()
      .select("status submittedAt project hackathon submittedBy")
      .populate("project", "title")
      .populate("hackathon", "title")
      .populate("submittedBy", "userName fullName")
      .sort({ submittedAt: -1 })
      .limit(RECENT)
      .lean(),
  ]);

  // One flat, date-sorted feed so the overview renders a single table.
  const recentActivity = [
    ...recentStudents.map((u) => ({
      type: "student",
      title: u.fullName || u.userName,
      detail: `@${u.userName} registered`,
      status: u.isSuspended || u.isBanned ? "suspended" : "active",
      date: u.createdAt,
      link: "/admin/students",
    })),
    ...recentProjects.map((p) => ({
      type: "project",
      title: p.title,
      detail: `by ${p.userId?.fullName || p.userId?.userName || "unknown"}`,
      status: p.isDeleted ? "moderated" : "active",
      date: p.createdAt,
      link: "/admin/projects",
    })),
    ...recentHackathons.map((h) => ({
      type: "hackathon",
      title: h.title,
      detail: "Hackathon created",
      status: h.status,
      date: h.createdAt,
      link: "/admin/hackathons",
    })),
    ...recentSubmissions.map((s) => ({
      type: "submission",
      title: s.project?.title || "Project",
      detail: `submitted to ${s.hackathon?.title || "hackathon"} by ${s.submittedBy?.fullName || s.submittedBy?.userName || "unknown"}`,
      status: s.status,
      date: s.submittedAt,
      link: "/admin/submissions",
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12);

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
        pendingSubmissions,
        privateRooms,
        publicRooms,
        recentActivity,
      },
      "Admin statistics fetched successfully"
    )
  );
});

// Users linked to a college either by reference or by the free-text name on their profile.
const collegeUserFilter = async (collegeId) => {
  if (!mongoose.isValidObjectId(collegeId)) {
    throw new ApiError(400, "Invalid college id");
  }
  const college = await College.findById(collegeId).select("name").lean();
  if (!college) {
    throw new ApiError(404, "College not found");
  }
  return {
    $or: [
      { college: college._id },
      { collegeName: { $regex: `^${escapeRegex(college.name)}$`, $options: "i" } },
    ],
  };
};

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
  const collegeId = req.query.college?.trim();

  // Each condition is its own $and clause so search, status and college never overwrite each other.
  const conditions = [];

  if (q) {
    const pattern = escapeRegex(q);
    conditions.push({
      $or: [
        { userName: { $regex: pattern, $options: "i" } },
        { fullName: { $regex: pattern, $options: "i" } },
        { email: { $regex: pattern, $options: "i" } },
        { collegeName: { $regex: pattern, $options: "i" } },
      ],
    });
  }

  if (role === "admin") {
    conditions.push({ role: "admin" });
  } else if (role === "student") {
    conditions.push({ role: { $ne: "admin" } });
  }

  if (status === "suspended") {
    conditions.push({ $or: [{ isSuspended: true }, { isBanned: true }] });
  } else if (status === "active") {
    conditions.push({ isSuspended: { $ne: true }, isBanned: { $ne: true } });
  }

  if (collegeId) {
    conditions.push(await collegeUserFilter(collegeId));
  }

  const filter = conditions.length ? { $and: conditions } : {};

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
  const collegeId = req.query.college?.trim();

  const conditions = [];

  if (q) {
    const pattern = { $regex: escapeRegex(q), $options: "i" };
    const owners = await User.find({
      $or: [{ userName: pattern }, { fullName: pattern }, { email: pattern }],
    }).distinct("_id");
    conditions.push({
      $or: [{ title: pattern }, { description: pattern }, { userId: { $in: owners } }],
    });
  }

  if (category && category !== "All") {
    conditions.push({ category });
  }

  if (status === "moderated") {
    conditions.push({ isDeleted: true });
  } else if (status === "active") {
    conditions.push({ isDeleted: { $ne: true } });
  }

  if (collegeId) {
    const collegeOwners = await User.find(await collegeUserFilter(collegeId)).distinct("_id");
    conditions.push({ userId: { $in: collegeOwners } });
  }

  const filter = conditions.length ? { $and: conditions } : {};

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
 * GET /api/v1/admin/projects/:projectId
 * Project with owner, approved collaborators (the team) and hackathon submissions.
 */
export const getAdminProjectDetails = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  if (!mongoose.isValidObjectId(projectId)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId)
    .populate("userId", SAFE_USER_FIELDS)
    .populate("moderatedBy", "userName fullName")
    .lean();
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const [teamMembers, submissions] = await Promise.all([
    getProjectCollaborators(project._id, project.userId?._id, "userName fullName email avatar collegeName"),
    HackathonSubmission.find({ project: project._id })
      .populate("hackathon", "title status")
      .select("hackathon status submittedAt")
      .lean(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...project,
        teamMembers,
        hackathonSubmissions: submissions,
      },
      "Project details fetched successfully"
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

  // Same matching rule as collegeUserFilter: by reference or by profile college name.
  const [byRef, byName] = await Promise.all([
    User.aggregate([
      { $match: { role: { $ne: "admin" }, college: { $in: colleges.map((c) => c._id) } } },
      { $group: { _id: "$college", count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { role: { $ne: "admin" }, college: null, collegeName: { $ne: "" } } },
      { $group: { _id: { $toLower: "$collegeName" }, count: { $sum: 1 } } },
    ]),
  ]);
  const refMap = new Map(byRef.map((r) => [String(r._id), r.count]));
  const nameMap = new Map(byName.map((r) => [r._id, r.count]));

  const enriched = colleges.map((c) => ({
    ...c,
    studentCount: (refMap.get(String(c._id)) || 0) + (nameMap.get(c.name.toLowerCase()) || 0),
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, enriched, "Colleges fetched successfully"));
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

const toDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/**
 * Validates a hackathon payload merged over the existing document (for edits),
 * so date ordering is always checked against the values that will be saved.
 */
const buildHackathonFields = (body, existing = {}) => {
  const pick = (key) => (body[key] !== undefined ? body[key] : existing[key]);

  const title = `${pick("title") ?? ""}`.trim();
  const description = `${pick("description") ?? ""}`.trim();
  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const startDate = toDate(pick("startDate"));
  const endDate = toDate(pick("endDate"));
  // Falls back to the event start, as the API always has, when no registration end is given.
  const registrationDeadline = toDate(
    pick("registrationDeadline") || body.registrationEnd || pick("startDate")
  );
  const registrationStartDate = toDate(pick("registrationStartDate"));

  if (!startDate || !endDate || !registrationDeadline || registrationStartDate === undefined) {
    throw new ApiError(400, "Valid event start, event end and registration end dates are required");
  }
  if (startDate >= endDate) {
    throw new ApiError(400, "Event start date must be before the event end date");
  }
  if (registrationDeadline > endDate) {
    throw new ApiError(400, "Registration end date cannot be after the event end date");
  }
  if (registrationStartDate && registrationStartDate >= registrationDeadline) {
    throw new ApiError(400, "Registration start date must be before the registration end date");
  }

  const status = pick("status") ?? "upcoming";
  const visibility = pick("visibility") ?? "public";
  const participationMode = pick("participationMode") ?? "individual";
  if (!HACKATHON_STATUSES.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${HACKATHON_STATUSES.join(", ")}`);
  }
  if (!["public", "private"].includes(visibility)) {
    throw new ApiError(400, "Visibility must be 'public' or 'private'");
  }
  if (!["individual", "team"].includes(participationMode)) {
    throw new ApiError(400, "Participation mode must be 'individual' or 'team'");
  }

  const maxParticipantsRaw = pick("maximumParticipants");
  const maximumParticipants = maxParticipantsRaw ? Number(maxParticipantsRaw) : null;
  if (maximumParticipants !== null && (!Number.isInteger(maximumParticipants) || maximumParticipants < 1)) {
    throw new ApiError(400, "Maximum participants must be a positive whole number");
  }
  const maximumTeamSize = Number(pick("maximumTeamSize") || 4);
  if (!Number.isInteger(maximumTeamSize) || maximumTeamSize < 1 || maximumTeamSize > 20) {
    throw new ApiError(400, "Maximum team size must be between 1 and 20");
  }

  const colleges = pick("participatingColleges");
  const participatingColleges = Array.isArray(colleges)
    ? colleges.map((c) => c?._id || c).filter((c) => mongoose.isValidObjectId(c))
    : [];

  return {
    title,
    description,
    theme: `${pick("theme") ?? ""}`.trim() || "Open Innovation",
    organizer: `${pick("organizer") ?? ""}`.trim() || "DevSpotlight",
    eligibility: `${pick("eligibility") ?? ""}`.trim(),
    rules: `${pick("rules") ?? ""}`.trim(),
    participatingColleges,
    startDate,
    endDate,
    registrationStartDate,
    registrationDeadline,
    status,
    visibility,
    participationMode,
    maximumParticipants,
    maximumTeamSize,
  };
};

// Room lifecycle follows the event status, except archived rooms which stay archived.
const ROOM_STATUS_FOR_HACKATHON = {
  draft: "upcoming",
  upcoming: "upcoming",
  registration_open: "open",
  ongoing: "open",
  completed: "completed",
  cancelled: "completed",
};

const syncRoomWithHackathon = (hackathon) =>
  HackathonRoom.updateOne(
    { hackathon: hackathon._id, status: { $ne: "archived" } },
    {
      $set: {
        status: ROOM_STATUS_FOR_HACKATHON[hackathon.status],
        title: `${hackathon.title} Room`,
        participatingColleges: hackathon.participatingColleges,
      },
    }
  );

export const createHackathon = asyncHandler(async (req, res) => {
  const fields = buildHackathonFields(req.body);

  const baseSlug = fields.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const hackathon = await Hackathon.create({ ...fields, slug, createdBy: req.user._id });

  // Every hackathon gets exactly one room; it starts private.
  const room = await HackathonRoom.create({
    hackathon: hackathon._id,
    title: `${hackathon.title} Room`,
    description: `Official collaboration and project submission space for ${hackathon.title}.`,
    participatingColleges: hackathon.participatingColleges,
    visibility: "private",
    status: ROOM_STATUS_FOR_HACKATHON[hackathon.status],
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
  if (!mongoose.isValidObjectId(hackathonId)) {
    throw new ApiError(400, "Invalid hackathon id");
  }
  const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon) {
    throw new ApiError(404, "Hackathon not found");
  }

  hackathon.set(buildHackathonFields(req.body, hackathon.toObject()));
  await hackathon.save();
  await syncRoomWithHackathon(hackathon);

  return res
    .status(200)
    .json(new ApiResponse(200, hackathon, "Hackathon updated successfully"));
});

export const updateHackathonStatus = asyncHandler(async (req, res) => {
  const { hackathonId } = req.params;
  const { status } = req.body;

  if (!HACKATHON_STATUSES.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${HACKATHON_STATUSES.join(", ")}`);
  }
  if (!mongoose.isValidObjectId(hackathonId)) {
    throw new ApiError(400, "Invalid hackathon id");
  }

  const hackathon = await Hackathon.findByIdAndUpdate(
    hackathonId,
    { $set: { status } },
    { new: true }
  );

  if (!hackathon) {
    throw new ApiError(404, "Hackathon not found");
  }

  await syncRoomWithHackathon(hackathon);

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

  if (room.status === "archived") {
    throw new ApiError(400, "Archived rooms cannot be published. Restore the room first.");
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
 * PATCH /api/v1/admin/rooms/:roomId/archive  body: { archived: boolean }
 * Archiving also unpublishes, so archived rooms never appear in the public showcase.
 */
export const setRoomArchived = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const archived = Boolean(req.body?.archived);
  if (!mongoose.isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room id");
  }

  const room = await HackathonRoom.findById(roomId).populate("hackathon", "status");
  if (!room) {
    throw new ApiError(404, "Hackathon room not found");
  }

  if (archived) {
    if (!["completed", "cancelled"].includes(room.hackathon?.status)) {
      throw new ApiError(400, "Only rooms of completed or cancelled hackathons can be archived");
    }
    room.status = "archived";
    room.visibility = "private";
    room.publishedAt = null;
    room.publishedBy = null;
  } else {
    room.status = "completed";
  }

  await room.save();

  return res
    .status(200)
    .json(new ApiResponse(200, room, archived ? "Room archived" : "Room restored"));
});

/**
 * GET /api/v1/admin/submissions?status=&hackathon=
 * All hackathon submissions for review.
 */
export const getAdminSubmissions = asyncHandler(async (req, res) => {
  const filter = {};
  const status = req.query.status?.trim();
  const hackathonId = req.query.hackathon?.trim();

  if (status && status !== "all") {
    if (!["submitted", "accepted", "rejected"].includes(status)) {
      throw new ApiError(400, "Invalid submission status filter");
    }
    filter.status = status;
  }
  if (hackathonId) {
    if (!mongoose.isValidObjectId(hackathonId)) {
      throw new ApiError(400, "Invalid hackathon id");
    }
    filter.hackathon = hackathonId;
  }

  const submissions = await HackathonSubmission.find(filter)
    .populate("project", "title description techStack githubLink liveLink isDeleted")
    .populate("hackathon", "title status")
    .populate("submittedBy", "userName fullName email avatar")
    .populate("teamMembers", "userName fullName")
    .sort({ submittedAt: -1 })
    .limit(200)
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, submissions, "Submissions fetched successfully"));
});

/**
 * PATCH /api/v1/admin/submissions/:submissionId/status  body: { status }
 * Only accepted submissions are shown on a published showcase.
 */
export const updateSubmissionStatus = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const { status } = req.body;

  if (!mongoose.isValidObjectId(submissionId)) {
    throw new ApiError(400, "Invalid submission id");
  }
  if (!["submitted", "accepted", "rejected"].includes(status)) {
    throw new ApiError(400, "Status must be 'submitted', 'accepted' or 'rejected'");
  }

  const submission = await HackathonSubmission.findByIdAndUpdate(
    submissionId,
    { $set: { status } },
    { new: true }
  );
  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, submission, `Submission marked as ${status}`));
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
