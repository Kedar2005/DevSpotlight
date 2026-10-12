import verifyJWT, { optionalVerifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multure.middleware.js";
import { Router } from "express";
import {
  createProject,
  updateProject,
  deleteProject,
  getProjectById,
  getAllProjects,
} from "../controllers/project.controller.js";
import { getTeammateRecommendations } from "../controllers/recommendation.controller.js";
const router = Router();

router
  .route("/")
  .post(verifyJWT, upload.array("images", 6), createProject)
  .get(optionalVerifyJWT, getAllProjects);

router
  .route("/:projectId/recommendations")
  .get(verifyJWT, getTeammateRecommendations);

// PATCH is the existing method; PUT is accepted as an alias for the same handler.
router
  .route("/:projectId")
  .get(optionalVerifyJWT, getProjectById)
  .patch(verifyJWT, upload.array("images", 6), updateProject)
  .put(verifyJWT, upload.array("images", 6), updateProject)
  .delete(verifyJWT, deleteProject);

export default router;
