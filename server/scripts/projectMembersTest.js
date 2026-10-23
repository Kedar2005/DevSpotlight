// Project details and workspace must list the same members: owner once, every approved
// collaborator once (whichever side of the request they were on), nobody pending/rejected.
// Creates and removes its own records. Run against a TEST database only:
//   MONGODB_URI=mongodb://127.0.0.1:27017 node scripts/projectMembersTest.js
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
const { CollaborationRequest } = await import("../src/models/collaborationRequest.model.js");

const server = app.listen(0);
const base = `http://localhost:${server.address().port}/api/v1`;
const get = async (url, token) => {
  const res = await fetch(base + url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, body: await res.json() };
};

const stamp = Date.now();
const users = {};
const projects = [];
let passed = 0;

const makeUser = async (key) => {
  users[key] = await User.create({
    userName: `pm_${key}_${stamp}`,
    fullName: `PM ${key}`,
    email: `pm_${key}_${stamp}@devspotlight.test`,
    password: "Password123!",
  });
  return users[key];
};

const makeProject = async (title, requests = []) => {
  const project = await Project.create({ title: `${title} ${stamp}`, description: "test", userId: users.owner._id });
  projects.push(project._id);
  for (const [sender, receiver, status] of requests) {
    await CollaborationRequest.create({ project: project._id, sender: sender._id, receiver: receiver._id, status });
  }
  return project;
};

// Member names from both APIs, owner first.
const membersOf = async (project) => {
  const token = users.owner.generateAccessToken();
  const details = await get(`/projects/${project._id}`);
  const workspace = await get(`/workspace/${project._id}`, token);
  assert.equal(details.status, 200);
  assert.equal(workspace.status, 200);
  const fromDetails = [details.body.data.userId?.userName ?? details.body.data.owner?.userName, ...details.body.data.collaborators.map((c) => c.userName)];
  const fromWorkspace = workspace.body.data.members.map((m) => m.userName);
  assert.deepEqual(fromDetails, fromWorkspace, "project details and workspace disagree");
  assert.equal(new Set(fromDetails).size, fromDetails.length, "a member is listed twice");
  assert.ok(details.body.data.collaborators.every((c) => c.email === undefined), "email leaked publicly");
  return fromDetails;
};

const check = async (name, project, expectedKeys) => {
  const names = await membersOf(project);
  assert.deepEqual(names, expectedKeys.map((k) => users[k].userName), name);
  passed += 1;
  console.log(`✓ ${name}`);
};

try {
  for (const key of ["owner", "asker", "invitee", "second", "pending", "rejected", "ghost"]) await makeUser(key);
  const { owner, asker, invitee, second, pending, rejected, ghost } = users;

  await check("1. owner only", await makeProject("Solo"), ["owner"]);
  await check("2. owner + one collaborator who asked to join", await makeProject("One", [[asker, owner, "approved"]]), ["owner", "asker"]);
  await check(
    "3. owner + several collaborators, incl. one the owner invited",
    await makeProject("Many", [
      [asker, owner, "approved"],
      [owner, invitee, "approved"],
      [second, owner, "approved"],
    ]),
    ["owner", "asker", "invitee", "second"]
  );
  // Contributions: the invitee sees the project, the owner never sees their own project.
  const contributedTitles = async (user) =>
    (await get("/users/my-contributions", user.generateAccessToken())).body.data.map((p) => p.title);
  assert.ok((await contributedTitles(invitee)).includes(`Many ${stamp}`), "invitee missing contributed project");
  assert.ok((await contributedTitles(asker)).includes(`Many ${stamp}`), "asker missing contributed project");
  assert.ok(!(await contributedTitles(owner)).some((t) => t.endsWith(` ${stamp}`)), "owner listed as contributor");
  passed += 1;
  console.log("✓ 3b. my-contributions counts invites and never the owner's own project");

  // Workspace tasks can only be assigned to team members.
  const many = await Project.findOne({ title: `Many ${stamp}` });
  const postTask = (assignedTo) =>
    fetch(`${base}/workspace/${many._id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${owner.generateAccessToken()}` },
      body: JSON.stringify({ title: "QA task", assignedTo }),
    });
  assert.equal((await postTask(String(pending._id))).status, 400, "outsider accepted as assignee");
  assert.equal((await postTask(String(invitee._id))).status, 201, "invited member rejected as assignee");
  assert.equal((await postTask("")).status, 201, "unassigned task rejected");
  passed += 1;
  console.log("✓ 3c. tasks can only be assigned to team members");

  await check("4. pending request is not a member", await makeProject("Pending", [[pending, owner, "pending"], [owner, invitee, "approved"]]), ["owner", "invitee"]);
  await check("5. rejected request is not a member", await makeProject("Rejected", [[rejected, owner, "rejected"], [owner, rejected, "rejected"]]), ["owner"]);
  await check(
    "6. same collaborator through two approved requests is listed once",
    await makeProject("Twice", [[asker, owner, "approved"], [owner, asker, "approved"]]),
    ["owner", "asker"]
  );

  const ghostProject = await makeProject("Ghost", [[ghost, owner, "approved"], [owner, invitee, "approved"]]);
  await User.deleteOne({ _id: ghost._id });
  delete users.ghost;
  await check("7. deleted collaborator profile is skipped", ghostProject, ["owner", "invitee"]);

  console.log(`\nAll ${passed} cases passed.`);
} catch (error) {
  console.error(`\n✗ Failed after ${passed} passing cases:`, error.message);
  process.exitCode = 1;
} finally {
  await CollaborationRequest.deleteMany({ project: { $in: projects } });
  await mongoose.connection.db.collection("workspacetasks").deleteMany({ project: { $in: projects } });
  await Project.deleteMany({ _id: { $in: projects } });
  await User.deleteMany({ email: new RegExp(`_${stamp}@devspotlight\\.test$`) });
  server.close();
  await mongoose.disconnect();
}
