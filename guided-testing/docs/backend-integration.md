# Backend integration

Everything the frontend knows about the server lives in `src/api.js`. This document
describes what it expects, how it maps to the real schema, and what currently blocks
live mode.

---

## Endpoints used

| Method | Path | Used for |
| --- | --- | --- |
| GET | `/api/testers/` | Tester picker |
| GET | `/api/test_scripts/?assigned=<testerId>` | Scripts assigned to that tester |
| GET | `/api/test_scripts/<scriptId>/` | Script header (label) |
| GET | `/api/tests/?script=<scriptId>` | The tasks inside a script |
| GET | `/api/tests/` | Task counts on the script list (one request) |
| POST | `/api/bug_reports/` | Submitting a failure |
| GET | `/api/test_scripts/` | Highest existing "Test Script N", for import numbering |
| POST | `/api/testers/` | Creating a tester named in an import file |
| POST | `/api/test_scripts/` | Creating one script per entry in an import file |
| POST | `/api/tests/` | Creating each task in an imported script |

Base URL defaults to `http://127.0.0.1:8000/api` and is set in `src/config.js`
(or with `?api=...` in the URL).

---

## Schema it maps to

From `initialise_database.sql` and `models.py`:

```
Testers       id, first_name, last_name
TestScripts   id, label, assigned              -> Testers.id (nullable)
Tests         id, script_id, ordinal, description, expected
BugReports    id, test, report_text, submitted_by  -> Tests.id, Testers.id
```

Vocabulary used in the UI:

| UI word | Backend object |
| --- | --- |
| tester | `Testers` row |
| test script | `TestScripts` row |
| task | `Tests` row |
| failure report | `BugReports` row |

---

## Field mapping

`src/api.js` has a `FIELD` object at the top. Each entry lists candidate keys; the first
one present wins, so it tolerates small schema changes without edits.

| UI value | Backend field(s) |
| --- | --- |
| tester id | `id` |
| tester name | `first_name` + `last_name` (falls back to `name`) |
| script id | `id` |
| script title | `label` |
| script owner | `assigned` |
| task id | `id` |
| task text | `description` |
| expected result | `expected` |
| task order | `ordinal` |
| report target | `test` |
| report body | `report_text` |
| report author | `submitted_by` |

If a name changes, add or reorder the candidates for that entry — no other file needs to
change.

### `critical`

`BugReports` has no column for it. When a tester marks a failure critical, the frontend
prefixes the stored text with `[CRITICAL] ` and also sends `critical: true` (Django REST
ignores fields that aren't on the serializer). To store it properly, the backend needs a
boolean column; until then the prefix is the record. Turn this off with
`CRITICAL_PREFIX: false` in `src/config.js`.

---

## Importing test scripts

The import screen (`src/views/importScripts.js`) reads a `.json` file, validates it with
`src/importer.js`, then writes it through the API. Nothing is written until the whole file
passes validation.

The file format is documented in the README. The write path is:

1. `GET /testers/` — build a name → id map.
2. `GET /test_scripts/` — find the highest existing `Test Script N` so new titles continue
   the sequence instead of colliding.
3. For each name in the file that isn't in the map: `POST /testers/` with
   `first_name` / `last_name` (a single-word name sends an empty `last_name`, hence fix 5).
4. For each entry in `Tests`: `POST /test_scripts/` with `label` (`Test Script N`) and
   `assigned` (the tester's id).
5. For each task: `POST /tests/` with `script_id`, `ordinal` (1-based), `description` and
   `expected`.

There is **no transaction**: the requests are sequential, so a failure part-way leaves the
rows already created. The UI says so on the error screen. To undo an import, delete the
rows in the Django admin.

In mock mode the same contract is implemented against the arrays in `src/mock-data.js`, so
an import there disappears on reload.

---

## Backend fixes (already applied)

The build in `server.zip` could not serve live mode. Five things were wrong; all five are
now fixed in the backend copy at `C:\Users\ashis\Downloads\server`. This section is the
record of what changed, in case another copy of the project still has the old code.

### 1. Two routes pointed at the wrong view

`testing_db_api/urls.py` — **changed**:

```python
# before
router.register(r'testers',     TestViewSet, basename="tester")
router.register(r'bug_reports', TestViewSet, basename="bug_report")

# after
router.register(r'testers',     TesterViewSet,     basename="tester")
router.register(r'bug_reports', BugReportViewSet,  basename="bug_report")
```

`TestViewSet` was serving both, so `/testers/` returned **test** rows and
`POST /bug_reports/` tried to create a **Test** (400, `script` and `ordinal` required).

### 2. Two serializers used the wrong model

`testing_db_api/serializers.py` — **changed**:

```python
class TesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tester                      # was: TestScript
        fields = ['id', 'first_name', 'last_name']   # was: label, assigned
        read_only_fields = ['id']

class BugReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = BugReport                   # was: TestScript
        fields = ['id', 'test', 'report_text', 'submitted_by']
        read_only_fields = ['id']
```

### 3. `BugReports.test` was the primary key

`initialise_database.sql` — **changed**:

```sql
CREATE TABLE BugReports (
    id INT AUTO_INCREMENT PRIMARY KEY,   -- added
    test INT NOT NULL,                   -- was: test INT AUTO_INCREMENT PRIMARY KEY
    report_text TEXT,
    submitted_by INT NOT NULL,
    ...
);
```

`test` was doing double duty as the foreign key and the primary key, and there was no `id`
column. The Django model adds an implicit `id`, so every query selected `bugreports.id`,
which did not exist. It also meant only one report could ever exist per test.

If your database was **already created** with the old script, run the one-time
`UPGRADE_DB.sql` next to `manage.py` instead of recreating it:

```powershell
mysql -u root -p < UPGRADE_DB.sql
```

### 4. CORS was not configured

**Changed:** `django-cors-headers==4.9.0` added to `requirements.txt` and installed,
`corsheaders` added to `INSTALLED_APPS`, `corsheaders.middleware.CorsMiddleware` added
above `CommonMiddleware`, and:

```python
CORS_ALLOWED_ORIGINS = [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
]
```

### 5. Empty `last_name` was rejected

`testing_db_api/serializers.py` — **changed**:

```python
class TesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tester
        fields = ['id', 'first_name', 'last_name']
        read_only_fields = ['id']
        extra_kwargs = {'last_name': {'allow_blank': True}}   # added
```

Import files write testers as a single name (`"Steve"`), which the frontend splits into
`first_name: "Steve"`, `last_name: ""`. The `last_name` column already allowed `''`, but
DRF's serializer rejected a blank string with
`400 {"last_name":["This field may not be blank."]}`. `allow_blank` aligns the serializer
with the column.

---

## Verified after the fixes

Tested against the **real backend on real MySQL 8.0** (`pfizerchallengecomp221`), with the
frontend on port 5173 and Django on port 8000:

| Request | Result |
| --- | --- |
| `GET /api/testers/` | 200 `[{"id":1,"first_name":"Alice","last_name":"Smith"}, ...]` |
| `GET /api/test_scripts/?assigned=1` | 200 `[{"id":1,"label":"Login Authentication Script","assigned":1}]` |
| `GET /api/tests/?script=1` | 200, two tasks in `ordinal` order |
| `GET /api/bug_reports/` | 200, real report rows with `id` |
| `OPTIONS /api/bug_reports/` | 200, `access-control-allow-origin: http://127.0.0.1:5173` |
| `POST /api/bug_reports/` | **201** `{"id":3,"test":2,"report_text":"...","submitted_by":1}` |
| `POST /api/testers/` with `last_name: ""` | **201** (after fix 5; 400 before it) |
| Import a 2-script / 3-task file through the UI | "Import complete. 2 scripts and 3 tasks created." |
| Rows after that import | 3 new testers, 2 `TestScripts` (`Test Script 1/2`), 3 `Tests`, correct `assigned` / `script_id` / `ordinal` |

And through the browser, frontend → backend, no console errors:

```
GET  /api/testers/            200
GET  /api/tests/              200
GET  /api/test_scripts/?assigned=1  200
GET  /api/test_scripts/1/     200
GET  /api/tests/?script=1     200
OPTIONS /api/bug_reports/     200
POST /api/bug_reports/        201
```

Two reports for the same test id now coexist, which confirms fix 3. In the final run four
reports existed for `test = 2`.

`UPGRADE_DB.sql` was also run against this MySQL instance, starting from the old broken
table, and produced:

```sql
CREATE TABLE `bugreports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `test` int NOT NULL,
  `report_text` text,
  `submitted_by` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bugreports_test` (`test`),
  CONSTRAINT `fk_bugreports_test` FOREIGN KEY (`test`) REFERENCES `tests` (`id`) ...,
  CONSTRAINT `fk_bugreports_user` FOREIGN KEY (`submitted_by`) REFERENCES `testers` (`id`) ...
)
```

Note: the statements in that file must stay separate. MySQL rejects dropping and re-adding
a foreign key with the same name inside one `ALTER TABLE`.

---

## Switching to live mode

1. `src/config.js` → `MOCK: false` (or just use `?mode=live`).
2. Start Django, confirm `http://127.0.0.1:8000/api/testers/` returns testers in a browser.
3. Load the frontend and check the footer says **Connected to ...**.

If the tester list appears with names, the mapping is right. If names are missing but the
list is populated, `/testers/` is still serving the wrong view — check the "Backend
warning" banner.


---

## Adding real session records

There is no endpoint for a whole test run. `POST /sessions` is a no-op in live mode; the
summary only exists on screen. If runs need to be stored, the backend needs a table and
an endpoint, then `completeSession()` in `src/api.js` should post to it.
