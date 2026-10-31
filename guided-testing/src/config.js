/**
 * App configuration.
 *
 * The app can run two ways:
 *   - MOCK  : bundled demo data, no server needed (default — good for the video)
 *   - LIVE  : talks to the Django REST backend
 *
 * You can also override per-visit from the URL, which is handy for demos:
 *   http://127.0.0.1:5173/?mode=live
 *   http://127.0.0.1:5173/?mode=mock
 *   http://127.0.0.1:5173/?mode=live&api=http://192.168.1.20:8000/api
 */

const params =
  typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

const modeParam = params.get('mode');
const apiParam = params.get('api');

export const CONFIG = {
  /** false = talk to the Django server below. */
  MOCK: modeParam ? modeParam !== 'live' : true,

  /** Django dev server root + /api (note the trailing /api, no trailing slash). */
  BASE_URL: apiParam || 'http://127.0.0.1:8000/api',

  /** Simulated network latency for the mock adapter, in ms. Set to 0 for instant. */
  MOCK_LATENCY: 350,

  /** Re-fetch the assigned-script list this often while it is on screen (0 = off). */
  POLL_INTERVAL_MS: 15000,

  /** Ask the server for task counts on the script list (one extra request). */
  SHOW_TASK_COUNTS: true,

  /** The schema has no critical flag; mark it at the start of the report text. */
  CRITICAL_PREFIX: true,

  /**
   * Optional display names for the live fallback roster, keyed by tester id.
   * Only used when /testers/ cannot supply names.
   * e.g. { 1: 'Alice Smith', 2: 'Bob Jones', 3: 'Charlie Brown' }
   */
  TESTER_NAMES: {},

  /**
   * What ends a test run early.
   *   'critical' – stop as soon as the tester marks a failure as critical (default,
   *                matches "ask if it was a critical failure -> skip to end").
   *   'useful'   – stop as soon as a failure report is judged useful
   *                (the literal reading of "AI assessment ... if yes, skip to end").
   */
  END_TEST_ON: 'critical',

  /** Minimum heuristic score (0-100) for a failure report to count as useful. */
  USEFUL_THRESHOLD: 60,

  /** Ask the tester to confirm before submitting a report the assessment rejected. */
  ALLOW_SUBMIT_ANYWAY: true,
};
