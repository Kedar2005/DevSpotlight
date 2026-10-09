import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
  getWorkspaceDetails,
  createWorkspaceTask,
  updateWorkspaceTask,
  deleteWorkspaceTask,
  getWorkspaceMessages,
  sendWorkspaceMessage,
} from "../controllers/workspace.controller.js";

const router = Router();

// All workspace routes require authentication
router.use(verifyJWT);

router.route("/:projectId").get(getWorkspaceDetails);

router.route("/:projectId/tasks").post(createWorkspaceTask);
router
  .route("/:projectId/tasks/:taskId")
  .patch(updateWorkspaceTask)
  .delete(deleteWorkspaceTask);

router
  .route("/:projectId/messages")
  .get(getWorkspaceMessages)
  .post(sendWorkspaceMessage);

export default router;
