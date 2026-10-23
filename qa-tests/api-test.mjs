const BASE = process.env.BASE || "http://localhost:8001/api/v1";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  PASS", name); }
  else { fail++; console.log("  FAIL", name, extra); }
};
const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {}; try { json = await res.json(); } catch {}
  return { status: res.status, ...json };
};
const run = Date.now().toString().slice(-6);
const mk = (n) => ({ userName: `${n}${run}`, fullName: `User ${n}`, email: `${n}${run}@test.dev`, password: "oldpassword1" });

console.log("\nTEST 1 — Forgot password");
const A = mk("alice"), B = mk("bob");
let r = await call("POST", "/auth/register", { body: A });
ok("register A -> 201", r.status === 201, JSON.stringify(r));
const tokenA = r.data?.accessToken, idA = r.data?.user?._id;
r = await call("POST", "/auth/register", { body: B });
const tokenB = r.data?.accessToken, idB = r.data?.user?._id;
r = await call("POST", "/auth/login", { body: { email: A.email, password: A.password } });
ok("login with old password -> 200", r.status === 200);
r = await call("POST", "/auth/forgot-password", { body: {} });
ok("forgot without email -> 400", r.status === 400);
r = await call("POST", "/auth/forgot-password", { body: { email: "nobody@nowhere.dev" } });
ok("forgot unknown email -> 200 (no enumeration), no token", r.status === 200 && !r.data?.dev, JSON.stringify(r));
await new Promise((res) => setTimeout(res, 1100)); // iat has 1s resolution
r = await call("POST", "/auth/forgot-password", { body: { email: A.email } });
ok("forgot known email -> 200", r.status === 200, JSON.stringify(r));
ok("says email NOT sent (no provider)", r.data?.deliveryConfigured === false && /no email was sent/i.test(r.message), r.message);
const resetToken = r.data?.dev?.resetToken;
ok("dev reset token returned in dev mode", /^[a-f0-9]{64}$/.test(resetToken || ""));
r = await call("POST", "/auth/reset-password", { body: { token: "a".repeat(64), password: "newpassword1" } });
ok("reset with wrong token -> 400", r.status === 400);
r = await call("POST", "/auth/reset-password", { body: { token: resetToken, password: "short" } });
ok("reset with short password -> 400", r.status === 400);
r = await call("POST", "/auth/reset-password", { body: { token: resetToken, password: "newpassword1", confirmPassword: "different1" } });
ok("reset with mismatched confirm -> 400", r.status === 400);
await new Promise((res) => setTimeout(res, 1100));
r = await call("POST", "/auth/reset-password", { body: { token: resetToken, password: "newpassword1", confirmPassword: "newpassword1" } });
ok("reset with valid token -> 200", r.status === 200, JSON.stringify(r));
r = await call("POST", "/auth/reset-password", { body: { token: resetToken, password: "another-pass1" } });
ok("token cannot be reused -> 400", r.status === 400);
r = await call("POST", "/auth/login", { body: { email: A.email, password: A.password } });
ok("old password rejected", r.status === 401);
r = await call("POST", "/auth/login", { body: { email: A.email, password: "newpassword1" } });
ok("login with new password -> 200", r.status === 200);
const newTokenA = r.data?.accessToken;
r = await call("GET", "/auth/me", { token: tokenA });
ok("session issued before reset is rejected -> 401", r.status === 401, JSON.stringify(r));
r = await call("GET", "/auth/me", { token: newTokenA });
ok("new session works -> 200", r.status === 200);

console.log("\nTEST 2 — Edit project");
r = await call("POST", "/projects", { token: newTokenA, body: { title: "Alpha", description: "First version", techStack: "React, Node", category: "Web app", githubLink: "https://github.com/a/alpha" } });
ok("A creates project -> 201", r.status === 201, JSON.stringify(r));
const pid = r.data?._id;
r = await call("PUT", `/projects/${pid}`, { token: newTokenA, body: { title: "Alpha v2", description: "Edited description", techStack: "React, Node, MongoDB", category: "AI / ML", githubLink: "https://github.com/a/alpha2", liveLink: "https://alpha.example.com" } });
ok("A edits via PUT -> 200", r.status === 200, JSON.stringify(r));
ok("response contains updated project", r.data?.title === "Alpha v2" && r.data?.category === "AI / ML" && r.data?.techStack?.length === 3);
r = await call("PATCH", `/projects/${pid}`, { token: newTokenA, body: { description: "Edited via PATCH" } });
ok("A edits via PATCH -> 200", r.status === 200 && r.data?.description === "Edited via PATCH");
r = await call("GET", `/projects/${pid}`);
ok("changes persist on fresh GET", r.data?.title === "Alpha v2" && r.data?.liveLink === "https://alpha.example.com/" || r.data?.liveLink === "https://alpha.example.com", JSON.stringify(r.data));
r = await call("PUT", `/projects/${pid}`, { token: tokenB, body: { title: "Hacked" } });
ok("B edits A's project -> 403", r.status === 403, JSON.stringify(r));
r = await call("PUT", `/projects/${pid}`, { body: { title: "Hacked" } });
ok("unauthenticated edit -> 401", r.status === 401);
r = await call("PUT", `/projects/${pid}`, { token: newTokenA, body: { title: "  " } });
ok("blank title -> 400", r.status === 400);
r = await call("PUT", `/projects/${pid}`, { token: newTokenA, body: { githubLink: "javascript:alert(1)" } });
ok("javascript: URL rejected -> 400", r.status === 400);
r = await call("PUT", `/projects/not-an-id`, { token: newTokenA, body: { title: "x" } });
ok("invalid id -> 400", r.status === 400);
r = await call("GET", `/projects/${pid}`);
ok("B's attempt did not change data", r.data?.title === "Alpha v2");

console.log("\nTEST 3 — Collaboration (approve)");
r = await call("POST", "/collaboration-requests", { body: { projectId: pid } });
ok("unauthenticated request -> 401", r.status === 401);
r = await call("POST", "/collaboration-requests", { token: newTokenA, body: { projectId: pid } });
ok("A requests own project -> 400", r.status === 400, JSON.stringify(r));
r = await call("POST", "/collaboration-requests", { token: tokenB, body: { projectId: "bad" } });
ok("invalid project id -> 400", r.status === 400);
r = await call("POST", "/collaboration-requests", { token: tokenB, body: { projectId: "64b7f0f0f0f0f0f0f0f0f0f0" } });
ok("unknown project -> 404", r.status === 404);
r = await call("POST", "/collaboration-requests", { token: tokenB, body: { projectId: pid, message: "I'd love to help with the UI", sender: idA } });
ok("B requests collaboration -> 201", r.status === 201, JSON.stringify(r));
const reqId = r.data?._id;
ok("status = pending", r.data?.status === "pending");
ok("sender taken from JWT (not body)", String(r.data?.sender?._id) === idB, JSON.stringify(r.data?.sender));
ok("receiver is project owner", String(r.data?.receiver?._id) === idA);
ok("sender/project populated", r.data?.sender?.userName && r.data?.project?.title === "Alpha v2");

console.log("\nTEST 4 — Duplicate request");
r = await call("POST", "/collaboration-requests", { token: tokenB, body: { projectId: pid } });
ok("duplicate pending -> 409", r.status === 409, JSON.stringify(r));
const [d1, d2] = await Promise.all([1, 2].map(() => call("POST", "/collaboration-requests/project/" + pid, { token: tokenB })));
ok("parallel duplicates both blocked (409)", d1.status === 409 && d2.status === 409);

console.log("\nTEST 3 (cont.) — owner views and approves");
r = await call("GET", "/collaboration-requests/received", { token: newTokenA });
ok("A sees incoming request", r.status === 200 && r.data.some((x) => x._id === reqId && x.status === "pending"), JSON.stringify(r));
r = await call("GET", "/collaboration-requests/received", { token: tokenB });
ok("B has no incoming requests", r.status === 200 && r.data.length === 0);
r = await call("GET", "/collaboration-requests/sent", { token: tokenB });
ok("B sees sent request as pending", r.data?.some((x) => x._id === reqId && x.status === "pending"));
r = await call("PUT", `/collaboration-requests/${reqId}/approve`, { token: tokenB });
ok("sender cannot approve own request -> 403", r.status === 403, JSON.stringify(r));
r = await call("PUT", `/collaboration-requests/${reqId}/reject`, { token: tokenB });
ok("sender cannot reject -> 403", r.status === 403);
r = await call("PUT", `/collaboration-requests/${reqId}/approve`, { token: newTokenA });
ok("owner approves -> 200 approved", r.status === 200 && r.data?.status === "approved", JSON.stringify(r));
r = await call("PUT", `/collaboration-requests/${reqId}/reject`, { token: newTokenA });
ok("cannot change a decided request -> 409", r.status === 409);
r = await call("GET", "/collaboration-requests/sent", { token: tokenB });
ok("B sees Approved", r.data?.find((x) => x._id === reqId)?.status === "approved");
r = await call("POST", "/collaboration-requests", { token: tokenB, body: { projectId: pid } });
ok("approved collaborator can't re-request -> 409", r.status === 409);
r = await call("GET", `/projects/${pid}`, { token: tokenB });
ok("project detail shows B's collaboration status", r.data?.collaboration?.status === "approved");
ok("project detail lists B as collaborator", r.data?.collaborators?.some((c) => String(c._id) === idB));

console.log("\nTEST 3b — Reject flow (legacy PATCH route + /contributions alias)");
r = await call("POST", "/projects", { token: newTokenA, body: { title: "Beta", description: "Second" } });
const pid2 = r.data?._id;
r = await call("POST", `/contributions/project/${pid2}`, { token: tokenB, body: { message: "hi" } });
ok("legacy /contributions path works -> 201", r.status === 201);
const reqId2 = r.data?._id;
r = await call("PATCH", `/collaboration-requests/${reqId2}/reject`, { token: newTokenA });
ok("owner rejects -> 200 rejected", r.status === 200 && r.data?.status === "rejected", JSON.stringify(r));
r = await call("GET", "/collaboration-requests/sent?status=rejected", { token: tokenB });
ok("B sees Rejected (status filter)", r.data?.length === 1 && r.data[0].status === "rejected");
r = await call("POST", "/collaboration-requests", { token: tokenB, body: { projectId: pid2 } });
ok("after rejection a new request is allowed -> 201", r.status === 201, JSON.stringify(r));
r = await call("DELETE", `/collaboration-requests/${r.data?._id}`, { token: newTokenA });
ok("owner cannot use withdraw endpoint -> 403", r.status === 403);
r = await call("GET", "/collaboration-requests/received?status=bogus", { token: newTokenA });
ok("bad status filter -> 400", r.status === 400);
r = await call("GET", `/collaboration-requests/project/${pid2}`, { token: tokenB });
ok("non-owner can't list project requests -> 403", r.status === 403);

console.log("\nEXTRA — user endpoints");
r = await call("GET", "/users/my-projects", { token: newTokenA });
ok("my-projects returns A's 2 projects", r.status === 200 && r.data?.length === 2, JSON.stringify(r).slice(0, 200));
r = await call("GET", "/users/my-contributions", { token: tokenB });
ok("my-contributions returns approved project", r.status === 200 && r.data?.length === 1);
r = await call("GET", `/users/profile/${A.userName}`);
ok("public profile works", r.status === 200 && r.data?.projects?.length === 2 && !r.data?.user?.email);
r = await call("GET", `/projects?category=${encodeURIComponent("AI / ML")}`);
ok("category filter works", r.data?.projects?.some((p) => p._id === pid));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
