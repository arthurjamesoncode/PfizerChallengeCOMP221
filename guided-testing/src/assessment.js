/**
 * Heuristic "is this failure report useful?" assessor.
 *
 * This is the reference implementation of the server-side AI check. It is pure,
 * synchronous and dependency-free so it can be dropped into the backend as-is,
 * or replaced by an LLM call that returns the same shape.
 *
 * A report is NOT useful when:
 *   - Evidence is thin        (too short / vague)
 *   - Bug is not actionable   (no observable behaviour described)
 *   - Already known           (stretch goal — stubbed)
 *   - Duplicate report        (stretch goal — stubbed)
 *
 * @typedef {Object} Assessment
 * @property {boolean} useful
 * @property {number}  score       0-100
 * @property {string}  verdict     'useful' | 'needs-detail'
 * @property {Array<{code:string, label:string, detail:string}>} issues
 * @property {string[]} signals    human-readable reasons the score was awarded
 */

const ACTIONABLE = new RegExp(
  [
    'click', 'tap', 'press', 'open', 'close', 'launch', 'navigate', 'scroll', 'swipe',
    'type', 'enter', 'submit', 'refresh', 'reload', 'toggle', 'select', 'upload',
    'crash', 'crashes', 'crashed', 'freeze', 'frozen', 'hang', 'stuck',
    'error', 'exception', 'timeout', 'timed out', 'blank', 'white screen', 'spinner',
    'fail', 'fails', 'failed', 'throws', 'threw', 'nothing happens', 'no response',
    'does not', "doesn't", 'did not', "didn't", 'instead', 'wrong', 'missing', 'duplicate',
  ].join('|'),
  'i'
);

const CONTEXT = new RegExp(
  [
    'step', 'steps', 'reproduce', 'expected', 'actual', 'instead', 'version', 'build',
    'device', 'browser', 'chrome', 'safari', 'firefox', 'edge', 'android', 'ios',
    'windows', 'macos', 'screenshot', 'recording', 'log', 'logs', 'console', 'stack trace',
    'error code', 'status code', '\\d{3,}', '\\d+\\s?(?:s|sec|seconds|ms)',
  ].join('|'),
  'i'
);

const VAGUE_ONLY = /^(?:it (?:doesn'?t|does not) work|broken|bug|error|fail(?:ed|s)?|nope|bad|not working)\.?$/i;

/** @param {string} note */
export function assessReport(note) {
  const text = String(note || '').trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const signals = [];
  const issues = [];

  let score = 0;

  // --- Evidence depth -------------------------------------------------------
  if (words.length >= 12) {
    score += 30;
    signals.push('Report describes the problem in detail');
  } else if (words.length >= 6) {
    score += 15;
    signals.push('Report has some detail');
  }

  if (text.length >= 80) {
    score += 10;
    signals.push('Enough text to understand the problem');
  }

  // --- Actionability --------------------------------------------------------
  const hasAction = ACTIONABLE.test(text);
  if (hasAction) {
    score += 25;
    signals.push('Describes an observable behaviour');
  }

  // --- Context / evidence ---------------------------------------------------
  const hasContext = CONTEXT.test(text);
  if (hasContext) {
    score += 20;
    signals.push('Includes context (steps, environment, expected vs actual)');
  }

  // --- Expected vs actual contrast -----------------------------------------
  const hasContrast =
    /\bexpected\b/i.test(text) && /\b(actual|instead|but|however)\b/i.test(text);
  if (hasContrast) {
    score += 15;
    signals.push('Contrasts expected and actual result');
  }

  score = Math.min(100, score);

  // --- Issues ---------------------------------------------------------------
  if (words.length < 6 || text.length < 40 || VAGUE_ONLY.test(text)) {
    issues.push({
      code: 'thin-evidence',
      label: 'Evidence is thin',
      detail: 'Add what you saw, where you saw it, and what you did to get there.',
    });
  }

  if (!hasAction) {
    issues.push({
      code: 'not-actionable',
      label: 'Bug is not actionable',
      detail:
        'Describe the behaviour that went wrong (e.g. "tapping Save shows a blank screen").',
    });
  }

  if (!hasContext) {
    issues.push({
      code: 'missing-context',
      label: 'Missing context',
      detail: 'Include the device, build number, or the steps that reproduce it.',
    });
  }

  // Stretch goals — wire these to real lookups when the backend supports it.
  const alreadyKnown = false;
  const duplicate = false;
  if (alreadyKnown) {
    issues.push({ code: 'already-known', label: 'Already known', detail: '' });
  }
  if (duplicate) {
    issues.push({ code: 'duplicate', label: 'Duplicate report', detail: '' });
  }

  const threshold = 60;
  const useful = score >= threshold && issues.length === 0;

  return {
    useful,
    score,
    verdict: useful ? 'useful' : 'needs-detail',
    issues,
    signals,
    checkedAt: new Date().toISOString(),
  };
}
