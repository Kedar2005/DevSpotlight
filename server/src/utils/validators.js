import { ApiError } from "./apiError.js";

/** Accepts an array or a comma separated string and returns a clean string[]. */
export const parseStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

/**
 * Validates an optional http(s) URL. Empty values are allowed and returned as "".
 * A missing scheme ("github.com/me") is treated as https. Anything that is not
 * http/https (for example `javascript:`) is rejected, because these values end up
 * in <a href> attributes on the frontend.
 */
export const normalizeOptionalUrl = (value, label = "URL") => {
  if (value === undefined || value === null) return "";
  const raw = `${value}`.trim();
  if (!raw) return "";

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new ApiError(400, `${label} must be a valid URL`);
  }

  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) {
    throw new ApiError(400, `${label} must be a valid http(s) URL`);
  }

  return parsed.toString();
};

/** Escapes user input so it can be used inside a RegExp safely. */
export const escapeRegex = (value) => `${value}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (value) =>
  typeof value === "string" && value.length <= 254 && EMAIL_PATTERN.test(value);
