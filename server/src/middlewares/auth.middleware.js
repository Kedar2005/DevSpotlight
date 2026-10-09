import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

const extractToken = (req) =>
  req.cookies?.accessToken ||
  req.header("Authorization")?.replace("Bearer", "").trim();

/**
 * Resolves the user a token belongs to, or throws. Tokens issued before the user's
 * last password reset are rejected so a reset signs out every older session.
 */
const resolveUserFromToken = async (token) => {
  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  const user = await User.findById(decodedToken?._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(401, "Invalid access token");
  }

  // JWT `iat` has one-second resolution, so a token issued in the very same second as the
  // reset is still accepted. That is deliberate: rejecting it would also reject the new
  // session of someone who logs in straight after resetting.
  if (
    user.passwordChangedAt &&
    decodedToken.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
  ) {
    throw new ApiError(401, "Your password was changed. Please sign in again.");
  }

  return user;
};

const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new ApiError(401, "Unauthorized token");
    }

    req.user = await resolveUserFromToken(token);
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

/**
 * For public endpoints that can personalise their response (e.g. "did I like this?").
 * A missing or invalid token simply means the viewer is treated as a guest.
 */
export const optionalVerifyJWT = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      req.user = await resolveUserFromToken(token);
    }
  } catch {
    // Treat as a guest.
  }
  next();
};

export default verifyJWT;
