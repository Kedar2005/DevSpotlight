import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const runSuite = async () => {
  console.log("==================================================");
  console.log("   DECA-FEATURE VERIFICATION TEST SUITE           ");
  console.log("==================================================");

  const mongoUri = process.env.MONGODB_URI?.trim();
  const { DB_NAME } = await import("../src/constants.js");
  const normalizedUri = mongoUri.endsWith("/") ? mongoUri.slice(0, -1) : mongoUri;
  await mongoose.connect(`${normalizedUri}/${DB_NAME}`);
  console.log(`Connected to MongoDB: ${mongoose.connection.name}`);

  const { app } = await import("../src/app.js");
  const { User } = await import("../src/models/user.model.js");
  const { Project } = await import("../src/models/project.model.js");
  const { Hackathon } = await import("../src/models/hackathon.model.js");
  const { HackathonRoom } = await import("../src/models/hackathonRoom.model.js");
  const { HackathonRegistration } = await import("../src/models/hackathonRegistration.model.js");
  const { HackathonSubmission } = await import("../src/models/hackathonSubmission.model.js");

  // Spin up ephemeral test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}/api/v1`;
  console.log(`Test server running at: ${baseUrl}`);

  const timestamp = Date.now();
  const studentEmail = `student_test_${timestamp}@devspotlight.test`;
  const studentUserName = `student_${timestamp}`;
  const studentPassword = "Password123!";

  let studentToken = "";
  let studentUser = null;
  let adminToken = "";
  let adminUser = null;
  let testProjectId = "";
  let testHackathonId = "";
  let testRoomId = "";

  const api = async (endpoint, options = {}) => {
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (options.token) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }

    const res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    return { status: res.status, ok: res.ok, body: data };
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Student registration defaults to 'student' role, ignoring body role='admin'
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Register student with malicious role='admin' in body...");
    const regRes = await api("/auth/register", {
      method: "POST",
      body: {
        userName: studentUserName,
        email: studentEmail,
        fullName: "Test Student Verification",
        password: studentPassword,
        role: "admin", // Must be ignored!
      },
    });

    if (regRes.status !== 201) {
      throw new Error(`Registration failed: ${regRes.status} ${JSON.stringify(regRes.body)}`);
    }

    studentUser = await User.findOne({ email: studentEmail });
    if (studentUser.role !== "student") {
      throw new Error(`FAIL: Role was not set to student! Found: ${studentUser.role}`);
    }
    console.log("✓ PASS: User registered with role='student' (malicious admin request ignored).");

    // -------------------------------------------------------------
    // TEST 2: Student login returns sanitized user profile without secrets
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Student login and sanitization...");
    const loginRes = await api("/auth/login", {
      method: "POST",
      body: {
        email: studentEmail,
        password: studentPassword,
      },
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
    }

    studentToken = loginRes.body.data.accessToken;
    const loggedUser = loginRes.body.data.user;
    if (loggedUser.password || loggedUser.refreshToken) {
      throw new Error("FAIL: Sensitive fields exposed in sanitized user profile!");
    }
    if (loggedUser.role !== "student") {
      throw new Error(`FAIL: Role in login response is not student: ${loggedUser.role}`);
    }
    console.log("✓ PASS: Student logged in; payload sanitized, tokens issued.");

    // -------------------------------------------------------------
    // TEST 3: Student access denied (403 Forbidden) to Admin endpoints
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Student access denied to /admin/stats...");
    const deniedRes = await api("/admin/stats", { token: studentToken });

    if (deniedRes.status !== 403) {
      throw new Error(`FAIL: Student was not barred with 403! Got: ${deniedRes.status}`);
    }
    console.log("✓ PASS: Student received 403 Forbidden on admin endpoint.");

    // -------------------------------------------------------------
    // TEST 4: Fetch active admin and generate token
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Admin authentication & stats access...");
    adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      throw new Error("FAIL: No admin user found in database!");
    }
    adminToken = adminUser.generateAccessToken();

    const adminStatsRes = await api("/admin/stats", { token: adminToken });
    if (adminStatsRes.status !== 200) {
      throw new Error(`FAIL: Admin could not access stats: ${adminStatsRes.status}`);
    }
    console.log(`✓ PASS: Admin access granted to stats (Users: ${adminStatsRes.body.data.totalUsers}, Projects: ${adminStatsRes.body.data.totalProjects}).`);

    // -------------------------------------------------------------
    // TEST 5: Admin can suspend student account
    // -------------------------------------------------------------
    console.log("\n[TEST 5] Admin suspends student account...");
    const suspendRes = await api(`/admin/users/${studentUser._id}/status`, {
      method: "PATCH",
      token: adminToken,
      body: {
        isSuspended: true,
        reason: "Test suspension for policy violation",
      },
    });

    if (suspendRes.status !== 200) {
      throw new Error(`FAIL: Failed to suspend student: ${suspendRes.status}`);
    }
    console.log("✓ PASS: Student account suspended successfully.");

    // -------------------------------------------------------------
    // TEST 6: Suspended student blocked from login and token usage
    // -------------------------------------------------------------
    console.log("\n[TEST 6] Suspended student blocked with 403...");
    const blockedLoginRes = await api("/auth/login", {
      method: "POST",
      body: {
        email: studentEmail,
        password: studentPassword,
      },
    });

    if (blockedLoginRes.status !== 403) {
      throw new Error(`FAIL: Suspended student was able to login! Status: ${blockedLoginRes.status}`);
    }

    const blockedReqRes = await api("/auth/me", { token: studentToken });
    if (blockedReqRes.status !== 403) {
      throw new Error(`FAIL: Suspended token was not blocked with 403! Status: ${blockedReqRes.status}`);
    }
    console.log("✓ PASS: Suspended user strictly blocked from login and APIs with 403.");

    // -------------------------------------------------------------
    // TEST 7: Protect last remaining admin from suspension
    // -------------------------------------------------------------
    console.log("\n[TEST 7] Protect last remaining admin from suspension...");
    const totalAdmins = await User.countDocuments({ role: "admin", isSuspended: { $ne: true } });
    if (totalAdmins === 1) {
      const suspendAdminRes = await api(`/admin/users/${adminUser._id}/status`, {
        method: "PATCH",
        token: adminToken,
        body: {
          isSuspended: true,
          reason: "Trying to suspend sole admin",
        },
      });

      if (suspendAdminRes.status !== 400) {
        throw new Error(`FAIL: Last admin was not protected from suspension! Got: ${suspendAdminRes.status}`);
      }
      console.log("✓ PASS: Last admin protected against self-suspension (400 Bad Request).");
    } else {
      console.log(`ℹ Multiple admins present (${totalAdmins}); skipping sole admin test.`);
    }

    // -------------------------------------------------------------
    // TEST 8: Admin unsuspends student
    // -------------------------------------------------------------
    console.log("\n[TEST 8] Admin unsuspends student...");
    const unsuspendRes = await api(`/admin/users/${studentUser._id}/status`, {
      method: "PATCH",
      token: adminToken,
      body: {
        isSuspended: false,
      },
    });

    if (unsuspendRes.status !== 200) {
      throw new Error(`FAIL: Failed to unsuspend student: ${unsuspendRes.status}`);
    }
    console.log("✓ PASS: Student unsuspended successfully.");

    // -------------------------------------------------------------
    // TEST 9: Project moderation & exclusion from discovery feed
    // -------------------------------------------------------------
    console.log("\n[TEST 9] Create test project & moderate (soft-delete)...");
    const newProject = await Project.create({
      title: `Test Moderation Project ${timestamp}`,
      description: "Project created to test moderation soft-deletion",
      category: "AI / ML",
      userId: studentUser._id,
      techStack: ["Node.js", "React"],
      requiredSkills: ["Node.js"],
    });
    testProjectId = newProject._id;

    // Verify it shows up in public feed before moderation
    const beforeModRes = await api("/projects");
    const foundBefore = beforeModRes.body?.data?.projects?.some(p => String(p._id) === String(testProjectId));
    if (!foundBefore) {
      throw new Error("FAIL: New project did not appear in public feed before moderation.");
    }

    // Moderate / soft-delete
    const modRes = await api(`/admin/projects/${testProjectId}/moderation`, {
      method: "PATCH",
      token: adminToken,
      body: {
        isDeleted: true,
        reason: "Test moderation flag for community review",
      },
    });

    if (modRes.status !== 200) {
      throw new Error(`FAIL: Project moderation failed: ${modRes.status}`);
    }

    // Verify it is now EXCLUDED from public feed
    const afterModRes = await api("/projects");
    const foundAfter = afterModRes.body?.data?.projects?.some(p => String(p._id) === String(testProjectId));
    if (foundAfter) {
      throw new Error("FAIL: Soft-deleted project is still visible in public feed!");
    }
    console.log("✓ PASS: Soft-deleted project successfully excluded from public discovery feed.");

    // -------------------------------------------------------------
    // TEST 10: Restore project
    // -------------------------------------------------------------
    console.log("\n[TEST 10] Restore moderated project...");
    const restoreRes = await api(`/admin/projects/${testProjectId}/moderation`, {
      method: "PATCH",
      token: adminToken,
      body: {
        isDeleted: false,
      },
    });

    if (restoreRes.status !== 200) {
      throw new Error(`FAIL: Project restore failed: ${restoreRes.status}`);
    }
    console.log("✓ PASS: Project restored successfully.");

    // -------------------------------------------------------------
    // TEST 11: Create Hackathon & Auto-provision Private Room
    // -------------------------------------------------------------
    console.log("\n[TEST 11] Create Hackathon & verify 1-to-1 private room provisioning...");
    const startDate = new Date(Date.now() + 86400000);
    const endDate = new Date(Date.now() + 172800000);

    const hackathonRes = await api("/admin/hackathons", {
      method: "POST",
      token: adminToken,
      body: {
        title: `Collegiate Hackathon Sprint ${timestamp}`,
        description: "Official inter-college developer competition",
        mode: "hybrid",
        status: "registration_open",
        startDate,
        endDate,
      },
    });

    if (hackathonRes.status !== 201) {
      throw new Error(`FAIL: Hackathon creation failed: ${hackathonRes.status} ${JSON.stringify(hackathonRes.body)}`);
    }

    testHackathonId = hackathonRes.body.data._id || hackathonRes.body.data.hackathon?._id;
    const room = await HackathonRoom.findOne({ hackathon: testHackathonId });
    if (!room) {
      throw new Error("FAIL: Hackathon room was not auto-provisioned!");
    }
    if (room.visibility !== "private") {
      throw new Error(`FAIL: Hackathon room visibility is not private: ${room.visibility}`);
    }
    testRoomId = room._id;
    console.log(`✓ PASS: Hackathon created; private room provisioned (Room ID: ${testRoomId}).`);

    // -------------------------------------------------------------
    // TEST 12: Private room access control (unregistered student rejected with 403)
    // -------------------------------------------------------------
    console.log("\n[TEST 12] Unregistered student rejected from private room...");
    const unregRoomRes = await api(`/hackathons/rooms/${testRoomId}`, { token: studentToken });

    if (unregRoomRes.status !== 403) {
      throw new Error(`FAIL: Unregistered student was not denied with 403! Status: ${unregRoomRes.status}`);
    }
    console.log("✓ PASS: Private room strictly rejected unregistered student with 403.");

    // -------------------------------------------------------------
    // TEST 13: Student registers for hackathon and gains private room access
    // -------------------------------------------------------------
    console.log("\n[TEST 13] Student registers for hackathon and enters room...");
    const regHackRes = await api(`/hackathons/${testHackathonId}/register`, {
      method: "POST",
      token: studentToken,
      body: {
        teamName: "CodeCrafters",
      },
    });

    if (regHackRes.status !== 201) {
      throw new Error(`FAIL: Hackathon registration failed: ${regHackRes.status}`);
    }

    const authRoomRes = await api(`/hackathons/rooms/${testRoomId}`, { token: studentToken });
    if (authRoomRes.status !== 200) {
      throw new Error(`FAIL: Registered participant could not access room: ${authRoomRes.status}`);
    }
    console.log("✓ PASS: Registered student granted access to private hackathon room.");

    // -------------------------------------------------------------
    // TEST 14: Student submits project to hackathon room
    // -------------------------------------------------------------
    console.log("\n[TEST 14] Student submits project to hackathon room...");
    const submitRes = await api(`/hackathons/rooms/${testRoomId}/submissions`, {
      method: "POST",
      token: studentToken,
      body: {
        projectId: testProjectId,
        notes: "https://slides.example.com/demo-pitch",
      },
    });

    if (submitRes.status !== 201) {
      throw new Error(`FAIL: Project submission failed: ${submitRes.status} ${JSON.stringify(submitRes.body)}`);
    }

    const subListRes = await api(`/hackathons/rooms/${testRoomId}/submissions`, { token: studentToken });
    if (subListRes.status !== 200 || subListRes.body.data.length === 0) {
      throw new Error("FAIL: Submissions list did not reflect the new project submission.");
    }
    console.log("✓ PASS: Project submitted to room successfully.");

    // -------------------------------------------------------------
    // TEST 15: Room publishing rejected if hackathon is not completed
    // -------------------------------------------------------------
    console.log("\n[TEST 15] Publishing room when hackathon is registration_open fails with 400...");
    const earlyPublishRes = await api(`/admin/rooms/${testRoomId}/publish`, {
      method: "PATCH",
      token: adminToken,
    });

    if (earlyPublishRes.status !== 400) {
      throw new Error(`FAIL: Early publishing did not return 400! Status: ${earlyPublishRes.status}`);
    }
    console.log("✓ PASS: Early publishing rejected with 400 Bad Request (Hackathon must be completed).");

    // -------------------------------------------------------------
    // TEST 16: Complete hackathon & publish room to Public Showcase
    // -------------------------------------------------------------
    console.log("\n[TEST 16] Complete hackathon, publish room, and verify Public Showcase...");
    await Hackathon.findByIdAndUpdate(testHackathonId, { status: "completed" });

    const publishRes = await api(`/admin/rooms/${testRoomId}/publish`, {
      method: "PATCH",
      token: adminToken,
    });

    if (publishRes.status !== 200) {
      throw new Error(`FAIL: Publishing completed room failed: ${publishRes.status}`);
    }

    // Public showcase verification (no auth token required!)
    const showcaseRes = await api("/hackathons/showcase");
    if (showcaseRes.status !== 200) {
      throw new Error(`FAIL: Public showcase fetch failed: ${showcaseRes.status}`);
    }

    const foundInShowcase = showcaseRes.body.data.some(s => String(s.hackathon?._id) === String(testHackathonId));
    if (!foundInShowcase) {
      throw new Error("FAIL: Completed published hackathon did not appear on public showcase!");
    }
    console.log("✓ PASS: Completed room published; featured on Public Showcase without authentication.");

    console.log("\n==================================================");
    console.log("   ALL 16 INTEGRATION TEST CASES PASSED!          ");
    console.log("==================================================");

  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err.message);
    process.exitCode = 1;
  } finally {
    // Clean up test records
    console.log("\nCleaning up test records...");
    if (testRoomId) await HackathonRoom.findByIdAndDelete(testRoomId);
    if (testHackathonId) {
      await Hackathon.findByIdAndDelete(testHackathonId);
      await HackathonRegistration.deleteMany({ hackathon: testHackathonId });
      await HackathonSubmission.deleteMany({ hackathon: testHackathonId });
    }
    if (testProjectId) await Project.findByIdAndDelete(testProjectId);
    if (studentUser?._id) await User.findByIdAndDelete(studentUser._id);

    server.close();
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB. Server closed. Done.\n");
  }
};

runSuite();
