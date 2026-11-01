// AI integration (Anton)
// Sends the failure report to the AI server (ai-service/ai_service.py on port 8001).
// If the AI server isn't running, it uses the old check from assessment.js instead.
// Add ?ai=off to the url to turn the AI off.

import { assessReport } from '../assessment.js';
import { CONFIG } from '../config.js';
import { currentTask } from '../store.js';

const AI_URL = 'http://127.0.0.1:8001/assess';
const aiOff = new URLSearchParams(location.search).get('ai') === 'off';

// save the last result so the summary page can show it too
let lastNote = null;
let lastResult = null;

export async function aiAssess(note) {
  let result;

  try {
    if (aiOff) throw new Error('AI is turned off');

    const task = currentTask() || {};

    const response = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note: note,
        task: {
          // demo mode has no database, so only send the id in live mode
          id: CONFIG.MOCK ? null : task.id,
          description: task.description,
          expected: task.expected,
        },
        threshold: CONFIG.USEFUL_THRESHOLD,
      }),
    });

    if (!response.ok) throw new Error('AI server error ' + response.status);
    result = await response.json();

    // show that the AI checked it
    if (!result.useful) {
      result.issues.push({
        code: 'ai-note',
        label: 'Checked by AI',
        detail: result.summary,
      });
    }
  } catch (error) {
    console.log('AI not available, using the basic check:', error.message);
    result = assessReport(note);
  }

  lastNote = note;
  lastResult = result;
  return result;
}

export function lastAssessment(note) {
  if (note === lastNote) return lastResult;
  return null;
}
