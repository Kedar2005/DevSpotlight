// Explicit, rerunnable admin role management. Nothing changes unless an action flag is given.
//
//   ADMIN_EMAIL=a@b.edu npm run bootstrap:admin                 -> report only
//   ADMIN_EMAIL=a@b.edu npm run bootstrap:admin -- --promote    -> make an existing account admin
//   ADMIN_EMAIL=a@b.edu npm run bootstrap:admin -- --demote     -> make an admin a student again
//   ADMIN_EMAIL=a@b.edu ADMIN_USERNAME=ops ADMIN_PASSWORD=... npm run bootstrap:admin -- --create
//                                                               -> create a new dedicated admin account
//
// Existing passwords are never changed. Passwords and tokens are never printed.
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const ACTIONS = ["--promote", "--demote", "--create"];

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
};

const run = async () => {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const actions = process.argv.slice(2).filter((arg) => ACTIONS.includes(arg));

  if (!email) return fail("ADMIN_EMAIL is required (see the usage at the top of this script).");
  if (actions.length > 1) return fail(`Use only one of ${ACTIONS.join(", ")}.`);
  const action = actions[0];

  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) return fail("MONGODB_URI is not set in server/.env");

  const { DB_NAME } = await import("../src/constants.js");
  await mongoose.connect(`${mongoUri.replace(/\/$/, "")}/${DB_NAME}`);
  const { User } = await import("../src/models/user.model.js");

  try {
    const user = await User.findOne({ email });
    const activeAdmins = await User.countDocuments({
      role: "admin",
      isSuspended: { $ne: true },
      isBanned: { $ne: true },
    });
    console.log(`Database: ${mongoose.connection.name}. Active admins: ${activeAdmins}.`);
    console.log(
      user
        ? `Account ${email}: @${user.userName}, role "${user.role}".`
        : `No account with email ${email}.`
    );

    if (!action) {
      console.log(`No changes made. Pass one of ${ACTIONS.join(", ")} to act.`);
      return;
    }

    if (action === "--promote") {
      if (!user) return fail("No such account. Use --create for a new dedicated admin account.");
      if (user.role === "admin") return console.log("Already an admin. No changes made.");
      await User.updateOne({ _id: user._id }, { $set: { role: "admin" } });
      return console.log(`Promoted @${user.userName} to admin. Password unchanged.`);
    }

    if (action === "--demote") {
      if (!user) return fail("No such account.");
      if (user.role !== "admin") return console.log("Not an admin. No changes made.");
      if (activeAdmins <= 1 && !user.isSuspended && !user.isBanned) {
        return fail("Refusing to demote the last active admin. Create or promote another admin first.");
      }
      await User.updateOne({ _id: user._id }, { $set: { role: "student" } });
      return console.log(`@${user.userName} is now a student. Their data and registrations are unchanged.`);
    }

    // --create
    if (user) return fail("An account with this email already exists. Use --promote instead.");
    const userName = (process.env.ADMIN_USERNAME || "").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "";
    if (!userName) return fail("ADMIN_USERNAME is required with --create.");
    if (password.length < 8) return fail("ADMIN_PASSWORD of at least 8 characters is required with --create.");
    if (await User.exists({ userName })) return fail(`Username "${userName}" is taken. Choose another ADMIN_USERNAME.`);

    const created = await User.create({
      userName,
      email,
      fullName: (process.env.ADMIN_FULLNAME || "Platform Administrator").trim(),
      password,
      role: "admin",
      bio: "Platform Administrator for DevSpotlight.",
    });
    console.log(`Created admin account @${created.userName} (${created.email}).`);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((err) => {
  console.error("Bootstrap script error:", err.message);
  process.exitCode = 1;
});
