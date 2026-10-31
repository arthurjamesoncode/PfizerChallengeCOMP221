/**
 * Parser + validator for the test-script import file.
 *
 * Expected shape (case-insensitive keys, "Tests" may be a list or a single object):
 *
 *   {
 *     "Testers": ["Steve", "Bob", "Sarah"],
 *     "Tests": [
 *       {
 *         "Assigned": "Steve",
 *         "Tasks": [
 *           { "Description": "Open App", "Expected": "Should Open to Homepage" }
 *         ]
 *       }
 *     ]
 *   }
 *
 * Nothing here talks to the network or the DOM, so it can be exercised on its own.
 * A script's title is generated at import time ("Test Script 1", "Test Script 2", ...).
 */

const KEYS = {
  testers: ['testers', 'tester'],
  tests: ['tests', 'test', 'scripts', 'testscripts', 'test_scripts'],
  assigned: ['assigned', 'assignedto', 'assigned_to', 'tester', 'user'],
  tasks: ['tasks', 'steps', 'testcases'],
  description: ['description', 'desc', 'step', 'instruction', 'action'],
  expected: ['expected', 'expectedresult', 'expected_result', 'expectedoutput', 'expected_output', 'result'],
};

/** Case-insensitive property lookup across a list of candidate names. */
function read(obj, names) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const prop of Object.keys(obj)) {
    if (names.includes(prop.toLowerCase())) return obj[prop];
  }
  return undefined;
}

const isText = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * @param {string} text raw file contents
 * @returns {{
 *   plan: null | { testers: string[], scripts: Array<{assigned: string, tasks: Array<{description: string, expected: string}>}> },
 *   errors: Array<{path: string, message: string}>,
 *   warnings: string[],
 * }}
 */
export function parseScriptFile(text) {
  const errors = [];
  const warnings = [];

  let root;
  try {
    root = JSON.parse(text);
  } catch (err) {
    return {
      plan: null,
      errors: [{ path: 'file', message: `Not valid JSON — ${err.message}` }],
      warnings,
    };
  }

  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    return {
      plan: null,
      errors: [
        {
          path: 'file',
          message: 'Expected a JSON object containing "Testers" and "Tests".',
        },
      ],
      warnings,
    };
  }

  /* --- Testers ---------------------------------------------------------- */

  const rawTesters = read(root, KEYS.testers);
  const declared = [];

  if (rawTesters === undefined) {
    warnings.push('No "Testers" list found, so names were taken from each test\'s "Assigned" value.');
  } else if (!Array.isArray(rawTesters)) {
    errors.push({
      path: 'Testers',
      message: 'Should be a list of names, for example ["Steve", "Bob"].',
    });
  } else {
    rawTesters.forEach((name, i) => {
      if (!isText(name)) {
        errors.push({ path: `Testers[${i}]`, message: 'Should be a non-empty name.' });
      } else {
        declared.push(name.trim());
      }
    });
  }

  /* --- Tests ------------------------------------------------------------ */

  const rawTests = read(root, KEYS.tests);
  const tests = [];

  if (rawTests === undefined) {
    errors.push({ path: 'Tests', message: 'Missing. Expected a list of test scripts.' });
  } else if (!Array.isArray(rawTests)) {
    if (rawTests && typeof rawTests === 'object') {
      warnings.push('"Tests" was a single object, so it was treated as a list of one.');
      tests.push(rawTests);
    } else {
      errors.push({ path: 'Tests', message: 'Should be a list of test scripts.' });
    }
  } else {
    tests.push(...rawTests);
  }

  if (rawTests !== undefined && tests.length === 0 && !errors.length) {
    errors.push({ path: 'Tests', message: 'The list is empty — there is nothing to import.' });
  }

  const scripts = [];

  tests.forEach((raw, i) => {
    const at = `Tests[${i}]`;

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push({ path: at, message: 'Should be an object.' });
      return;
    }

    const assigned = read(raw, KEYS.assigned);
    if (!isText(assigned)) {
      errors.push({ path: `${at}.Assigned`, message: 'Missing. Who is this script assigned to?' });
    }

    const rawTasks = read(raw, KEYS.tasks);
    if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
      errors.push({
        path: `${at}.Tasks`,
        message: 'Should be a non-empty list of tasks.',
      });
      return;
    }

    const tasks = [];

    rawTasks.forEach((rawTask, j) => {
      const taskAt = `${at}.Tasks[${j}]`;

      if (!rawTask || typeof rawTask !== 'object' || Array.isArray(rawTask)) {
        errors.push({ path: taskAt, message: 'Should be an object.' });
        return;
      }

      const description = read(rawTask, KEYS.description);
      if (!isText(description)) {
        errors.push({ path: `${taskAt}.Description`, message: 'Missing.' });
      }

      const expected = read(rawTask, KEYS.expected);
      if (!isText(expected)) {
        warnings.push(`${taskAt}.Expected is empty, so it will read "No expected result provided."`);
      }

      tasks.push({
        description: isText(description) ? description.trim() : '',
        expected: isText(expected) ? expected.trim() : 'No expected result provided.',
      });
    });

    scripts.push({
      assigned: isText(assigned) ? assigned.trim() : '',
      tasks,
    });
  });

  /* --- Cross-checks ------------------------------------------------------ */

  // Deduplicate the roster case-insensitively, keeping the first spelling.
  const roster = [];
  const seen = new Set();
  const addName = (name) => {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      roster.push(name);
    }
  };
  declared.forEach(addName);
  scripts.forEach((s) => s.assigned && addName(s.assigned));

  // If the file declares a roster, every "Assigned" must come from it.
  if (declared.length) {
    const allowed = new Set(declared.map((n) => n.toLowerCase()));
    scripts.forEach((s, i) => {
      if (s.assigned && !allowed.has(s.assigned.toLowerCase())) {
        errors.push({
          path: `Tests[${i}].Assigned`,
          message: `"${s.assigned}" is not in the Testers list.`,
        });
      }
    });
  }

  // A script with no usable tasks would break the run screen.
  scripts.forEach((s, i) => {
    if (s.tasks.length === 0 && !errors.some((e) => e.path.startsWith(`Tests[${i}]`))) {
      errors.push({ path: `Tests[${i}].Tasks`, message: 'No usable tasks.' });
    }
  });

  if (errors.length) return { plan: null, errors, warnings };

  return {
    plan: { testers: roster, scripts },
    errors: [],
    warnings,
  };
}

/** Starter file offered as a download from the import screen. */
export const EXAMPLE = {
  Testers: ['Steve', 'Bob', 'Sarah'],
  Tests: [
    {
      Assigned: 'Steve',
      Tasks: [{ Description: 'Open App', Expected: 'Should Open to Homepage' }],
    },
    {
      Assigned: 'Bob',
      Tasks: [
        {
          Description: 'Enter a valid password and tap Log in',
          Expected: 'Home dashboard loads within 2 seconds',
        },
        {
          Description: 'Enter an invalid password and tap Log in',
          Expected: 'Error message reads "Invalid credentials"',
        },
      ],
    },
  ],
};

/** Totals for the preview line. */
export function summarise(plan) {
  const tasks = plan.scripts.reduce((sum, s) => sum + s.tasks.length, 0);
  return { testers: plan.testers.length, scripts: plan.scripts.length, tasks };
}
