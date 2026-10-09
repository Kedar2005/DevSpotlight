# QA scripts

- `api-test.mjs` – 60 checks against the REST API (forgot/reset password, edit project, collaboration, duplicates, authorization). Run with the backend up: `BASE=http://localhost:8000/api/v1 node api-test.mjs`
- `ui-test.mjs` – drives the real UI in Chromium with Playwright (needs `npm i -D playwright` and the frontend running on :5173).
- `screenshots/` – captures from the UI run.

Run these against a TEST database – they create users and projects.
