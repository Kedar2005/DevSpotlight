import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const UserSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["student", "admin", "user"],
      default: "student",
      index: true,
    },

    college: {
      type: Schema.Types.ObjectId,
      ref: "College",
      default: null,
    },

    collegeName: {
      type: String,
      trim: true,
      default: "",
    },

    isBanned: {
      type: Boolean,
      default: false,
    },

    banExpiresAt: {
      type: Date,
      default: null,
    },

    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },

    suspendedReason: {
      type: String,
      default: "",
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    bio: {
      type: String,
      trim: true,
      default: "Building projects on DevSpotlight.",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    avatar: {
      type: String,
      default:
        "https://ui-avatars.com/api/?name=Dev+Spotlight&background=111827&color=f8fafc",
    },

    coverImage: {
      type: String,
    },

    skills: [
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
    projectList: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    favouriteList: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    password: {
      type: String,
      required: [true, "password is required"],
    },

    refreshToken: {
      type: String,
    },

    // --- Password reset ---------------------------------------------------
    // Only a SHA-256 hash of the emailed token is stored. The raw token is never
    // persisted, and these fields are excluded from queries unless explicitly selected.
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    passwordResetRequestedAt: {
      type: Date,
      select: false,
    },
    // Access tokens issued before this moment are rejected (see verifyJWT).
    passwordChangedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      fullName: this.fullName,
      role: this.role === "admin" ? "admin" : "student",
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      fullName: this.fullName,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", UserSchema);
