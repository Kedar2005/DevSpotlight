import mongoose, { Schema } from "mongoose";
import { PROJECT_CATEGORIES } from "../constants.js";

const ProjectSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: PROJECT_CATEGORIES,
      default: "Other",
      trim: true,
    },
    techStack: [
      {
        type: String,
        trim: true,
      },
    ],
    requiredSkills: [
      {
        type: String,
        trim: true,
      },
    ],
    githubLink: {
      type: String,
      trim: true,
      default: "",
    },
    liveLink: {
      type: String,
      trim: true,
      default: "",
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    moderationReason: {
      type: String,
      default: "",
    },
    visits: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

ProjectSchema.index({ createdAt: -1 });
ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ category: 1, createdAt: -1 });
ProjectSchema.index({ isDeleted: 1, isPublished: 1, createdAt: -1 });

export const Project = mongoose.model("Project", ProjectSchema);
