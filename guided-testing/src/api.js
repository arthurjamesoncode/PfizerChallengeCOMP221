/**
 * API adapter — the single seam between the UI and the Django REST backend.
 *
 *   MOCK mode  : everything is served from src/mock-data.js + localStorage.
 *   LIVE mode  : talks to <BASE_URL>/testers/, /test_scripts/, /tests/, /bug_reports/
 *
 * Switch modes in src/config.js, or per-visit with the URL:
 *   ?mode=live          ?mode=mock          ?api=http://host:8000/api
 *
 * BACKEND CONTRACT (Django REST)
 * ---------------------------------------------------------------------------
 * GET  /testers/                          -> [{ id, name, ... }]
 * GET  /test_scripts/?assigned=<testerId> -> [{ id, name, assigned, ... }]
 * GET  /test_scripts/<scriptId>/          -> { id, name, assigned, ... }
 * GET  /tests/?test_script=<scriptId>     -> [{ id, test_script, description, expected_result }]
 * POST /bug_reports/                      -> { test, report_text, submitted_by }
 *
 * If your field names differ, change FIELD below — nothing else needs to know.
 * ---------------------------------------------------------------------------
 */

import { CONFIG } from './config.js';
import { TESTERS, TESTS } from './mock-data.js';
import { assessReport } from './assessment.js';

const FAILURES_KEY = 'gt.failures.v1';

/* -------------------------------------------------------------------------- */
/* Field mapping                                                               */
/* -------------------------------------------------------------------------- */
/**
 * Each entry is a list of candidate keys, most likely first. The first one
 * present on the object wins. Adjust these to match models.py and the whole
 * app follows.
 */
const FIELD = {
  tester: {
    id: ['id', 'tester_id'],
    firstName: ['first_name', 'firstName'],
    lastName: ['last_name', 'lastName'],
    name: ['name', 'full_name', 'username'],
    role: ['role', 'job_title'],
  },
  script: {
    id: ['id', 'script_id'],
    name: ['label', 'name', 'title'],
    description: ['description', 'summary', 'notes'],
    assigned: ['assigned', 'assigned_to', 'tester'],
    code: ['code', 'reference', 'script_code'],
    tests: ['tests', 'test_set'],
  },
  test: {
    id: ['id', 'test_id'],
    description: ['description', 'text', 'instructions', 'name'],
    expected: ['expected', 'expected_result', 'expected_output'],
    script: ['script', 'test_script', 'script_id'],
    order: ['ordinal', 'order', 'position', 'index', 'step', 'id'],
  },
  bug: {
    test: ['test', 'test_id'],
    text: ['report_text', 'text', 'description'],
    by: ['submitted_by', 'tester', 'user'],
  },
};

/** First defined, non-null value among candidate keys. */
function pick(obj, keys, fallback = undefined) {
  if (!obj) return fallback;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

/** DRF pagination (`{count, results}`) or a bare array. */
function unwrap(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function normalizeTester(raw) {
  const id = pick(raw, FIELD.tester.id);
  const first = pick(raw, FIELD.tester.firstName, '');
  const last = pick(raw, FIELD.tester.lastName, '');
  const combined = [first, last].filter(Boolean).join(' ');

  return {
    id,
    name: String(pick(raw, FIELD.tester.name, combined) || `Tester ${id}`),
    role: pick(raw, FIELD.tester.role, 'Tester'),
  };
}

function normalizeScript(raw) {
  const id = pick(raw, FIELD.script.id);
  const nested = pick(raw, FIELD.script.tests, null);
  const taskCount = Array.isArray(nested) ? nested.length : pick(raw, ['test_count', 'num_tests'], null);

  return {
    id,
    testNumber: String(pick(raw, FIELD.script.code, `TS-${id}`)),
    name: String(pick(raw, FIELD.script.name, `Test script ${id}`)),
    description: pick(raw, FIELD.script.description, ''),
    assignedTo: pick(raw, FIELD.script.assigned),
    taskCount,
  };
}

function normalizeTask(raw, index) {
  return {
    id: pick(raw, FIELD.test.id),
    description: String(pick(raw, FIELD.test.description, `Step ${index + 1}`)),
    expected: String(pick(raw, FIELD.test.expected, '')),
    order: pick(raw, FIELD.test.order, index),
  };
}

/* -------------------------------------------------------------------------- */
/* Transport                                                                   */
/* -------------------------------------------------------------------------- */

async function request(path, { method = 'GET', body } = {}) {
  const url = `${CONFIG.BASE_URL.replace(/\/$/, '')}${path}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Cannot reach the server at ${CONFIG.BASE_URL}. Is it running, and is CORS enabled for this origin?`
    );
  }

  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = typeof data === 'string' ? data : JSON.stringify(data).slice(0, 200);
    } catch {
      /* no body */
    }
    throw new Error(`${method} ${path} failed (${res.status})${detail ? ` — ${detail}` : ''}`);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* -------------------------------------------------------------------------- */
/* Live adapter                                                                */
/* -------------------------------------------------------------------------- */

const live = {
  async getTesters() {
    const data = await request('/testers/');
    const rows = unwrap(data);

    // A tester row should have a name somewhere. If it doesn't, the endpoint is
    // returning something else (the current server points /testers/ at the
    // tests view), so fall back to the tester ids referenced by test scripts.
    const looksLikeTester =
      rows.length > 0 &&
      rows.some(
        (r) =>
          pick(r, FIELD.tester.name) ||
          pick(r, FIELD.tester.firstName) ||
          pick(r, FIELD.tester.lastName)
      );

    if (looksLikeTester) {
      return { testers: rows.map(normalizeTester) };
    }

    let testers = [];
    try {
      const scripts = unwrap(await request('/test_scripts/'));
      const ids = [
        ...new Set(
          scripts.map((s) => pick(s, FIELD.script.assigned)).filter((v) => v != null && v !== '')
        ),
      ];
      testers = ids.map((id) => ({
        id,
        name: CONFIG.TESTER_NAMES[String(id)] || `Tester ${id}`,
        role: 'Tester',
      }));
    } catch {
      /* leave empty */
    }

    return {
      testers,
      warning:
        '/testers/ is not returning testers, so this list was built from the ' +
        '"assigned" values on test scripts. Names will be missing until that ' +
        'endpoint is fixed (it currently points at the tests view).',
    };
  },

  async getTestsForTester(testerId) {
    const [scriptsData, testsData] = await Promise.all([
      request(`/test_scripts/?assigned=${encodeURIComponent(testerId)}`),
      CONFIG.SHOW_TASK_COUNTS
        ? request('/tests/').catch(() => null) // optional: count tasks per script
        : Promise.resolve(null),
    ]);

    const counts = new Map();
    for (const raw of unwrap(testsData)) {
      const key = String(pick(raw, FIELD.test.script));
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return {
      tests: unwrap(scriptsData).map((raw) => {
        const script = normalizeScript(raw);
        if (script.taskCount == null && counts.has(String(script.id))) {
          script.taskCount = counts.get(String(script.id));
        }
        return script;
      }),
    };
  },

  async getTest(scriptId) {
    const script = await request(`/test_scripts/${encodeURIComponent(scriptId)}/`);

    // Tasks may be nested on the script, otherwise fetch them by filter.
    let rawTasks = pick(script, FIELD.script.tests, null);
    if (!Array.isArray(rawTasks)) {
      const data = await request(`/tests/?script=${encodeURIComponent(scriptId)}`);
      rawTasks = unwrap(data);
    }

    const tasks = rawTasks
      .map(normalizeTask)
      .sort((a, b) => Number(a.order) - Number(b.order));

    return {
      test: {
        ...normalizeScript(script),
        tasks,
      },
    };
  },

  async submitFailure(payload) {
    // The schema has no `critical` column, so mark it inside the text as well.
    const text =
      payload.critical && CONFIG.CRITICAL_PREFIX ? `[CRITICAL] ${payload.note}` : payload.note;

    const body = {
      [FIELD.bug.test[0]]: payload.taskId,
      [FIELD.bug.text[0]]: text,
      [FIELD.bug.by[0]]: payload.testerId,
      critical: payload.critical, // ignored by DRF if the column doesn't exist
    };

    const created = await request('/bug_reports/', { method: 'POST', body });

    return {
      failure: {
        id: pick(created, ['id'], `fail-${Date.now()}`),
        ...payload,
        raw: created,
      },
      assessment: assessReport(payload.note),
    };
  },

  /** The backend has no session object yet; this is a no-op until it does. */
  async completeSession() {
    return { ok: true, stored: false };
  },

  /**
   * Create testers, scripts and tasks from an import plan.
   * Testers are matched by name; anything missing is created first.
   * @param {{testers: string[], scripts: Array<{assigned: string, tasks: Array<{description: string, expected: string}>}>}} plan
   * @param {(p: {step: number, total: number, label: string}) => void} [onProgress]
   */
  async importScripts(plan, onProgress = () => {}) {
    const existing = unwrap(await request('/testers/')).map(normalizeTester);
    const byName = new Map();
    for (const tester of existing) byName.set(tester.name.trim().toLowerCase(), tester.id);

    // Continue numbering after any "Test Script N" that already exists, so a
    // second import does not create a duplicate title.
    let maxNumber = 0;
    for (const raw of unwrap(await request('/test_scripts/'))) {
      const match = /^Test Script (\d+)$/.exec(normalizeScript(raw).name);
      if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
    }

    const missing = plan.testers.filter((name) => !byName.has(name.toLowerCase()));
    const total =
      missing.length + plan.scripts.length + plan.scripts.reduce((n, s) => n + s.tasks.length, 0);

    let step = 0;
    const tick = (label) => {
      step += 1;
      onProgress({ step, total, label });
    };

    const testersCreated = [];
    for (const name of missing) {
      const [first, ...rest] = name.split(/\s+/);
      const created = await request('/testers/', {
        method: 'POST',
        body: {
          [FIELD.tester.firstName[0]]: first,
          [FIELD.tester.lastName[0]]: rest.join(' '),
        },
      });
      byName.set(name.toLowerCase(), pick(created, FIELD.tester.id));
      testersCreated.push(name);
      tick(`Tester "${name}"`);
    }

    const scripts = [];
    for (let i = 0; i < plan.scripts.length; i += 1) {
      const spec = plan.scripts[i];
      const label = `Test Script ${maxNumber + i + 1}`;
      const assignedId = byName.get(spec.assigned.toLowerCase());

      if (assignedId === undefined) {
        throw new Error(`Could not resolve tester "${spec.assigned}" to an id.`);
      }

      const script = await request('/test_scripts/', {
        method: 'POST',
        body: {
          [FIELD.script.name[0]]: label,
          [FIELD.script.assigned[0]]: assignedId,
        },
      });
      const scriptId = pick(script, FIELD.script.id);
      tick(label);

      for (let j = 0; j < spec.tasks.length; j += 1) {
        const task = spec.tasks[j];
        await request('/tests/', {
          method: 'POST',
          body: {
            [FIELD.test.script[0]]: scriptId,
            [FIELD.test.order[0]]: j + 1,
            [FIELD.test.description[0]]: task.description,
            [FIELD.test.expected[0]]: task.expected,
          },
        });
        tick(`${label} · task ${j + 1}`);
      }

      scripts.push({
        id: scriptId,
        label,
        assigned: spec.assigned,
        taskCount: spec.tasks.length,
      });
    }

    return {
      testersCreated,
      testersMatched: plan.testers.filter((name) => !testersCreated.includes(name)),
      scripts,
    };
  },

  /** The usefulness check runs locally in live mode (move it server-side later). */
  async assess(note) {
    return { assessment: assessReport(note) };
  },
};

/* -------------------------------------------------------------------------- */
/* Mock adapter                                                                */
/* -------------------------------------------------------------------------- */

function readFailures() {
  try {
    return JSON.parse(localStorage.getItem(FAILURES_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeFailures(rows) {
  try {
    localStorage.setItem(FAILURES_KEY, JSON.stringify(rows));
  } catch {
    /* storage may be unavailable */
  }
}

const mock = {
  async getTesters() {
    await sleep(CONFIG.MOCK_LATENCY);
    return { testers: TESTERS.map(({ id, name, role }) => ({ id, name, role })) };
  },

  async getTestsForTester(testerId) {
    await sleep(CONFIG.MOCK_LATENCY);
    const tests = TESTS.filter((t) => String(t.assignedTo) === String(testerId)).map((t) => ({
      id: t.id,
      testNumber: t.testNumber,
      name: t.name,
      description: t.description,
      assignedTo: t.assignedTo,
      taskCount: t.tasks.length,
    }));
    return { tests };
  },

  async getTest(testId) {
    await sleep(CONFIG.MOCK_LATENCY);
    const test = TESTS.find((t) => String(t.id) === String(testId));
    if (!test) throw new Error(`Unknown test script: ${testId}`);
    return { test: structuredClone(test) };
  },

  async submitFailure(payload) {
    await sleep(CONFIG.MOCK_LATENCY);
    const failure = { id: `fail-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, ...payload };
    const rows = readFailures();
    rows.push(failure);
    writeFailures(rows);
    return { failure, assessment: assessReport(payload.note) };
  },

  async completeSession(session) {
    await sleep(CONFIG.MOCK_LATENCY / 2);
    try {
      localStorage.setItem('gt.lastSession.v1', JSON.stringify(session));
    } catch {
      /* ignore */
    }
    return { ok: true, stored: true };
  },

  async assess(note) {
    await sleep(CONFIG.MOCK_LATENCY / 2);
    return { assessment: assessReport(note) };
  },

  /** Same contract as the live adapter, but written into the bundled demo arrays. */
  async importScripts(plan, onProgress = () => {}) {
    await sleep(CONFIG.MOCK_LATENCY / 2);

    const byName = new Map(TESTERS.map((t) => [t.name.trim().toLowerCase(), t.id]));

    let maxNumber = 0;
    for (const script of TESTS) {
      const match = /^Test Script (\d+)$/.exec(script.name);
      if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
    }

    const missing = plan.testers.filter((name) => !byName.has(name.toLowerCase()));
    const total =
      missing.length + plan.scripts.length + plan.scripts.reduce((n, s) => n + s.tasks.length, 0);

    let step = 0;
    const tick = async (label) => {
      step += 1;
      onProgress({ step, total, label });
      await sleep(90);
    };

    const testersCreated = [];
    for (const name of missing) {
      const id = `t-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${TESTERS.length + 1}`;
      TESTERS.push({ id, name, role: 'Tester' });
      byName.set(name.toLowerCase(), id);
      testersCreated.push(name);
      await tick(`Tester "${name}"`);
    }

    const scripts = [];
    for (let i = 0; i < plan.scripts.length; i += 1) {
      const spec = plan.scripts[i];
      const label = `Test Script ${maxNumber + i + 1}`;
      const id = `test-import-${Date.now()}-${i}`;
      const tasks = spec.tasks.map((task, j) => ({
        id: `task-import-${Date.now()}-${i}-${j}`,
        description: task.description,
        expected: task.expected,
      }));

      TESTS.push({
        id,
        testNumber: `TS-${maxNumber + i + 1}`,
        name: label,
        description: '',
        assignedTo: byName.get(spec.assigned.toLowerCase()),
        tasks,
      });

      await tick(label);
      for (let j = 0; j < tasks.length; j += 1) {
        await tick(`${label} · task ${j + 1}`);
      }

      scripts.push({ id, label, assigned: spec.assigned, taskCount: tasks.length });
    }

    return {
      testersCreated,
      testersMatched: plan.testers.filter((name) => !testersCreated.includes(name)),
      scripts,
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

const impl = () => (CONFIG.MOCK ? mock : live);

export const getTesters = () => impl().getTesters();
export const getTestsForTester = (testerId) => impl().getTestsForTester(testerId);
export const getTest = (testId) => impl().getTest(testId);
export const submitFailure = (payload) => impl().submitFailure(payload);
export const completeSession = (session) => impl().completeSession(session);
export const assess = (note) => impl().assess(note);
export const importScripts = (plan, onProgress) => impl().importScripts(plan, onProgress);

/** Demo helper — clears locally stored mock data. */
export function resetMockData() {
  try {
    localStorage.removeItem(FAILURES_KEY);
    localStorage.removeItem('gt.lastSession.v1');
  } catch {
    /* ignore */
  }
}

export function getStoredFailures() {
  return readFailures();
}
