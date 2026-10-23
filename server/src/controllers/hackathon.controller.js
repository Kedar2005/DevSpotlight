import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { Hackathon, isRegistrationOpen } from "../models/hackathon.model.js";
import { HackathonRoom } from "../models/hackathonRoom.model.js";
import { HackathonRegistration } from "../models/hackathonRegistration.model.js";
import { HackathonSubmission } from "../models/hackathonSubmission.model.js";
import { Project } from "../models/project.model.js";
import { College } from "../models/college.model.js";

const PUBLIC_USER_FIELDS = "userName fullName avatar githubLink";
const PUBLIC_HACKATHON_FIELDS =
  "title slug description theme organizer participatingColleges startDate endDate registrationStartDate registrationDeadline eligibility rules status visibility participationMode maximumParticipants maximumTeamSize bannerImage";
const PUBLIC_PROJECT_FIELDS = "title description category techStack githubLink liveLink images isDeleted";

const isAdmin = (user) => user?.role === "admin";

/**
 * GET /api/v1/hackathons
 * List public hackathons available for discovery.
 */
export const getHackathons = asyncHandler(async (req, res) => {
  const status = req.query.status?.trim();
  const filter = { visibility: "public" };

  // Drafts are never listed publicly.
  if (status && status !== "all" && status !== "draft") {
    filter.status = status;
  } else {
    filter.status = { $ne: "draft" };
  }

  const hackathons = await Hackathon.find(filter)
    .select(PUBLIC_HACKATHON_FIELDS)
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
    registrationOpen: isRegistrationOpen(h),
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, enriched, "Hackathons fetched successfully"));
});

/**
 * GET /api/v1/hackathons/mine
 * The signed-in user's registrations with event dates, room and submission status.
 * Room links follow the existing rule: an active registration grants room access.
 */
export const getMyHackathons = asyncHandler(async (req, res) => {
  const registrations = await HackathonRegistration.find({ user: req.user._id })
    .select("hackathon teamName status registeredAt college")
    .populate("hackathon", PUBLIC_HACKATHON_FIELDS)
    .populate("college", "name")
    .sort({ registeredAt: -1 })
    .lean();

  const live = registrations.filter((r) => r.hackathon);
  const hackathonIds = live.map((r) => r.hackathon._id);
  const [rooms, submissions] = await Promise.all([
    HackathonRoom.find({ hackathon: { $in: hackathonIds } }).select("_id hackathon status visibility").lean(),
    HackathonSubmission.find({
      hackathon: { $in: hackathonIds },
      $or: [{ submittedBy: req.user._id }, { teamMembers: req.user._id }],
    })
      .select("hackathon status")
      .lean(),
  ]);
  const roomByHackathon = new Map(rooms.map((r) => [String(r.hackathon), r]));

  const result = live.map((r) => {
    const room = roomByHackathon.get(String(r.hackathon._id));
    return {
      _id: r._id,
      status: r.status,
      teamName: r.teamName,
      college: r.college?.name || "",
      registeredAt: r.registeredAt,
      hackathon: { ...r.hackathon, registrationOpen: isRegistrationOpen(r.hackathon) },
      // Same rule as getRoomAccess: registered participants may open the room.
      roomId: r.status === "registered" && room ? room._id : null,
      roomStatus: room?.status || null,
      submissions: submissions
        .filter((s) => String(s.hackathon) === String(r.hackathon._id))
        .map((s) => s.status),
    };
  });

  return res.status(200).json(new ApiResponse(200, result, "Your hackathons fetched successfully"));
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
    .select(PUBLIC_HACKATHON_FIELDS)
    .populate("participatingColleges", "name code location")
    .lean();

  // Drafts and private hackathons are invisible to everyone except admins.
  if (
    !hackathon ||
    (!isAdmin(req.user) && (hackathon.status === "draft" || hackathon.visibility !== "public"))
  ) {
    throw new ApiError(404, "Hackathon not found");
  }

  const room = await HackathonRoom.findOne({ hackathon: hackathon._id })
    .select("_id visibility status publishedAt")
    .lean();

  let userRegistration = null;
  if (req.user?._id) {
    userRegistration = await HackathonRegistration.findOne({
      hackathon: hackathon._id,
      user: req.user._id,
      status: "registered",
    })
      .select("teamName college registeredAt status")
      .lean();
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
        isRegistered: Boolean(userRegistration),
        userRegistration,
        participantCount,
        submissionCount,
        registrationOpen: isRegistrationOpen(hackathon),
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
  // The registrant is always the signed-in user; any user id in the body is ignored.
  const { collegeId, teamName, acceptRules } = req.body;

  if (!mongoose.isValidObjectId(hackathonId)) {
    throw new ApiError(400, "Invalid hackathon id");
  }

  // Admins already see every room; a participant record would mix the two roles.
  if (isAdmin(req.user)) {
    throw new ApiError(403, "Administrators manage hackathons and cannot register as participants");
  }

  if (acceptRules !== true) {
    throw new ApiError(400, "You must confirm the eligibility requirements and rules");
  }

  if (teamName !== undefined && (typeof teamName !== "string" || teamName.trim().length > 60)) {
    throw new ApiError(400, "Team name must be text of at most 60 characters");
  }

  const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon || hackathon.status === "draft" || hackathon.visibility !== "public") {
    throw new ApiError(404, "Hackathon not found");
  }

  if (hackathon.status === "cancelled") {
    throw new ApiError(400, "This hackathon has been cancelled");
  }
  if (hackathon.status === "completed") {
    throw new ApiError(400, "This hackathon has already ended");
  }

  const now = new Date();
  if (hackathon.registrationStartDate && now < hackathon.registrationStartDate) {
    throw new ApiError(400, "Registration for this hackathon has not opened yet");
  }
  if (now > new Date(hackathon.registrationDeadline)) {
    throw new ApiError(400, "The registration deadline for this hackathon has passed");
  }

  if (hackathon.participationMode === "team" && !teamName?.trim()) {
    throw new ApiError(400, "A team name is required for this team hackathon");
  }

  let college = req.user.college || null;
  if (collegeId) {
    if (!mongoose.isValidObjectId(collegeId)) {
      throw new ApiError(400, "Invalid college id");
    }
    const exists = await College.exists({ _id: collegeId, status: "active" });
    if (!exists) {
      throw new ApiError(400, "Selected college is not available");
    }
    college = collegeId;
  }

  if (hackathon.maximumParticipants) {
    const currentCount = await HackathonRegistration.countDocuments({
      hackathon: hackathon._id,
      status: "registered",
    });

    if (currentCount >= hackathon.maximumParticipants) {
      throw new ApiError(400, "Registration is closed: Maximum participant limit reached");
    }
  }

  const existing = await HackathonRegistration.findOne({
    hackathon: hackathon._id,
    user: req.user._id,
  });

  if (existing?.status === "registered") {
    throw new ApiError(409, "You are already registered for this hackathon");
  }

  let registration;
  if (existing) {
    // Re-activate a withdrawn registration
    existing.status = "registered";
    existing.registeredAt = now;
    existing.college = college;
    existing.teamName = teamName?.trim() || existing.teamName;
    registration = await existing.save();
  } else {
    try {
      registration = await HackathonRegistration.create({
        hackathon: hackathon._id,
        user: req.user._id,
        college,
        teamName: teamName?.trim() || "",
        status: "registered",
        registeredAt: now,
      });
    } catch (error) {
      // Unique (hackathon, user) index: a second request that raced the first one.
      if (error?.code === 11000) {
        throw new ApiError(409, "You are already registered for this hackathon");
      }
      throw error;
    }
  }

  await HackathonRoom.updateOne(
    { hackathon: hackathon._id },
    { $addToSet: { allowedParticipants: req.user._id } }
  );

  return res
    .status(existing ? 200 : 201)
    .json(new ApiResponse(existing ? 200 : 201, registration, "Registered for hackathon successfully"));
});

/**
 * Who may see a room:
 * - admins: always (full access)
 * - registered participants: always (participant access)
 * - anyone else: only when the room is published (public access)
 * Returns the access level, or throws.
 */
const getRoomAccess = async (room, user) => {
  if (isAdmin(user)) return "admin";

  if (user) {
    const isRegistered = await HackathonRegistration.exists({
      hackathon: room.hackathon?._id || room.hackathon,
      user: user._id,
      status: "registered",
    });
    if (isRegistered) return "participant";
  }

  if (room.visibility === "public") return "public";

  if (!user) {
    throw new ApiError(401, "Sign in required to access this private hackathon room");
  }
  throw new ApiError(
    403,
    "Access denied. This hackathon room is private to registered participants."
  );
};

// Only accepted submissions of live projects are ever shown publicly.
const PUBLIC_SUBMISSION_FILTER = { status: "accepted" };
const hasLiveProject = (submission) => submission.project && !submission.project.isDeleted;

/**
 * GET /api/v1/hackathons/rooms/:roomId
 * Room details. Participants and admins also get the team list.
 */
export const getHackathonRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  if (!mongoose.isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room id");
  }

  const room = await HackathonRoom.findById(roomId)
    .select("-allowedParticipants -publishedBy -createdBy")
    .populate("hackathon", PUBLIC_HACKATHON_FIELDS)
    .populate("participatingColleges", "name code location")
    .lean();

  if (!room) {
    throw new ApiError(404, "Hackathon room not found");
  }

  const access = await getRoomAccess(room, req.user);

  let participants = [];
  if (access !== "public") {
    participants = await HackathonRegistration.find({
      hackathon: room.hackathon._id,
      status: "registered",
    })
      .select("user college teamName registeredAt")
      .populate("user", `${PUBLIC_USER_FIELDS} collegeName`)
      .populate("college", "name code")
      .sort({ registeredAt: 1 })
      .lean();
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { ...room, access, participants }, "Hackathon room fetched successfully")
    );
});

/**
 * GET /api/v1/hackathons/rooms/:roomId/submissions
 * Participants/admins see every submission; public viewers only accepted ones.
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

  const access = await getRoomAccess(room, req.user);

  const submissions = await HackathonSubmission.find(
    access === "public" ? { room: room._id, ...PUBLIC_SUBMISSION_FILTER } : { room: room._id }
  )
    .populate("project", PUBLIC_PROJECT_FIELDS)
    .populate("submittedBy", PUBLIC_USER_FIELDS)
    .populate("teamMembers", PUBLIC_USER_FIELDS)
    .sort({ submittedAt: -1 })
    .lean();

  const viewerId = String(req.user?._id || "");
  const visible = submissions
    .filter((s) => access === "admin" || hasLiveProject(s))
    .map((s) => {
      // Notes are between the team and the organisers.
      const isOwnTeam =
        String(s.submittedBy?._id) === viewerId ||
        (s.teamMembers || []).some((m) => String(m._id) === viewerId);
      return access === "admin" || isOwnTeam ? s : { ...s, notes: undefined };
    });

  return res
    .status(200)
    .json(new ApiResponse(200, visible, "Room submissions fetched successfully"));
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

  const hackathon = room.hackathon;
  if (room.status === "archived" || ["completed", "cancelled", "draft"].includes(hackathon.status)) {
    throw new ApiError(400, "Submissions are closed for this hackathon.");
  }

  if (new Date() > new Date(hackathon.endDate)) {
    throw new ApiError(400, "The hackathon submission deadline has expired");
  }

  const registration = await HackathonRegistration.findOne({
    hackathon: hackathon._id,
    user: req.user._id,
    status: "registered",
  });

  // Only registered participants submit, and only their own projects (no admin bypass).
  if (!registration) {
    throw new ApiError(
      403,
      "You must be an approved registered participant to submit a project"
    );
  }

  const project = await Project.findById(projectId);
  if (!project || project.isDeleted) {
    throw new ApiError(404, "Project not found or unavailable");
  }

  if (String(project.userId) !== String(req.user._id)) {
    throw new ApiError(403, "You can only submit your own project");
  }

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

  // Team members must themselves be registered for this hackathon.
  const requestedMembers = Array.isArray(teamMembers)
    ? [...new Set(teamMembers.map(String))].filter(
        (id) => mongoose.isValidObjectId(id) && id !== String(req.user._id)
      )
    : [];
  const registeredMembers = requestedMembers.length
    ? await HackathonRegistration.find({
        hackathon: hackathon._id,
        user: { $in: requestedMembers },
        status: "registered",
      }).distinct("user")
    : [];
  if (registeredMembers.length !== requestedMembers.length) {
    throw new ApiError(400, "All team members must be registered for this hackathon");
  }
  if (registeredMembers.length + 1 > (hackathon.maximumTeamSize || 4)) {
    throw new ApiError(400, `Teams can have at most ${hackathon.maximumTeamSize || 4} members`);
  }

  const submission = await HackathonSubmission.create({
    hackathon: hackathon._id,
    room: room._id,
    project: project._id,
    submittedBy: req.user._id,
    teamMembers: registeredMembers,
    notes: notes?.trim() || "",
    status: "submitted",
    submittedAt: new Date(),
  });

  const populated = await HackathonSubmission.findById(submission._id)
    .populate("project", PUBLIC_PROJECT_FIELDS)
    .populate("submittedBy", PUBLIC_USER_FIELDS);

  return res.status(201).json(
    new ApiResponse(201, populated, "Project submitted to hackathon successfully")
  );
});

/**
 * GET /api/v1/hackathons/showcase
 * Published rooms only, with accepted submissions of live projects.
 * Never includes room participant lists, notes, or unpublished/rejected work.
 */
export const getPublicShowcase = asyncHandler(async (req, res) => {
  const publishedRooms = await HackathonRoom.find({ visibility: "public", status: { $ne: "archived" } })
    .select("_id hackathon title description participatingColleges status publishedAt")
    .populate("hackathon", PUBLIC_HACKATHON_FIELDS)
    .populate("participatingColleges", "name code")
    .sort({ publishedAt: -1 })
    .lean();

  const roomIds = publishedRooms.map((r) => r._id);

  const submissions = await HackathonSubmission.find({
    room: { $in: roomIds },
    ...PUBLIC_SUBMISSION_FILTER,
  })
    .select("-notes")
    .populate("project", PUBLIC_PROJECT_FIELDS)
    .populate("submittedBy", PUBLIC_USER_FIELDS)
    .populate("teamMembers", PUBLIC_USER_FIELDS)
    .sort({ submittedAt: -1 })
    .lean();

  const subByRoom = new Map();
  submissions.filter(hasLiveProject).forEach((sub) => {
    const key = String(sub.room);
    if (!subByRoom.has(key)) subByRoom.set(key, []);
    subByRoom.get(key).push(sub);
  });

  const showcase = publishedRooms
    .filter((r) => r.hackathon)
    .map((r) => ({
      ...r,
      submissions: subByRoom.get(String(r._id)) || [],
    }));

  return res
    .status(200)
    .json(new ApiResponse(200, showcase, "Public showcase fetched successfully"));
});

/**
 * GET /api/v1/hackathons/colleges
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
