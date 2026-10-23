// Checks admin access, hackathon validation, room privacy and the publish lifecycle.
// Creates and removes its own records. Run against a TEST database only:
//   MONGODB_URI=mongodb://127.0.0.1:27017 node scripts/hackathonLifecycleTest.js
// Needs at least one admin user (see `npm run bootstrap:admin`).
import dotenv from "dotenv";
import mongoose from "mongoose";
import assert from "node:assert/strict";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { DB_NAME } = await import("../src/constants.js");
await mongoose.connect(`${process.env.MONGODB_URI.trim().replace(/\/$/, "")}/${DB_NAME}`);

const { app } = await import("../src/app.js");
const { User } = await import("../src/models/user.model.js");
const { Project } = await import("../src/models/project.model.js");
const { Hackathon } = await import("../src/models/hackathon.model.js");
const { HackathonRoom } = await import("../src/models/hackathonRoom.model.js");
const { HackathonRegistration } = await import("../src/models/hackathonRegistration.model.js");
const { HackathonSubmission } = await import("../src/models/hackathonSubmission.model.js");

const server = app.listen(0);
const base = `http://localhost:${server.address().port}/api/v1`;
const api = async (url, { method = "GET", token, body } = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const stamp = Date.now();
const day = 86400000;
const created = { users: [], hackathons: [], projects: [] };
let passed = 0;
const check = async (name, fn) => {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

try {
  const admin = await User.findOne({ role: "admin" });
  assert.ok(admin, "an admin user must exist");
  const adminToken = admin.generateAccessToken();

  const register = async (suffix) => {
    const res = await api("/auth/register", {
      method: "POST",
      body: {
        userName: `qa_${suffix}_${stamp}`,
        fullName: `QA ${suffix}`,
        email: `qa_${suffix}_${stamp}@devspotlight.test`,
        password: "Password123!",
        role: "admin",
      },
    });
    assert.equal(res.status, 201);
    created.users.push(res.body.data.user._id);
    return res.body.data;
  };
  const alice = await register("alice");
  const bob = await register("bob");

  await check("registration ignores a requested admin role", async () => {
    assert.equal(alice.user.role, "student");
  });

  await check("students get a JSON 403 from admin APIs", async () => {
    for (const url of ["/admin/stats", "/admin/submissions", "/admin/rooms"]) {
      const res = await api(url, { token: alice.accessToken });
      assert.equal(res.status, 403, url);
      assert.match(res.body.message, /Administrator/);
    }
  });

  await check("overview stats come with recent activity", async () => {
    const res = await api("/admin/stats", { token: adminToken });
    assert.equal(res.status, 200);
    for (const key of ["totalStudents", "totalProjects", "totalColleges", "totalHackathons", "activeHackathons", "pendingSubmissions"]) {
      assert.equal(typeof res.body.data[key], "number", key);
    }
    assert.ok(res.body.data.recentActivity.some((a) => a.type === "student" && a.title === "QA bob"));
  });

  await check("student search and status filters combine", async () => {
    const res = await api(`/admin/users?q=qa_alice_${stamp}&status=active`, { token: adminToken });
    assert.equal(res.body.data.users.length, 1);
    assert.equal(res.body.data.users[0].userName, `qa_alice_${stamp}`);
  });

  const project = await Project.create({ title: `QA Project ${stamp}`, description: "test", userId: alice.user._id });
  created.projects.push(project._id);

  await check("projects are searchable by owner", async () => {
    const res = await api(`/admin/projects?q=qa_alice_${stamp}`, { token: adminToken });
    assert.ok(res.body.data.projects.some((p) => String(p._id) === String(project._id)));
  });

  const createHackathon = async (overrides) => {
    const res = await api("/admin/hackathons", {
      method: "POST",
      token: adminToken,
      body: {
        title: `QA Hack ${stamp}`,
        description: "Lifecycle test",
        startDate: new Date(Date.now() + 2 * day),
        endDate: new Date(Date.now() + 3 * day),
        registrationDeadline: new Date(Date.now() + day),
        ...overrides,
      },
    });
    if (res.status === 201) created.hackathons.push(res.body.data.hackathon._id);
    return res;
  };

  await check("invalid hackathon dates are rejected", async () => {
    const res = await createHackathon({ startDate: new Date(Date.now() + 3 * day), endDate: new Date(Date.now() + 2 * day) });
    assert.equal(res.status, 400);
    const res2 = await createHackathon({ registrationStartDate: new Date(Date.now() + 2 * day) });
    assert.equal(res2.status, 400);
  });

  await check("registration waits for the registration start date", async () => {
    const res = await createHackathon({ registrationStartDate: new Date(Date.now() + day / 2) });
    assert.equal(res.status, 201);
    const reg = await api(`/hackathons/${res.body.data.hackathon._id}/register`, { method: "POST", token: alice.accessToken, body: { acceptRules: true } });
    assert.equal(reg.status, 400);
    assert.match(reg.body.message, /not opened yet/);
  });

  await check("draft hackathons are hidden from students", async () => {
    const res = await createHackathon({ status: "draft" });
    const id = res.body.data.hackathon._id;
    assert.equal((await api(`/hackathons/${id}`, { token: alice.accessToken })).status, 404);
    assert.equal((await api(`/hackathons/${id}`, { token: adminToken })).status, 200);
    assert.equal((await api(`/hackathons/${id}/register`, { method: "POST", token: alice.accessToken, body: { acceptRules: true } })).status, 404);
  });

  const hackRes = await createHackathon({ status: "registration_open", participationMode: "team", maximumTeamSize: 2 });
  const hackathonId = hackRes.body.data.hackathon._id;
  const roomId = hackRes.body.data.room._id;

  await check("team hackathons require a team name", async () => {
    const res = await api(`/hackathons/${hackathonId}/register`, { method: "POST", token: alice.accessToken, body: { acceptRules: true } });
    assert.equal(res.status, 400);
    for (const who of [alice, bob]) {
      const ok = await api(`/hackathons/${hackathonId}/register`, { method: "POST", token: who.accessToken, body: { teamName: "Rockets", acceptRules: true } });
      assert.equal(ok.status, 201);
    }
  });

  await check("registration validates, rejects duplicates and admins", async () => {
    const url = `/hackathons/${hackathonId}/register`;
    // Unconfirmed rules
    assert.equal((await api(url, { method: "POST", token: alice.accessToken, body: { teamName: "Rockets" } })).status, 400);
    // Duplicate
    const dup = await api(url, { method: "POST", token: alice.accessToken, body: { teamName: "Rockets", acceptRules: true } });
    assert.equal(dup.status, 409);
    // Admins do not register as participants
    assert.equal((await api(url, { method: "POST", token: adminToken, body: { teamName: "Ops", acceptRules: true } })).status, 403);
    assert.equal(await HackathonRegistration.countDocuments({ hackathon: hackathonId, user: admin._id }), 0);
  });

  await check("a user cannot register someone else", async () => {
    const carol = await register("carol");
    const res = await api(`/hackathons/${hackathonId}/register`, {
      method: "POST",
      token: carol.accessToken,
      body: { teamName: "Rockets", acceptRules: true, user: alice.user._id, userId: alice.user._id },
    });
    assert.equal(res.status, 201);
    assert.equal(String(res.body.data.user), String(carol.user._id));
  });

  await check("registration state survives a reload (details API)", async () => {
    const res = await api(`/hackathons/${hackathonId}`, { token: alice.accessToken });
    assert.equal(res.body.data.isRegistered, true);
    assert.equal(res.body.data.userRegistration.teamName, "Rockets");
    assert.equal((await api(`/hackathons/${hackathonId}`)).body.data.isRegistered, false);
  });

  await check("My Hackathons lists only the user's own registrations", async () => {
    const mine = await api("/hackathons/mine", { token: alice.accessToken });
    assert.equal(mine.status, 200);
    const entry = mine.body.data.find((r) => String(r.hackathon._id) === String(hackathonId));
    assert.ok(entry, "registration missing");
    assert.equal(entry.teamName, "Rockets");
    assert.equal(String(entry.roomId), String(roomId));
    assert.equal(mine.body.data.filter((r) => String(r.hackathon._id) === String(hackathonId)).length, 1, "duplicate entry");
    assert.equal((await api("/hackathons/mine")).status, 401);
    const outsider = await register("dave");
    assert.deepEqual((await api("/hackathons/mine", { token: outsider.accessToken })).body.data, []);
  });

  await check("login and /auth/me report the database role, never 'user'", async () => {
    await User.updateOne({ _id: alice.user._id }, { $set: { role: "user" } }); // legacy value
    const me = await api("/auth/me", { token: alice.accessToken });
    assert.equal(me.body.data.role, "student");
    assert.equal(me.body.data.password, undefined);
    const login = await api("/auth/login", {
      method: "POST",
      body: { email: alice.user.email, password: "Password123!", role: "admin" },
    });
    assert.equal(login.body.data.user.role, "student");
    assert.equal((await api("/auth/me", { token: adminToken })).body.data.role, "admin");
  });

  await check("profile updates cannot change the role", async () => {
    await api("/users/update-profile", { method: "PATCH", token: alice.accessToken, body: { role: "admin" } });
    assert.notEqual((await User.findById(alice.user._id)).role, "admin");
  });

  await check("private room: participants see the team list, guests are refused", async () => {
    const res = await api(`/hackathons/rooms/${roomId}`, { token: alice.accessToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.access, "participant");
    assert.equal(res.body.data.participants.length, 3);
    assert.equal(res.body.data.allowedParticipants, undefined);
    assert.equal((await api(`/hackathons/rooms/${roomId}`)).status, 401);
  });

  let submissionId;
  await check("submission with a registered teammate", async () => {
    const res = await api(`/hackathons/rooms/${roomId}/submissions`, {
      method: "POST",
      token: alice.accessToken,
      body: { projectId: project._id, notes: "secret notes", teamMembers: [bob.user._id] },
    });
    assert.equal(res.status, 201);
    submissionId = res.body.data._id;
  });

  await check("publishing needs a completed hackathon; showcase hides pending work", async () => {
    assert.equal((await api(`/admin/rooms/${roomId}/publish`, { method: "PATCH", token: adminToken })).status, 400);
    assert.equal((await api(`/admin/hackathons/${hackathonId}/status`, { method: "PATCH", token: adminToken, body: { status: "completed" } })).status, 200);
    assert.equal((await HackathonRoom.findById(roomId)).status, "completed");
    assert.equal((await api(`/admin/rooms/${roomId}/publish`, { method: "PATCH", token: adminToken })).status, 200);

    const guestRoom = await api(`/hackathons/rooms/${roomId}`);
    assert.equal(guestRoom.body.data.access, "public");
    assert.deepEqual(guestRoom.body.data.participants, []);
    assert.deepEqual((await api(`/hackathons/rooms/${roomId}/submissions`)).body.data, []);
    const showcase = (await api("/hackathons/showcase")).body.data.find((r) => r._id === roomId);
    assert.deepEqual(showcase.submissions, []);
  });

  await check("accepted submissions appear on the showcase without notes", async () => {
    const res = await api(`/admin/submissions/${submissionId}/status`, { method: "PATCH", token: adminToken, body: { status: "accepted" } });
    assert.equal(res.status, 200);
    const showcase = (await api("/hackathons/showcase")).body.data.find((r) => r._id === roomId);
    assert.equal(showcase.submissions.length, 1);
    assert.equal(showcase.submissions[0].notes, undefined);
    assert.equal(showcase.allowedParticipants, undefined);
    const guestSubs = (await api(`/hackathons/rooms/${roomId}/submissions`)).body.data;
    assert.equal(guestSubs[0].notes, undefined);
  });

  await check("unpublish and archive remove public access immediately", async () => {
    await api(`/admin/rooms/${roomId}/unpublish`, { method: "PATCH", token: adminToken });
    assert.equal((await api(`/hackathons/rooms/${roomId}`)).status, 401);
    assert.ok(!(await api("/hackathons/showcase")).body.data.some((r) => r._id === roomId));

    assert.equal((await api(`/admin/rooms/${roomId}/archive`, { method: "PATCH", token: adminToken, body: { archived: true } })).status, 200);
    assert.equal((await api(`/admin/rooms/${roomId}/publish`, { method: "PATCH", token: adminToken })).status, 400);
    assert.equal((await api(`/admin/rooms/${roomId}/archive`, { method: "PATCH", token: adminToken, body: { archived: false } })).status, 200);
  });

  console.log(`\nAll ${passed} checks passed.`);
} catch (error) {
  console.error(`\n✗ Failed after ${passed} passing checks:`, error.message);
  process.exitCode = 1;
} finally {
  await HackathonSubmission.deleteMany({ hackathon: { $in: created.hackathons } });
  await HackathonRegistration.deleteMany({ hackathon: { $in: created.hackathons } });
  await HackathonRoom.deleteMany({ hackathon: { $in: created.hackathons } });
  await Hackathon.deleteMany({ _id: { $in: created.hackathons } });
  await Project.deleteMany({ _id: { $in: created.projects } });
  await User.deleteMany({ _id: { $in: created.users } });
  server.close();
  await mongoose.disconnect();
}
