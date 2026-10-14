import mongoose, { Schema } from "mongoose";

export const HACKATHON_STATUSES = [
  "draft",
  "upcoming",
  "registration_open",
  "ongoing",
  "completed",
  "cancelled",
];

const hackathonSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    theme: {
      type: String,
      trim: true,
      default: "Open Innovation",
    },
    organizer: {
      type: String,
      trim: true,
      default: "DevSpotlight",
    },
    participatingColleges: [
      {
        type: Schema.Types.ObjectId,
        ref: "College",
      },
    ],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    registrationDeadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: HACKATHON_STATUSES,
      default: "draft",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "public",
      index: true,
    },
    participationMode: {
      type: String,
      enum: ["individual", "team"],
      default: "individual",
    },
    maximumParticipants: {
      type: Number,
      default: null,
    },
    maximumTeamSize: {
      type: Number,
      default: 4,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bannerImage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

hackathonSchema.index({ status: 1, startDate: 1 });
hackathonSchema.index({ visibility: 1, status: 1 });
hackathonSchema.index({ createdAt: -1 });

export const Hackathon = mongoose.model("Hackathon", hackathonSchema);
