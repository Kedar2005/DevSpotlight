// Sign-up validation, login error message, change-password and session handling.
// Creates and removes its own users. Run against a TEST database only:
//   MONGODB_URI=mongodb://127.0.0.1:27017 node scripts/authTest.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import assert from "node:assert/strict";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const { DB_NAME } = await import("../src/constants.js");
await mongoose.connect(`${process.env.MONGODB_URI.trim().replace(/\/$/, "")}/${DB_NAME}`);
const { app } = await import("../src/app.js");
const { User } = await import("../src/models/user.model.js");

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
const email = `auth_${stamp}@devspotlight.test`;
let passed = 0;
const check = async (name, fn) => {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

try {
  const valid = { userName: `auth_${stamp}`, fullName: "Auth Test", email, password: "Password123!" };

  await check("sign-up rejects bad username, email and short password", async () => {
    for (const [field, value] of [
      ["userName", "@bad"],
      ["userName", "ab"],
      ["userName", "has space"],
      ["email", "not-an-email"],
      ["password", "short"],
    ]) {
      const res = await api("/auth/register", { method: "POST", body: { ...valid, [field]: value } });
      assert.equal(res.status, 400, `${field}=${value}`);
    }
    assert.equal(await User.countDocuments({ email }), 0);
  });

  let token;
  await check("valid sign-up creates a student", async () => {
    const res = await api("/auth/register", { method: "POST", body: { ...valid, userName: valid.userName.toUpperCase() } });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.userName, valid.userName);
    assert.equal(res.body.data.user.role, "student");
    token = res.body.data.accessToken;
  });

  await check("unknown email and wrong password give the same login error", async () => {
    const unknown = await api("/auth/login", { method: "POST", body: { email: `nobody_${stamp}@x.test`, password: "Password123!" } });
    const wrong = await api("/auth/login", { method: "POST", body: { email, password: "WrongPass999" } });
    assert.equal(unknown.status, 401);
    assert.equal(wrong.status, 401);
    assert.equal(unknown.body.message, "Invalid email or password");
    assert.equal(wrong.body.message, unknown.body.message);
  });

  await check("change-password validates input", async () => {
    const url = "/users/change-password";
    assert.equal((await api(url, { method: "PATCH", token, body: { oldPassword: "WrongPass999", newPassword: "NewPassword1" } })).status, 400);
    assert.equal((await api(url, { method: "PATCH", token, body: { oldPassword: "Password123!", newPassword: "short" } })).status, 400);
    assert.equal((await api(url, { method: "PATCH", token, body: { oldPassword: "Password123!", newPassword: "Password123!" } })).status, 400);
    assert.equal((await api(url, { method: "PATCH", body: { oldPassword: "Password123!", newPassword: "NewPassword1" } })).status, 401);
  });

  await check("change-password signs out old sessions and keeps this one", async () => {
    // A second, older session. Wait a second so its token is strictly older than the change.
    const other = (await api("/auth/login", { method: "POST", body: { email, password: "Password123!" } })).body.data.accessToken;
    await new Promise((r) => setTimeout(r, 1100));

    const res = await api("/users/change-password", {
      method: "PATCH",
      token,
      body: { oldPassword: "Password123!", newPassword: "NewPassword1" },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.accessToken);
    assert.ok(!JSON.stringify(res.body).includes("NewPassword1"), "password echoed back");
    assert.ok(!JSON.stringify(res.body).includes("$2b$"), "hash echoed back");

    assert.equal((await api("/auth/me", { token: other })).status, 401, "old session still works");
    assert.equal((await api("/auth/me", { token: res.body.data.accessToken })).status, 200, "new session rejected");
    const stored = await User.findOne({ email });
    assert.notEqual(stored.password, "NewPassword1");
    assert.ok(await stored.isPasswordCorrect("NewPassword1"));
    assert.equal((await api("/auth/login", { method: "POST", body: { email, password: "Password123!" } })).status, 401);
    assert.equal((await api("/auth/login", { method: "POST", body: { email, password: "NewPassword1" } })).status, 200);
  });

  await check("older usernames can still edit the rest of their profile", async () => {
    await User.updateOne({ email }, { $set: { userName: `@legacy${stamp}` } });
    const login = await api("/auth/login", { method: "POST", body: { email, password: "NewPassword1" } });
    const t = login.body.data.accessToken;
    const keep = await api("/users/update-profile", { method: "PATCH", token: t, body: { userName: `@legacy${stamp}`, bio: "Updated bio" } });
    assert.equal(keep.status, 200, JSON.stringify(keep.body));
    const change = await api("/users/update-profile", { method: "PATCH", token: t, body: { userName: "@stillbad" } });
    assert.equal(change.status, 400);
  });

  await check("delete-profile route is gone", async () => {
    const res = await fetch(`${base}/users/delete-profile`, { method: "DELETE" });
    assert.equal(res.status, 404);
    assert.equal(await User.countDocuments({ email }), 1);
  });

  console.log(`\nAll ${passed} checks passed.`);
} catch (error) {
  console.error(`\n✗ Failed after ${passed} passing checks:`, error.message);
  process.exitCode = 1;
} finally {
  await User.deleteMany({ email });
  server.close();
  await mongoose.disconnect();
}
