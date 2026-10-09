import mongoose, { Schema } from "mongoose";

const workspaceTaskSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "completed"],
      default: "todo",
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const workspaceMessageSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

workspaceTaskSchema.index({ project: 1, createdAt: -1 });
workspaceMessageSchema.index({ project: 1, createdAt: 1 });

export const WorkspaceTask = mongoose.model("WorkspaceTask", workspaceTaskSchema);
export const WorkspaceMessage = mongoose.model("WorkspaceMessage", workspaceMessageSchema);
