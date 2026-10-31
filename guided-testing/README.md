# Guided Testing — Frontend

The client for the guided testing app. A tester picks their name, gets the test scripts
assigned to them, works through each task one at a time answering **pass / fail**, writes
up anything that broke, and the report is uploaded to the Django server. At the end they
get a summary of the run.

Plain HTML, CSS and JavaScript. No build step, no `npm install`, no framework — just
Python to serve the files.

---

## Contents

1. [What you need](#1-what-you-need)
2. [Quick start — demo mode](#2-quick-start--demo-mode)
3. [Running against the real server](#3-running-against-the-real-server)
4. [Using the app](#4-using-the-app)
5. [Troubleshooting](#5-troubleshooting)
6. [Project structure](#6-project-structure)
7. [Notes for recording the video](#7-notes-for-recording-the-video)

---

## 1. What you need

- **Python 3.9+** — only to serve static files. Check with:

  ```powershell
  python --version
  ```

- **A modern browser** — Chrome, Edge, Firefox or Safari.

- **Optional:** the Django backend running, if you want real data (see section 3).

You do **not** need Node.js, npm, or any package installs for the frontend.

---

## 2. Quick start — demo mode

This runs the whole app with bundled sample data. No database, no server, no setup.
**This is the easiest way to record the video.**

1. Open a terminal in the `guided-testing` folder (the one with `index.html` in it).

2. Start the local server:

   ```powershell
   python serve.py
   ```

   You should see:

   ```
   Guided Testing running at http://127.0.0.1:5173/
   Press Ctrl+C to stop.
   ```

3. Open <http://127.0.0.1:5173/> in your browser.

> **Windows users:** you can also double-click `run.cmd`.

> **Do not** open `index.html` by double-clicking it. Browsers block JavaScript modules
> loaded from `file://` URLs, so you will get a blank page. Always use `python serve.py`.

> **Why not `python -m http.server`?** On Windows it serves `.js` files with the wrong
> content type, and the browser refuses to load them. `serve.py` fixes that.

To stop the server, press `Ctrl+C` in the terminal.

If port 5173 is already taken, pick another:

```powershell
python serve.py 5174
```

The demo data is reset with the **Reset demo data** link in the footer, or by clearing
site data in the browser.

---

## 3. Running against the real server

The frontend talks to the Django REST API described in the backend guide. Both run at the
same time, in two terminals.

### Step 1 — start the backend

Follow the backend setup guide (MySQL, virtualenv, `.env`, migrations). Then:

```powershell
cd server
venv\Scripts\activate
python manage.py runserver
```

It should print:

```
Starting development server at http://127.0.0.1:8000/
```

Leave that terminal running.

### Step 2 — start the frontend

In a second terminal:

```powershell
cd guided-testing
python serve.py
```

### Step 3 — point the frontend at the backend

Open the app with `?mode=live`:

```
http://127.0.0.1:5173/?mode=live
```

The footer will read **Connected to http://127.0.0.1:8000/api**. If the tester list appears,
you're done.

To make live mode the default instead of passing the URL every time, edit
`src/config.js`:

```js
MOCK: false,
BASE_URL: 'http://127.0.0.1:8000/api',
```

You can also override the address without editing files, which is handy if the backend is
on another machine on the same network:

```
http://127.0.0.1:5173/?mode=live&api=http://192.168.1.20:8000/api
```

> **Note:** the backend in `server.zip` had four bugs that stopped live mode working end
> to end — two routes and two serializers pointed at the wrong models, and the
> `BugReports` table had no `id` column. All four are **fixed** in
> `C:\Users\ashis\Downloads\server`, and live mode was verified end to end after the fix.
> What changed, and how it was tested, is in
> [`docs/backend-integration.md`](docs/backend-integration.md#backend-fixes-already-applied).

### Step 4 — allow the browser to talk to Django (CORS)

The frontend is on port 5173 and Django is on port 8000, so the browser treats them as
different origins. Without this step the app shows a connection error and the browser
console says something about **CORS**.

**Already done** in `C:\Users\ashis\Downloads\server`. If you are setting up a fresh copy
of the backend, it needs:

In the backend's virtualenv:

```powershell
pip install django-cors-headers
```

In `config/settings.py`:

```python
INSTALLED_APPS = [
    # ...
    "corsheaders",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",   # must be near the top
    # ... the rest
]

CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]
```

Restart `runserver`. This is a backend change — mention it to whoever owns the server so it
lands in the repo.

---

## 4. Using the app

### Pick a tester

On load you choose who you are. This is **not** a login — it just selects which tester's
assigned scripts to show. (Real authentication is future work.)

### Pick a script

You see every test script assigned to that tester, with its description and task count.
Press **Start**.

### Work through the tasks

Each screen shows one task:

- the **description** of what to do
- the **expected result**
- two buttons: **Yes, it passed** and **No, it failed**

Keyboard: **Y** = passed, **N** = failed, **Esc** = close the failure form.

**On pass** it moves straight to the next task.

**On fail** a form appears:

1. **What went wrong?** — describe what you saw. The more specific the better.
2. **Was this a critical failure?** — Yes or No.
3. **Submit report** — uploads it.

Before the report is saved it is checked for quality. If it's too thin, the app says so and
lists what's missing (for example *"Evidence is thin"* or *"Missing context"*), and you can
either **Add detail** or **Submit anyway**.

If the failure was marked **critical**, the run ends immediately and the remaining tasks are
recorded as skipped.

### Summary

At the end you get:

- passed / failed / skipped counts and the duration
- every task with its result, timestamp and any notes you wrote
- flags for critical failures and report quality scores

**Print / save as PDF** uses the browser's print dialog if you need a copy for the video or
a report. **Return to home** goes back to the tester picker.

### Import test scripts from a file

On the tester picker, press **Import test scripts…**. This is how you load a whole batch of
scripts without typing them into the Django admin.

Pick a `.json` file (or drop it on the box). The file is checked **before** anything is
written, so a broken file creates nothing. You then see a preview of what will be created
and press **Import**.

**The file format**

```json
{
  "Testers": ["Steve", "Bob", "Sarah"],
  "Tests": [
    {
      "Assigned": "Steve",
      "Tasks": [
        { "Description": "Open App", "Expected": "Should Open to Homepage" }
      ]
    },
    {
      "Assigned": "Bob",
      "Tasks": [
        { "Description": "Enter a valid password and tap Log in", "Expected": "Home dashboard loads" },
        { "Description": "Enter an invalid password and tap Log in", "Expected": "Error reads \"Invalid credentials\"" }
      ]
    }
  ]
}
```

Rules:

- `Tests` is a **list**. A single object is accepted with a warning, but a list is what you
  should write. (Keys are matched case-insensitively, so `testers` / `assigned` also work.)
- `Assigned` must be a name from `Testers`. If the file has a `Testers` list and an
  `Assigned` value isn't in it, the import is rejected.
- Script titles are generated automatically: **Test Script 1**, **Test Script 2**, and so
  on, continuing from the highest existing `Test Script N` so a second import doesn't
  create duplicates.
- Testers are matched by name (case-insensitive). Any name that doesn't exist yet is
  **created**. The `Testers` list is the roster, so it's also the best place to list people
  who have no scripts yet.
- `Description` is required. A missing `Expected` is only a warning — that task is created
  with the text *"No expected result provided."*

Use **Download an example file** on the import screen to get a working starter file.

In **demo mode** the import writes into the in-memory demo data, so it resets when you
reload the page. Against the real server it writes real rows.

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Blank page, console says *"Failed to load module script … MIME type text/plain"* | Opened with `file://` or used `python -m http.server` on Windows | Use `python serve.py` |
| *"Cannot reach the server at http://127.0.0.1:8000/api"* | Django isn't running, or the URL is wrong | Start `python manage.py runserver`; check `BASE_URL` |
| Browser console shows a **CORS** error | `django-cors-headers` not installed/configured | See Step 4 above |
| *"GET /test_scripts/ failed (404)"* | Missing trailing slash, or wrong prefix | Django needs `/api/test_scripts/`; set `BASE_URL` to end in `/api` |
| Tester list is empty | No testers in the database | Run `mock_data.sql`, or add rows through the admin |
| Script list is empty for a tester | No scripts with `assigned = <that tester's id>` | Check the `assigned` field on `test_scripts` |
| Scripts load but the run screen has no tasks | No `tests` rows with `script_id = <script id>` | Add tests for that script |
| Tester names appear as "Tester 1", "Tester 2" with a **Backend warning** banner | `/api/testers/` is returning the wrong data | Re-apply fix 1 in `docs/backend-integration.md` → Backend fixes |
| Failure submit returns **400** with `script`/`ordinal` required | `/api/bug_reports/` is routed to the tests view | Re-apply fix 1 in `docs/backend-integration.md` → Backend fixes |
| Failure submit returns **500** | `BugReports` table / serializer mismatch | Re-apply fixes 2–3, and run `UPGRADE_DB.sql` on an old database |
| Failure submit returns 400 | Field names don't match the model | See `docs/backend-integration.md` → Field mapping |
| Failure submit returns 403 | Django CSRF protection is on for that view | Ask the backend owner to allow this endpoint, or add the CSRF token |
| Import says *"Not valid JSON"* | Missing comma or brace — the parser reports the line | Fix the file; the message includes the position |
| Import rejects an `Assigned` name | That name isn't in the file's `Testers` list | Add the name to `Testers`, or fix the spelling |
| Import fails with **400** `{"last_name":["This field may not be blank."]}` | Single-word names like `"Steve"` send an empty `last_name` | Backend fix 5 in `docs/backend-integration.md` → Backend fixes |
| Import failed halfway | The API writes one row at a time with no rollback | Rows created before the failure stay; fix the cause and import the rest, or delete the partial rows in the admin |
| Port 5173 in use | Another server is running | `python serve.py 5174` |
| `python` not found | Python not on PATH | Reinstall Python and tick "Add to PATH" |

If something else goes wrong, open the browser dev tools (`F12`) → **Console** and
**Network** tabs. The failing request and Django's response body will be right there.

---

## 6. Project structure

```
guided-testing/
├── index.html              page shell (top bar, toast, footer)
├── run.cmd                 Windows shortcut for the dev server
├── serve.py                static server with correct MIME types
├── assets/
│   └── styles.css          all styling
├── src/
│   ├── config.js           mock/live switch, thresholds, policy flags
│   ├── main.js             boot + view switching
│   ├── store.js            app state, navigation, run progression
│   ├── api.js              the only file that talks to the server
│   ├── assessment.js       report-quality heuristic
│   ├── importer.js         parses and validates the import .json
│   ├── mock-data.js        demo testers and scripts
│   ├── ui.js               small DOM/formatting helpers
│   └── views/
│       ├── testerSelect.js
│       ├── testList.js
│       ├── runTest.js
│       ├── summary.js
│       └── importScripts.js   the import screen
└── docs/
    └── backend-integration.md   endpoint contract + field mapping
```

If you only ever run the app, you can ignore everything except `serve.py` and `index.html`.

---

## 7. Notes for recording the video

A short path that shows every feature:

1. Load the app (demo mode is fine) — pick **Steve**.
2. Start **TC-101 Onboarding smoke test**.
3. Pass the first task with **Y**.
4. Fail the second task with **N**, type a vague note like `it broke`, submit — show the
   *"needs more detail"* panel, then **Add detail** and write a proper report. Submit.
5. Fail the next task, mark it **critical**, submit — the run jumps to the summary with the
   last task marked **Skipped**.
6. Show the summary, then **Return to home**.

If you want to show the import feature, start with **Import test scripts…** on the tester
picker, load the example file, and show the preview before pressing **Import**. In live
mode you can then open the Django admin and show the new `TestScripts` / `Tests` rows.

If you want the video to show real data, run the backend, use `?mode=live`, and point the
camera at the MySQL rows or Django admin afterwards to prove the reports were stored.

---

## What is not built yet

- **Authentication.** The tester picker is a convenience, not a login. Anyone can pick any
  name. The server should eventually derive `submitted_by` from the session, not trust the
  client.
- **Session upload.** The backend has no `sessions` endpoint, so the run summary is only
  shown on screen. Only individual bug reports are stored. If you want whole runs stored,
  the backend needs a table for it.
- **Authoring scripts by hand.** Scripts can be created in bulk from a `.json` file on the
  import screen, but there's no in-app editor for changing a script or a task afterwards —
  use the Django admin for that. Import also has no rollback: it writes one row at a time,
  so a mid-way failure leaves the rows already created.
- **Offline queueing.** If a submission fails, the tester has to retry manually.
