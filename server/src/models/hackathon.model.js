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
    // Optional: when null, registration opens as soon as the hackathon is listed.
    registrationStartDate: {
      type: Date,
      default: null,
    },
    registrationDeadline: {
      type: Date,
      required: true,
    },
    eligibility: {
      type: String,
      trim: true,
      default: "",
    },
    rules: {
      type: String,
      trim: true,
      default: "",
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

/**
 * Registration window check shared by the public API and the register endpoint.
 * Works on lean objects too, so it is a plain function rather than a schema method.
 */
export const isRegistrationOpen = (hackathon, now = new Date()) =>
  hackathon.visibility === "public" &&
  !["draft", "completed", "cancelled"].includes(hackathon.status) &&
  (!hackathon.registrationStartDate || now >= new Date(hackathon.registrationStartDate)) &&
  now <= new Date(hackathon.registrationDeadline);

hackathonSchema.index({ status: 1, startDate: 1 });
hackathonSchema.index({ visibility: 1, status: 1 });
hackathonSchema.index({ createdAt: -1 });

export const Hackathon = mongoose.model("Hackathon", hackathonSchema);
