import crypto from "crypto";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { isValidEmail } from "../utils/validators.js";
import { isMailConfigured, sendPasswordResetEmail } from "../utils/mailer.js";

const sanitizeUser = (user) => ({
  _id: user._id,
  userName: user.userName,
  fullName: user.fullName,
  email: user.email,
  bio: user.bio,
  avatar: user.avatar,
  coverImage: user.coverImage,
  skills: user.skills,
  githubLink: user.githubLink,
  createdAt: user.createdAt,
  role: user.role,
  skills: user.skills,
  githubLink: user.githubLink,
});

const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found during token generation");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

//register
const registerUser = asyncHandler(async (req, res) => {
  const { userName, fullName, email, password, bio, avatar, coverImage } =
    req.body;

  if (
    [userName, fullName, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "Username, full name, email, and password are required");
  }

  const existingUser = await User.findOne({
    $or: [{ userName: userName.toLowerCase() }, { email: email.toLowerCase() }],
  });

  if (existingUser) {
    throw new ApiError(400, "User already registered");
  }

  //create user
  const registeredUser = await User.create({
    userName,
    fullName,
    email,
    password,
    bio: bio?.trim() || undefined,
    avatar: avatar?.trim() || undefined,
    coverImage: coverImage?.trim() || "",
  });

  const createdUser = await User.findById(registeredUser._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(400, "User registration failed!");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    createdUser._id
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: sanitizeUser(createdUser),
        accessToken,
        refreshToken,
      },
      "User registered successfully"
    )
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password?.trim()) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: sanitizeUser(user),
          accessToken,
          refreshToken,
        },
        "Logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(200, { accessToken, refreshToken }, "Token refreshed")
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------
const RESET_EXPIRY_MINUTES = () =>
  Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES) > 0
    ? Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES)
    : 15;

// Minimum gap between two reset EMAILS for one account (stops mailbox flooding).
const RESET_EMAIL_COOLDOWN_MS = () => {
  const seconds = Number(process.env.PASSWORD_RESET_COOLDOWN_SECONDS);
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : 60) * 1000;
};

const isProduction = () => process.env.NODE_ENV === "production";

// Returning the token in the API response is a development convenience for setups with
// no email provider. It needs an explicit opt-in and can never be enabled in production.
const isDevResetExposureEnabled = () =>
  !isProduction() && process.env.PASSWORD_RESET_DEV_MODE === "true";

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getFrontendUrl = () =>
  (
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGIN?.split(",")[0] ||
    "http://localhost:5173"
  )
    .trim()
    .replace(/\/$/, "");

const forgotPassword = asyncHandler(async (req, res) => {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

  if (!isValidEmail(email)) {
    throw new ApiError(400, "Enter a valid email address");
  }

  const mailConfigured = isMailConfigured();
  const expiresInMinutes = RESET_EXPIRY_MINUTES();

  // The response is identical whether or not the account exists, so this endpoint can't
  // be used to find out which emails are registered.
  const data = { deliveryConfigured: mailConfigured };
  const message = mailConfigured
    ? "If an account exists for that email, a password reset link has been sent."
    : "Email delivery isn't configured on this server, so no email was sent.";

  const user = await User.findOne({ email }).select("+passwordResetRequestedAt");

  if (user) {
    const requestedAt = user.passwordResetRequestedAt?.getTime() ?? 0;
    const coolingDown =
      mailConfigured && Date.now() - requestedAt < RESET_EMAIL_COOLDOWN_MS();

    if (!coolingDown) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      user.passwordResetToken = hashResetToken(rawToken);
      user.passwordResetExpires = expiresAt;
      user.passwordResetRequestedAt = new Date();
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${getFrontendUrl()}/reset-password?token=${rawToken}`;

      if (mailConfigured) {
        try {
          await sendPasswordResetEmail({
            to: user.email,
            name: user.fullName,
            resetUrl,
            expiresInMinutes,
          });
        } catch (error) {
          // Don't tell the requester: that would reveal the account exists.
          console.error("[password-reset] Failed to send email:", error.message);
        }
      } else if (!isProduction()) {
        console.log(
          `\n[password-reset] Email is not configured. Reset link for ${user.email} ` +
            `(valid ${expiresInMinutes} min):\n  ${resetUrl}\n`
        );
      } else {
        console.warn(
          "[password-reset] A reset was requested but email delivery is not configured."
        );
      }

      if (!mailConfigured && isDevResetExposureEnabled()) {
        data.dev = { resetToken: rawToken, resetUrl, expiresAt };
      }
    }
  }

  return res.status(200).json(new ApiResponse(200, data, message));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, confirmPassword } = req.body ?? {};
  const invalidLink = new ApiError(400, "This reset link is invalid or has expired");

  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token.trim())) {
    throw invalidLink;
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }
  if (Buffer.byteLength(password) > 72) {
    throw new ApiError(400, "Password must be 72 characters or fewer");
  }
  if (confirmPassword !== undefined && confirmPassword !== password) {
    throw new ApiError(400, "Passwords do not match");
  }

  const user = await User.findOne({
    passwordResetToken: hashResetToken(token.trim().toLowerCase()),
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetToken +passwordResetExpires +passwordResetRequestedAt");

  if (!user) {
    throw invalidLink;
  }

  // The pre-save hook hashes this with bcrypt; the plain text is never stored.
  user.password = password;
  user.passwordChangedAt = new Date();
  user.refreshToken = "";
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetRequestedAt = undefined;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Password updated. You can now sign in with it.")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  getCurrentUser,
  forgotPassword,
  resetPassword,
};
