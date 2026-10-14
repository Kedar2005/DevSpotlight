import mongoose, { Schema } from "mongoose";

const hackathonSubmissionSchema = new Schema(
  {
    hackathon: {
      type: Schema.Types.ObjectId,
      ref: "Hackathon",
      required: true,
      index: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: "HackathonRoom",
      required: true,
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    teamMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["submitted", "accepted", "rejected"],
      default: "submitted",
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

hackathonSubmissionSchema.index({ hackathon: 1, project: 1 }, { unique: true });
hackathonSubmissionSchema.index({ room: 1, createdAt: -1 });

export const HackathonSubmission = mongoose.model(
  "HackathonSubmission",
  hackathonSubmissionSchema
);
