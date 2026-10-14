import { Router } from "express";
import verifyJWT, { requireAdmin } from "../middlewares/auth.middleware.js";
import {
  getAdminStats,
  getAdminUsers,
  updateUserSuspension,
  getUserProjects,
  getAdminProjects,
  moderateProject,
  getAdminColleges,
  createCollege,
  updateCollege,
  updateCollegeStatus,
  getAdminHackathons,
  createHackathon,
  updateHackathon,
  updateHackathonStatus,
  getHackathonParticipants,
  getHackathonSubmissions,
  getAdminRooms,
  publishRoom,
  unpublishRoom,
  getAdminReports,
} from "../controllers/admin.controller.js";

const router = Router();

// Protect all admin endpoints with both JWT authentication and admin authorization
router.use(verifyJWT, requireAdmin);

// Overview statistics & reports
router.route("/stats").get(getAdminStats);
router.route("/reports").get(getAdminReports);

// User management
router.route("/users").get(getAdminUsers);
router.route("/users/:userId/status").patch(updateUserSuspension);
router.route("/users/:userId/projects").get(getUserProjects);

// Project moderation
router.route("/projects").get(getAdminProjects);
router.route("/projects/:projectId/moderation").patch(moderateProject);

// College management
router.route("/colleges").get(getAdminColleges).post(createCollege);
router.route("/colleges/:collegeId").put(updateCollege);
router.route("/colleges/:collegeId/status").patch(updateCollegeStatus);

// Hackathon management
router.route("/hackathons").get(getAdminHackathons).post(createHackathon);
router.route("/hackathons/:hackathonId").put(updateHackathon);
router.route("/hackathons/:hackathonId/status").patch(updateHackathonStatus);
router.route("/hackathons/:hackathonId/participants").get(getHackathonParticipants);
router.route("/hackathons/:hackathonId/submissions").get(getHackathonSubmissions);

// Hackathon room management & publishing
router.route("/rooms").get(getAdminRooms);
router.route("/rooms/:roomId/publish").patch(publishRoom);
router.route("/rooms/:roomId/unpublish").patch(unpublishRoom);

export default router;
