import mongoose, { Schema } from "mongoose";
import { COLLABORATION_STATUSES } from "../constants.js";

/**
 * A request from one user (sender) to collaborate on another user's project.
 * `receiver` is the project owner at the time of the request; it is copied onto the
 * request so "incoming requests" is a single indexed query.
 */
const collaborationRequestSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: COLLABORATION_STATUSES,
      default: "pending",
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// A pair of users can only have ONE pending request per project at a time. Rejected and
// approved requests are kept as history, so this is a partial unique index. It is the
// database-level guard behind the application-level duplicate check (handles races).
collaborationRequestSchema.index(
  { project: 1, sender: 1, receiver: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);
collaborationRequestSchema.index({ receiver: 1, status: 1, createdAt: -1 });
collaborationRequestSchema.index({ sender: 1, status: 1, createdAt: -1 });
collaborationRequestSchema.index({ project: 1, createdAt: -1 });

export const CollaborationRequest = mongoose.model(
  "CollaborationRequest",
  collaborationRequestSchema
);
