import { goHome } from '../store.js';
import { el, esc, formatDuration, formatClock } from '../ui.js';

const STATUS = {
  pass: { label: 'Passed', cls: 'pill-pass' },
  fail: { label: 'Failed', cls: 'pill-fail' },
  skipped: { label: 'Skipped', cls: 'pill-skip' },
};

/** Post-run report. */
export function renderSummary(state) {
  const test = state.test;
  const session = state.session;

  if (!test || !session) {
    return el(`<section class="view"><div class="card">No run to summarise.</div></section>`);
  }

  const answered = session.responses;
  const skipped = test.tasks.slice(answered.length).map((t) => ({
    taskId: t.id,
    status: 'skipped',
    task: t,
  }));

  const rows = [
    ...answered.map((r) => ({
      ...r,
      task: test.tasks.find((t) => String(t.id) === String(r.taskId)) ?? {
        description: r.taskDescription,
      },
    })),
    ...skipped,
  ];

  const passed = rows.filter((r) => r.status === 'pass').length;
  const failed = rows.filter((r) => r.status === 'fail').length;
  const skippedCount = rows.filter((r) => r.status === 'skipped').length;

  const started = new Date(session.startedAt).getTime();
  const ended = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  const duration = formatDuration(ended - started);

  const verdict =
    failed === 0 && skippedCount === 0
      ? { title: 'All tasks passed', tone: 'ok', note: 'Nothing to report — this script is clean.' }
      : failed > 0
        ? {
            title: `${failed} failure${failed === 1 ? '' : 's'} reported`,
            tone: 'bad',
            note: session.endedEarly
              ? 'The run was stopped early; remaining tasks were skipped.'
              : 'Review the failure details below.',
          }
        : { title: 'Run incomplete', tone: 'warn', note: 'Some tasks were not completed.' };

  const node = el(`
    <section class="view view-summary">
      <header class="view-head">
        <p class="eyebrow">Step 3 of 3</p>
        <h1>Run summary</h1>
        <p class="lede">
          <span class="badge badge-id">${esc(test.testNumber)}</span>
          ${esc(test.name)} &middot; ${esc(session.testerName)}
        </p>
      </header>

      <div class="verdict verdict-${verdict.tone}">
        <div>
          <p class="verdict-title">${esc(verdict.title)}</p>
          <p class="verdict-note">${esc(verdict.note)}</p>
        </div>
        <span class="verdict-time">${duration}</span>
      </div>

      <div class="stats">
        <div class="stat">
          <span class="stat-num stat-pass">${passed}</span>
          <span class="stat-label">Passed</span>
        </div>
        <div class="stat">
          <span class="stat-num stat-fail">${failed}</span>
          <span class="stat-label">Failed</span>
        </div>
        <div class="stat">
          <span class="stat-num stat-skip">${skippedCount}</span>
          <span class="stat-label">Skipped</span>
        </div>
        <div class="stat">
          <span class="stat-num">${rows.length}</span>
          <span class="stat-label">Total tasks</span>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">Task results</h2>
        <ol class="result-list">
          ${rows
            .map((r, i) => {
              const meta = STATUS[r.status] ?? STATUS.skipped;
              const assessment = r.assessment;
              return `
              <li class="result-item result-${esc(r.status)}">
                <div class="result-head">
                  <span class="result-num">${i + 1}</span>
                  <div class="result-main">
                    <p class="result-desc">${esc(r.task?.description || '')}</p>
                    <p class="result-sub">
                      ${r.at ? `Recorded ${formatClock(r.at)}` : 'Not reached'}
                      ${r.critical ? '<span class="tag tag-critical">Critical</span>' : ''}
                      ${
                        assessment
                          ? `<span class="tag tag-score" title="Report quality">Report ${assessment.score}/100</span>`
                          : ''
                      }
                    </p>
                  </div>
                  <span class="pill ${meta.cls}">${meta.label}</span>
                </div>
                ${
                  r.note
                    ? `<blockquote class="result-note">${esc(r.note)}</blockquote>`
                    : ''
                }
                ${
                  assessment && !assessment.useful
                    ? `<p class="result-flag">Accepted with low detail — ${
                        assessment.issues?.[0]?.label ?? 'needs review'
                      }.</p>`
                    : ''
                }
              </li>`;
            })
            .join('')}
        </ol>
      </div>

      <div class="summary-actions">
        <button class="btn btn-primary" type="button" data-home>Return to home</button>
        <button class="btn btn-ghost" type="button" data-print>Print / save as PDF</button>
      </div>
    </section>
  `);

  node.querySelector('[data-home]').addEventListener('click', goHome);
  node.querySelector('[data-print]').addEventListener('click', () => window.print());

  return node;
}
