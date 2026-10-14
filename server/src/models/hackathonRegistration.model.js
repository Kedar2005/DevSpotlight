import mongoose, { Schema } from "mongoose";

const hackathonRegistrationSchema = new Schema(
  {
    hackathon: {
      type: Schema.Types.ObjectId,
      ref: "Hackathon",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    college: {
      type: Schema.Types.ObjectId,
      ref: "College",
      default: null,
    },
    teamName: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["registered", "confirmed", "withdrawn"],
      default: "registered",
      index: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

hackathonRegistrationSchema.index({ hackathon: 1, user: 1 }, { unique: true });
hackathonRegistrationSchema.index({ hackathon: 1, status: 1 });

export const HackathonRegistration = mongoose.model(
  "HackathonRegistration",
  hackathonRegistrationSchema
);
