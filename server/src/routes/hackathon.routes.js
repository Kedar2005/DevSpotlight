import { Router } from "express";
import verifyJWT, { optionalVerifyJWT } from "../middlewares/auth.middleware.js";
import {
  getHackathons,
  getHackathonDetails,
  registerForHackathon,
  getHackathonRoom,
  getRoomSubmissions,
  submitProjectToRoom,
  getPublicShowcase,
  getPublicColleges,
} from "../controllers/hackathon.controller.js";

const router = Router();

// Public showcase & active colleges lookup
router.route("/showcase").get(getPublicShowcase);
router.route("/colleges").get(getPublicColleges);

// Hackathons discovery & details
router.route("/").get(optionalVerifyJWT, getHackathons);
router.route("/:idOrSlug").get(optionalVerifyJWT, getHackathonDetails);

// Participant registration
router.route("/:hackathonId/register").post(verifyJWT, registerForHackathon);

// Room interaction (enforces private/public visibility in controller)
router.route("/rooms/:roomId").get(optionalVerifyJWT, getHackathonRoom);
router
  .route("/rooms/:roomId/submissions")
  .get(optionalVerifyJWT, getRoomSubmissions)
  .post(verifyJWT, submitProjectToRoom);

export default router;
