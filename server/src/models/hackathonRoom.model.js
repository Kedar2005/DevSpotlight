import mongoose, { Schema } from "mongoose";

const hackathonRoomSchema = new Schema(
  {
    hackathon: {
      type: Schema.Types.ObjectId,
      ref: "Hackathon",
      required: true,
      unique: true, // One room per hackathon
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    participatingColleges: [
      {
        type: Schema.Types.ObjectId,
        ref: "College",
      },
    ],
    allowedParticipants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
      index: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "open", "completed", "archived"],
      default: "upcoming",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    publishedBy: {
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

hackathonRoomSchema.index({ visibility: 1, status: 1 });
hackathonRoomSchema.index({ createdAt: -1 });

export const HackathonRoom = mongoose.model("HackathonRoom", hackathonRoomSchema);
