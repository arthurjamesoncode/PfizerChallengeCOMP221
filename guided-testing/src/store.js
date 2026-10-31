/**
 * Tiny app-wide store + navigation. Views read `state` and call actions;
 * actions mutate state and trigger a re-render via the subscriber list.
 */

import * as api from './api.js';
import { CONFIG } from './config.js';
import { parseScriptFile } from './importer.js';

const listeners = new Set();

export const state = {
  view: 'select', // 'select' | 'tests' | 'run' | 'summary'
  loading: false,
  error: null,

  testers: [],
  tester: null,

  /** Set when the live API is reachable but not returning what we expect. */
  backendWarning: null,

  tests: [],
  test: null,

  /** Test-script import flow (see views/importScripts.js). */
  import: {
    phase: 'idle', // 'idle' | 'preview' | 'running' | 'done' | 'error'
    fileName: null,
    plan: null,
    errors: [],
    warnings: [],
    progress: null,
    result: null,
    error: null,
  },

  /** @type {null | {
   *   id: string, testerId: string, testId: string, startedAt: string,
   *   index: number, endedEarly: boolean, endReason: string|null,
   *   responses: Array<object>
   * }} */
  session: null,
};

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function render() {
  for (const fn of listeners) fn();
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function newSessionId() {
  return `run-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function fail(err) {
  console.error(err);
  state.error = err?.message || 'Something went wrong';
  state.loading = false;
  render();
}

/* -------------------------------------------------------------------------- */
/* Live refresh                                                                */
/* -------------------------------------------------------------------------- */

let pollTimer = null;

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

/** Re-fetch the assigned-script list periodically so the view stays current. */
function startPolling() {
  stopPolling();
  if (!CONFIG.POLL_INTERVAL_MS) return;

  pollTimer = setInterval(async () => {
    if (state.view !== 'tests' || state.loading || !state.tester) return;
    try {
      const { tests } = await api.getTestsForTester(state.tester.id);
      if (JSON.stringify(tests) !== JSON.stringify(state.tests)) {
        state.tests = tests;
        render();
      }
    } catch {
      /* transient — the next tick retries */
    }
  }, CONFIG.POLL_INTERVAL_MS);
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                  */
/* -------------------------------------------------------------------------- */

export function goHome() {
  stopPolling();
  state.view = 'select';
  state.session = null;
  state.test = null;
  state.tests = [];
  state.tester = null;
  state.error = null;
  render();
}

export async function loadTesters() {
  state.loading = true;
  state.error = null;
  render();
  try {
    const { testers, warning } = await api.getTesters();
    state.testers = testers;
    state.backendWarning = warning || null;
    state.loading = false;
    render();
  } catch (err) {
    fail(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Test-script import                                                          */
/* -------------------------------------------------------------------------- */

const emptyImport = () => ({
  phase: 'idle',
  fileName: null,
  plan: null,
  errors: [],
  warnings: [],
  progress: null,
  result: null,
  error: null,
});

export function openImport() {
  state.import = emptyImport();
  state.view = 'import';
  state.error = null;
  render();
}

export function closeImport() {
  state.import = emptyImport();
  state.view = 'select';
  render();
}

/** Called once the file has been read; validates and moves to the preview. */
export function loadImportFile(fileName, text) {
  const { plan, errors, warnings } = parseScriptFile(text);
  state.import = {
    ...emptyImport(),
    fileName,
    plan,
    errors,
    warnings,
    phase: errors.length ? 'idle' : 'preview',
  };
  render();
}

/** Clear the chosen file and go back to the picker. */
export function resetImportFile() {
  state.import = emptyImport();
  render();
}

export async function runImport() {
  const { plan } = state.import;
  if (!plan) return;

  state.import = {
    ...state.import,
    phase: 'running',
    error: null,
    progress: { step: 0, total: 0, label: 'Starting…' },
  };
  render();

  try {
    const result = await api.importScripts(plan, (progress) => {
      state.import = { ...state.import, progress };
      render();
    });
    state.import = { ...state.import, phase: 'done', result, progress: null };
    render();
  } catch (err) {
    console.error(err);
    state.import = {
      ...state.import,
      phase: 'error',
      progress: null,
      error: err?.message || 'The import failed.',
    };
    render();
  }
}

/** Leave the import screen and refresh the roster (new testers may exist now). */
export async function finishImport() {
  state.import = emptyImport();
  state.view = 'select';
  state.session = null;
  state.test = null;
  state.tests = [];
  state.tester = null;
  render();
  await loadTesters();
}

export async function chooseTester(testerId) {
  const tester = state.testers.find((t) => String(t.id) === String(testerId)) || null;
  if (!tester) return;

  state.tester = tester;
  state.loading = true;
  state.error = null;
  render();

  try {
    const { tests } = await api.getTestsForTester(tester.id);
    state.tests = tests;
    state.view = 'tests';
    state.loading = false;
    render();
    startPolling();
  } catch (err) {
    fail(err);
  }
}

export async function startTest(testId) {
  stopPolling();
  state.loading = true;
  state.error = null;
  render();

  try {
    const { test } = await api.getTest(testId);
    state.test = test;
    state.session = {
      id: newSessionId(),
      testerId: state.tester.id,
      testerName: state.tester.name,
      testId: test.id,
      testNumber: test.testNumber,
      startedAt: new Date().toISOString(),
      index: 0,
      endedEarly: false,
      endReason: null,
      responses: [],
    };
    state.view = 'run';
    state.loading = false;
    render();
  } catch (err) {
    fail(err);
  }
}

export function backToTests() {
  state.view = 'tests';
  state.session = null;
  state.test = null;
  state.error = null;
  render();
  startPolling();
}

/* -------------------------------------------------------------------------- */
/* Run progression                                                             */
/* -------------------------------------------------------------------------- */

export function currentTask() {
  if (!state.test || !state.session) return null;
  return state.test.tasks[state.session.index] ?? null;
}

/**
 * Record a task outcome and advance.
 * @param {{taskId:string, taskNumber:number, status:'pass'|'fail', note?:string,
 *          critical?:boolean, assessment?:object}} response
 * @param {string|null} endReason  set when this outcome should end the run early
 */
export function recordResponse(response, endReason = null) {
  const s = state.session;
  if (!s) return;

  s.responses.push({ ...response, at: new Date().toISOString() });
  s.index += 1;

  if (s.index >= state.test.tasks.length) {
    // The last task may itself be the one that ends the run early.
    if (endReason) {
      s.endedEarly = true;
      s.endReason = endReason;
    }
    finishSession();
    return;
  }
  render();
}

/**
 * End the run immediately; remaining tasks are recorded as skipped.
 * @param {string} reason
 */
export function endEarly(reason) {
  const s = state.session;
  if (!s) return;
  s.endedEarly = true;
  s.endReason = reason;
  finishSession();
}

async function finishSession() {
  const s = state.session;
  if (!s) return;

  s.endedAt = new Date().toISOString();

  state.view = 'summary';
  render();

  const payload = {
    ...s,
    responses: s.responses,
  };

  try {
    await api.completeSession(payload);
  } catch (err) {
    // Non-fatal: the summary is already on screen.
    console.warn('Could not upload session', err);
  }
}

/* -------------------------------------------------------------------------- */
/* Failure submission                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Send a failure report and get the usefulness assessment back.
 * @returns {Promise<{failure: object, assessment: object}>}
 */
export async function submitFailureReport({ note, critical }) {
  const s = state.session;
  const test = state.test;
  const task = currentTask();
  if (!s || !test || !task) throw new Error('No active task');

  const payload = {
    testerId: s.testerId,
    testerName: s.testerName,
    testId: test.id,
    testNumber: test.testNumber,
    taskId: task.id,
    taskNumber: s.index + 1,
    taskDescription: task.description,
    note: String(note || '').trim(),
    critical: Boolean(critical),
    createdAt: new Date().toISOString(),
  };

  const result = await api.submitFailure(payload);
  return result;
}

/** True when the configured policy says this outcome should end the run. */
export function shouldEndRun({ critical, assessment }) {
  if (CONFIG.END_TEST_ON === 'useful') return Boolean(assessment?.useful);
  return Boolean(critical);
}
