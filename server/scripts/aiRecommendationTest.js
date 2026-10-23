// AI teammate recommendations (GET /projects/:id/recommendations?ai=1) with Gemini stubbed:
// auth/ownership, exclusions, output validation, error handling and key secrecy.
// Creates and removes its own records. Run against a TEST database only:
//   MONGODB_URI=mongodb://127.0.0.1:27018 node scripts/aiRecommendationTest.js
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

// Stub Gemini: every request to Google goes to `gemini.reply(prompt)` instead of the network.
const realFetch = globalThis.fetch;
const FAKE_KEY = "AIzaFAKE-test-key-never-shown";
const gemini = { calls: 0, lastPrompt: "", lastKey: "", reply: null };
globalThis.fetch = async (url, init) => {
  if (!String(url).startsWith("https://generativelanguage.googleapis.com/")) return realFetch(url, init);
  gemini.calls += 1;
  gemini.lastKey = init.headers["x-goog-api-key"];
  gemini.lastPrompt = JSON.parse(init.body).contents[0].parts[0].text;
  return gemini.reply(JSON.parse(gemini.lastPrompt.split("DATA:\n")[1]));
};
const geminiJson = (output) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] }), { status: 200 });

const server = app.listen(0);
const base = `http://localhost:${server.address().port}/api/v1`;
const get = async (url, token) => {
  const res = await realFetch(base + url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const text = await res.text();
  assert.ok(!text.includes(FAKE_KEY), `API key leaked in response to ${url}`);
  return { status: res.status, body: JSON.parse(text) };
};

const stamp = Date.now();
const users = {};
const projects = [];
let passed = 0;
const ok = (name) => {
  passed += 1;
  console.log(`✓ ${name}`);
};

const makeUser = async (key, extra = {}) => {
  users[key] = await User.create({
    userName: `ai_${key}_${stamp}`,
    fullName: `AI ${key}`,
    email: `ai_${key}_${stamp}@devspotlight.test`,
    password: "Password123!",
    skills: ["React", `only_${key}_${stamp}`],
    bio: `bio of ${key}`,
    ...extra,
  });
  return users[key];
};
const makeProject = async (title) => {
  const project = await Project.create({
    title: `${title} ${stamp}`,
    description: "A study planner",
    userId: users.owner._id,
    requiredSkills: ["React", "Node.js"],
    techStack: ["MongoDB"],
  });
  projects.push(project._id);
  return project;
};
// Opaque id the prompt used for a test user (found via their unique skill).
const opaqueIdOf = (data, key) => data.candidates.find((c) => c.skills.includes(`only_${key}_${stamp}`))?.id;

try {
  for (const key of ["owner", "stranger", "alice", "bob", "member", "pending"]) await makeUser(key);
  await makeUser("suspended", { isSuspended: true });
  await makeUser("banned", { isBanned: true });
  const ownerToken = users.owner.generateAccessToken();
  const main = await makeProject("Main");
  await CollaborationRequest.create({ project: main._id, sender: users.member._id, receiver: users.owner._id, status: "approved" });
  await CollaborationRequest.create({ project: main._id, sender: users.owner._id, receiver: users.pending._id, status: "pending" });
  const url = `/projects/${main._id}/recommendations?ai=1`;

  assert.equal((await get(`/projects/not-an-id/recommendations?ai=1`, ownerToken)).status, 400);
  ok("1. invalid project id is rejected (400)");

  assert.equal((await get(url)).status, 401);
  assert.equal((await get(url, users.stranger.generateAccessToken())).status, 403);
  assert.equal(gemini.calls, 0);
  ok("2. unauthenticated (401) and non-owner (403) are rejected before any AI call");

  delete process.env.GEMINI_API_KEY;
  let res = await get(url, ownerToken);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.ai.source, "unavailable");
  assert.match(res.body.data.ai.message, /no Gemini API key/);
  assert.ok(res.body.data.recommendations.length > 0, "skill-based results still returned");
  assert.equal(gemini.calls, 0);
  ok("3. missing key: clear message, skill-based results still returned, Gemini not called");

  res = await get(`/projects/${main._id}/recommendations`, ownerToken);
  assert.equal(res.body.data.ai, undefined);
  ok("4. plain request (no ?ai=1) never calls Gemini");

  process.env.GEMINI_API_KEY = FAKE_KEY;
  gemini.reply = (data) => {
    const alice = opaqueIdOf(data, "alice");
    const bob = opaqueIdOf(data, "bob");
    return geminiJson({
      recommendations: [
        { candidateId: "c999", relevanceScore: 99, reasons: ["injected"], potentialContribution: "x", complementarySkills: [] },
        { candidateId: users.member._id.toString(), relevanceScore: 98, reasons: ["raw id"], potentialContribution: "x", complementarySkills: [] },
        { candidateId: alice, relevanceScore: 150, reasons: ["Knows React"], potentialContribution: "Frontend", complementarySkills: [`ONLY_ALICE_${stamp}`, "Kubernetes"] },
        { candidateId: alice, relevanceScore: 10, reasons: ["dup"], potentialContribution: "dup", complementarySkills: [] },
        { candidateId: bob, relevanceScore: 60, reasons: ["Also React"], potentialContribution: "Testing", complementarySkills: [] },
      ],
    });
  };
  res = await get(url, ownerToken);
  const ai = res.body.data.ai;
  assert.equal(ai.source, "gemini");
  assert.equal(gemini.lastKey, FAKE_KEY);
  assert.deepEqual(ai.recommendations.map((r) => r.userName), [users.alice.userName, users.bob.userName]);
  ok("5. unknown/injected ids and raw DB ids dropped, duplicates removed");

  const [alice] = ai.recommendations;
  assert.equal(alice.aiScore, 100);
  assert.deepEqual(alice.complementarySkills, [`only_alice_${stamp}`]);
  assert.deepEqual(alice.matchingSkills, ["React"]);
  assert.equal(alice.matchPercentage, 50);
  assert.equal(alice.email, undefined);
  ok("6. merged with DB data: score clamped, invented skills dropped, skill-match % kept, no email");

  const sent = gemini.lastPrompt;
  const sentData = JSON.parse(sent.split("DATA:\n")[1]);
  for (const key of ["owner", "member", "pending", "suspended", "banned"]) {
    assert.equal(opaqueIdOf(sentData, key), undefined, `${key} was sent to Gemini as a candidate`);
  }
  // Owner + approved member skills are the "current team".
  assert.ok(sentData.currentTeamSkills.includes(`only_member_${stamp}`));
  assert.ok(!sent.includes("@devspotlight.test") && !sent.includes(users.alice.userName) && !sent.includes(String(users.alice._id)));
  assert.ok(!sent.includes(FAKE_KEY));
  ok("7. owner, members, pending, suspended and banned users never sent; no emails/names/ids/key in prompt");

  const callsBefore = gemini.calls;
  res = await get(url, ownerToken);
  assert.equal(res.body.data.ai.cached, true);
  assert.equal(gemini.calls, callsBefore);
  ok("8. repeat request served from cache");

  const other = await makeProject("Errors");
  const otherUrl = `/projects/${other._id}/recommendations?ai=1`;
  const cases = [
    ["429 quota", () => new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED", message: FAKE_KEY } }), { status: 429 }), /free-tier limit/],
    ["invalid key", () => new Response(JSON.stringify({ error: { status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } }), { status: 400 }), /key was rejected/],
    ["malformed output", () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }), { status: 200 }), /unreadable/],
    ["wrong shape", () => geminiJson({ nope: true }), /unexpected answer/],
    ["network error", () => Promise.reject(new TypeError("fetch failed")), /Couldn't reach/],
    ["timeout", () => Promise.reject(Object.assign(new Error("t"), { name: "TimeoutError" })), /too long/],
  ];
  for (const [label, reply, pattern] of cases) {
    gemini.reply = reply;
    res = await get(otherUrl, ownerToken);
    assert.equal(res.status, 200, label);
    assert.equal(res.body.data.ai.source, "unavailable", label);
    assert.match(res.body.data.ai.message, pattern, label);
  }
  ok("9. 429, invalid key, malformed output, network error and timeout give clear messages, key never echoed");

  const solo = await makeProject("Solo");
  const callsBeforeSolo = gemini.calls;
  // Make every other student ineligible for this project by sending them pending requests.
  const everyone = await User.find({ _id: { $ne: users.owner._id } }).select("_id").lean();
  await CollaborationRequest.insertMany(everyone.map((u) => ({ project: solo._id, sender: users.owner._id, receiver: u._id, status: "pending" })));
  res = await get(`/projects/${solo._id}/recommendations?ai=1`, ownerToken);
  assert.equal(res.body.data.ai.source, "none");
  assert.equal(gemini.calls, callsBeforeSolo);
  ok("10. no eligible candidates: friendly message, Gemini not called");

  console.log(`\nAll ${passed} cases passed.`);
} catch (error) {
  console.error(`\n✗ Failed after ${passed} passing cases:`, error.message);
  process.exitCode = 1;
} finally {
  await CollaborationRequest.deleteMany({ project: { $in: projects } });
  await Project.deleteMany({ _id: { $in: projects } });
  await User.deleteMany({ email: new RegExp(`_${stamp}@devspotlight\\.test$`) });
  server.close();
  await mongoose.disconnect();
}
