import nodemailer from "nodemailer";

/**
 * Email is optional. Set SMTP_HOST and MAIL_FROM (plus SMTP_USER / SMTP_PASS if your
 * provider needs authentication) to turn it on. Without them nothing is sent, and
 * callers must say so instead of pretending an email went out.
 */
export const isMailConfigured = () =>
  Boolean(process.env.SMTP_HOST?.trim() && process.env.MAIL_FROM?.trim());

let transporter;

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
};

const escapeHtml = (value) =>
  `${value}`.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

export const sendPasswordResetEmail = async ({
  to,
  name,
  resetUrl,
  expiresInMinutes,
}) => {
  const text = [
    `Hi ${name || "there"},`,
    "",
    "We received a request to reset your DevSpotlight password.",
    `Use this link within ${expiresInMinutes} minutes to choose a new one:`,
    resetUrl,
    "",
    "If you didn't ask for this, you can ignore this email. Your password won't change.",
  ].join("\n");

  const html = `
    <p>Hi ${escapeHtml(name || "there")},</p>
    <p>We received a request to reset your DevSpotlight password.
    This link works for ${expiresInMinutes} minutes:</p>
    <p><a href="${escapeHtml(resetUrl)}">Choose a new password</a></p>
    <p>If you didn't ask for this, you can ignore this email. Your password won't change.</p>`;

  return getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Reset your DevSpotlight password",
    text,
    html,
  });
};
