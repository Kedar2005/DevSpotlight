import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
  sendCollaborationRequest,
  getReceivedRequests,
  getSentRequests,
  getProjectRequests,
  approveCollaborationRequest,
  rejectCollaborationRequest,
  cancelCollaborationRequest,
} from "../controllers/collaboration.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(sendCollaborationRequest);
router.route("/received").get(getReceivedRequests);
router.route("/sent").get(getSentRequests);

// Legacy paths used by the original contribution API
router
  .route("/project/:projectId")
  .post(sendCollaborationRequest)
  .get(getProjectRequests);

// PUT is the documented method; PATCH is kept because the original client used it.
router
  .route("/:requestId/approve")
  .put(approveCollaborationRequest)
  .patch(approveCollaborationRequest);
router
  .route("/:requestId/reject")
  .put(rejectCollaborationRequest)
  .patch(rejectCollaborationRequest);

router.route("/:requestId").delete(cancelCollaborationRequest);

export default router;
