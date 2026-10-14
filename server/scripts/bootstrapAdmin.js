import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const runBootstrap = async () => {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const userName = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const fullName = (process.env.ADMIN_FULLNAME || "Platform Administrator").trim();

  if (!email) {
    console.error("ERROR: ADMIN_EMAIL environment variable is required.");
    console.error("Usage: ADMIN_EMAIL=admin@devspotlight.edu ADMIN_PASSWORD=SecurePassword123! npm run bootstrap:admin");
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    console.error("ERROR: MONGODB_URI is not set in server/.env");
    process.exit(1);
  }

  const { DB_NAME } = await import("../src/constants.js");
  const normalizedUri = mongoUri.endsWith("/") ? mongoUri.slice(0, -1) : mongoUri;
  await mongoose.connect(`${normalizedUri}/${DB_NAME}`);
  console.log(`Connected to database: ${mongoose.connection.name}`);

  const { User } = await import("../src/models/user.model.js");

  // Check if user already exists with this email
  let user = await User.findOne({ email });

  if (user) {
    console.log(`Found existing user with email "${email}" (${user.userName}). Promoting to admin...`);
    user.role = "admin";
    user.isBanned = false;
    user.isSuspended = false;
    user.suspendedReason = "";

    if (password && password.trim()) {
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();
    console.log(`Successfully promoted ${user.userName} (${user.email}) to role: admin!`);
  } else {
    if (!password || password.trim().length < 6) {
      console.error("ERROR: ADMIN_PASSWORD of at least 6 characters is required to create a new admin account.");
      process.exit(1);
    }

    // Check if username is taken
    const existingUsername = await User.findOne({ userName });
    const finalUserName = existingUsername ? `${userName}_admin` : userName;

    user = await User.create({
      userName: finalUserName,
      email,
      fullName,
      password,
      role: "admin",
      bio: "Platform Administrator for DevSpotlight.",
      isBanned: false,
      isSuspended: false,
    });

    console.log(`Successfully created new admin user "${user.userName}" with email "${user.email}".`);
  }

  console.log("Bootstrap complete. Admin user ready for secure operations.");
  await mongoose.disconnect();
};

runBootstrap().catch((err) => {
  console.error("Bootstrap script error:", err.message);
  process.exit(1);
});
