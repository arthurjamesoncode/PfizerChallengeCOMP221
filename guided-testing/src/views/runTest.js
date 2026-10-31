import {
  recordResponse,
  endEarly,
  submitFailureReport,
  shouldEndRun,
  backToTests,
} from '../store.js';
import { assess } from '../api.js';
import { CONFIG } from '../config.js';
import { el, esc, toast, skeleton } from '../ui.js';

/**
 * The guided run: one task at a time, pass/fail, failure capture,
 * report-quality gate, then advance or stop.
 */
export function renderRunTest(state) {
  const test = state.test;
  const session = state.session;

  if (state.loading || !test || !session) {
    return el(`<section class="view view-run"><div class="card">${skeleton(4)}</div></section>`);
  }

  const tasks = test.tasks;
  const total = tasks.length;
  const index = Math.min(session.index, total - 1);
  const task = tasks[index];
  const taskNumber = index + 1;
  const pct = Math.round((index / total) * 100);

  const node = el(`
    <section class="view view-run" tabindex="-1">
      <div class="run-top">
        <button class="link-btn" type="button" data-back>&larr; All scripts</button>
        <div class="run-meta">
          <span class="badge badge-id">${esc(test.testNumber)}</span>
          <span class="run-name">${esc(test.name)}</span>
        </div>
        <span class="run-counter">Task <strong>${taskNumber}</strong> of ${total}</span>
      </div>

      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow="${pct}" aria-label="Test progress">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>

      <article class="card task-card">
        <p class="eyebrow">Task ${taskNumber}</p>
        <h1 class="task-desc">${esc(task.description)}</h1>
        <div class="expected">
          <p class="expected-label">Expected result</p>
          <p class="expected-text">${esc(task.expected)}</p>
        </div>
      </article>

      <div class="actions" id="actions">
        <button class="btn btn-pass" type="button" data-pass>
          <span class="btn-glyph" aria-hidden="true">&#10003;</span> Yes, it passed
        </button>
        <button class="btn btn-fail" type="button" data-fail>
          <span class="btn-glyph" aria-hidden="true">&#10007;</span> No, it failed
        </button>
      </div>
      <p class="hint" id="hint">Press <kbd>Y</kbd> to pass &middot; <kbd>N</kbd> to fail</p>

      <form class="card failure-form" id="failure-form" hidden novalidate>
        <h2 class="form-title">Report the failure</h2>
        <p class="form-sub">${esc(test.testNumber)} &middot; Task ${taskNumber}</p>

        <label class="field">
          <span class="field-label">What went wrong?</span>
          <textarea id="note" name="note" rows="5" required
            placeholder="e.g. Tapping &quot;Get started&quot; does nothing. Expected the sign-up screen. Pixel 7, build 2.4.1."></textarea>
          <span class="field-help">Include what you did, what you saw, and the device or build if you know it.</span>
        </label>

        <fieldset class="field field-plain">
          <legend class="field-label">Was this a critical failure?</legend>
          <div class="segmented">
            <label class="seg">
              <input type="radio" name="critical" value="no" checked />
              <span>No</span>
            </label>
            <label class="seg">
              <input type="radio" name="critical" value="yes" />
              <span>Yes &mdash; stop the test</span>
            </label>
          </div>
        </fieldset>

        <div class="form-actions" id="form-actions">
          <button class="btn btn-ghost" type="button" data-cancel>Cancel</button>
          <button class="btn btn-primary" type="submit" id="submit-report">Submit report</button>
        </div>
        <div id="assess-slot"></div>
      </form>
    </section>
  `);

  const actions = node.querySelector('#actions');
  const hint = node.querySelector('#hint');
  const form = node.querySelector('#failure-form');
  const formActions = node.querySelector('#form-actions');
  const slot = node.querySelector('#assess-slot');
  const textarea = node.querySelector('#note');
  const submitBtn = node.querySelector('#submit-report');

  /* ------------------------------------------------------------------ */
  /* Pass                                                                */
  /* ------------------------------------------------------------------ */
  function onPass() {
    recordResponse({ taskId: task.id, taskNumber, status: 'pass' });
  }

  /* ------------------------------------------------------------------ */
  /* Failure form                                                        */
  /* ------------------------------------------------------------------ */
  function openForm() {
    actions.hidden = true;
    hint.hidden = true;
    form.hidden = false;
    textarea.focus();
  }

  function closeForm() {
    form.hidden = true;
    actions.hidden = false;
    hint.hidden = false;
    slot.innerHTML = '';
    formActions.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit report';
    textarea.value = '';
    textarea.classList.remove('is-invalid');
  }

  function readCritical() {
    return form.querySelector('input[name="critical"]:checked')?.value === 'yes';
  }

  function finishFailure({ note, critical, assessment }) {
    const endReason = shouldEndRun({ critical, assessment })
      ? critical
        ? 'critical-failure'
        : 'useful-report'
      : null;

    // recordResponse may already have completed the run on the last task, so
    // the reason is passed in and only a mid-run stop needs endEarly().
    recordResponse(
      {
        taskId: task.id,
        taskNumber,
        status: 'fail',
        note,
        critical,
        assessment,
      },
      endReason
    );

    if (endReason && state.view === 'run') {
      endEarly(endReason);
    }
  }

  async function saveAndFinish(note, critical, button) {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving…';
    try {
      const { assessment } = await submitFailureReport({ note, critical });
      toast('Failure report saved', 'success');
      finishFailure({ note, critical, assessment });
    } catch (err) {
      toast(err?.message || 'Could not save the report', 'error');
      button.disabled = false;
      button.textContent = label;
    }
  }

  function showNeedsDetail(assessment, note, critical) {
    formActions.hidden = true;

    const issues = assessment.issues
      .map(
        (i) =>
          `<li><strong>${esc(i.label)}</strong>${
            i.detail ? `<span>${esc(i.detail)}</span>` : ''
          }</li>`
      )
      .join('');

    const panel = el(`
      <div class="assess assess-warn" role="status">
        <div class="assess-head">
          <span class="assess-icon" aria-hidden="true">!</span>
          <div>
            <strong>This report needs more detail</strong>
            <p class="muted">Quality score ${assessment.score}/100 &middot; ${CONFIG.USEFUL_THRESHOLD} needed to be considered useful</p>
          </div>
        </div>
        <ul class="assess-list">${issues}</ul>
        <div class="assess-actions">
          <button class="btn btn-ghost" type="button" data-edit>Add detail</button>
          ${
            CONFIG.ALLOW_SUBMIT_ANYWAY
              ? `<button class="btn btn-primary" type="button" data-anyway>${
                  critical ? 'Submit anyway &amp; end test' : 'Submit anyway'
                }</button>`
              : ''
          }
        </div>
      </div>
    `);

    slot.replaceChildren(panel);

    panel.querySelector('[data-edit]').addEventListener('click', () => {
      slot.innerHTML = '';
      formActions.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit report';
      textarea.focus();
    });

    panel.querySelector('[data-anyway]')?.addEventListener('click', (ev) => {
      saveAndFinish(note, critical, ev.currentTarget);
    });
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const note = textarea.value.trim();

    if (note.length < 3) {
      textarea.classList.add('is-invalid');
      textarea.focus();
      return;
    }
    textarea.classList.remove('is-invalid');

    const critical = readCritical();
    const label = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking report…';

    let assessment = null;
    try {
      ({ assessment } = await assess(note));
    } catch {
      // Assessment unavailable — fall through and save the report as-is.
    }

    if (!assessment || assessment.useful) {
      submitBtn.textContent = label;
      await saveAndFinish(note, critical, submitBtn);
      return;
    }

    showNeedsDetail(assessment, note, critical);
  });

  node.querySelector('[data-pass]').addEventListener('click', onPass);
  node.querySelector('[data-fail]').addEventListener('click', openForm);
  node.querySelector('[data-cancel]').addEventListener('click', closeForm);
  node.querySelector('[data-back]').addEventListener('click', () => {
    if (session.responses.length === 0 || confirm('Leave this run? Progress will not be saved.')) {
      backToTests();
    }
  });

  /* ------------------------------------------------------------------ */
  /* Shortcuts                                                           */
  /* ------------------------------------------------------------------ */
  node.addEventListener('keydown', (ev) => {
    const tag = ev.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') {
      if (ev.key === 'Escape' && !form.hidden) closeForm();
      return;
    }
    if (ev.key === 'Escape' && !form.hidden) {
      ev.preventDefault();
      closeForm();
      return;
    }
    if (!form.hidden) return;

    const key = ev.key.toLowerCase();
    if (key === 'y') {
      ev.preventDefault();
      onPass();
    } else if (key === 'n') {
      ev.preventDefault();
      openForm();
    }
  });

  return node;
}