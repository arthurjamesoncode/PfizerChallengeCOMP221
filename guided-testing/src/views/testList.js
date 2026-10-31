import { startTest, goHome } from '../store.js';
import { el, esc, initials, avatarHue, skeleton } from '../ui.js';

/** All scripts assigned to the chosen tester. */
export function renderTestList(state) {
  const tester = state.tester;

  const body = state.loading
    ? `<div class="card">${skeleton(3)}</div>`
    : state.error
      ? `<div class="alert alert-error"><strong>Could not load tests.</strong><span>${esc(
          state.error
        )}</span></div>`
      : state.tests.length === 0
        ? `<div class="empty">
             <p class="empty-title">No test scripts assigned</p>
             <p class="muted">${esc(tester?.name || 'This tester')} has nothing queued right now.</p>
           </div>`
        : `<ul class="test-list">
            ${state.tests
              .map(
                (t, i) => `
              <li class="test-row" style="--i:${i}">
                <div class="test-row-main">
                  <div class="test-row-top">
                    <span class="badge badge-id">${esc(t.testNumber)}</span>
                    ${
                      t.taskCount != null
                        ? `<span class="badge">${t.taskCount} task${t.taskCount === 1 ? '' : 's'}</span>`
                        : ''
                    }
                  </div>
                  <h2 class="test-name">${esc(t.name)}</h2>
                  ${t.description ? `<p class="test-desc">${esc(t.description)}</p>` : ''}
                </div>
                <button class="btn btn-primary" type="button" data-start-test="${esc(t.id)}">
                  Start
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </li>`
              )
              .join('')}
          </ul>`;

  const node = el(`
    <section class="view view-tests">
      <header class="view-head view-head-row">
        <div>
          <p class="eyebrow">Step 2 of 3</p>
          <h1>Your test scripts</h1>
          <p class="lede">
            ${state.tests.length} script${state.tests.length === 1 ? '' : 's'} assigned to
            <strong>${esc(tester?.name || '')}</strong>.
          </p>
        </div>
        <div class="identity">
          <span class="avatar avatar-sm" style="--hue:${avatarHue(tester?.name || '')}">
            ${esc(initials(tester?.name || ''))}
          </span>
          <span class="identity-meta">
            <span class="identity-name">${esc(tester?.name || '')}</span>
            <button class="link-btn" type="button" data-switch-tester>Switch tester</button>
          </span>
        </div>
      </header>
      ${body}
    </section>
  `);

  node.querySelectorAll('[data-start-test]').forEach((btn) => {
    btn.addEventListener('click', () => startTest(btn.dataset.startTest));
  });
  node.querySelector('[data-switch-tester]')?.addEventListener('click', goHome);

  return node;
}
