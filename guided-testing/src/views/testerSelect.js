import { chooseTester, openImport } from '../store.js';
import { el, esc, initials, avatarHue, skeleton } from '../ui.js';

/** Landing screen: pick which tester you are. */
export function renderTesterSelect(state) {
  const body = state.loading
    ? `<div class="card">${skeleton(2)}</div>`
    : state.error
      ? `<div class="alert alert-error"><strong>Could not load testers.</strong><span>${esc(
          state.error
        )}</span></div>`
      : `<ul class="tester-grid">
          ${state.testers
            .map(
              (t) => `
            <li>
              <button class="tester-card" type="button" data-tester-id="${esc(t.id)}">
                <span class="avatar" style="--hue:${avatarHue(t.name)}">${esc(
                  initials(t.name)
                )}</span>
                <span class="tester-meta">
                  <span class="tester-name">${esc(t.name)}</span>
                  <span class="tester-role">${esc(t.role || 'Tester')}</span>
                </span>
                <span class="chev" aria-hidden="true">&rarr;</span>
              </button>
            </li>`
            )
            .join('')}
        </ul>`;

  const banner = state.backendWarning
    ? `<div class="alert alert-warn" role="status">
         <strong>Backend warning</strong>
         <span>${esc(state.backendWarning)}</span>
       </div>`
    : '';

  const node = el(`
    <section class="view view-select">
      <header class="view-head">
        <p class="eyebrow">Step 1 of 3</p>
        <h1>Who is testing today?</h1>
        <p class="lede">Select your name to see the test scripts assigned to you.</p>
      </header>
      ${banner}
      ${body}
      ${
        state.loading
          ? ''
          : `<div class="actions actions-center">
               <button class="btn btn-ghost" type="button" data-import>
                 Import test scripts&hellip;
               </button>
             </div>`
      }
    </section>
  `);

  node.querySelectorAll('[data-tester-id]').forEach((btn) => {
    btn.addEventListener('click', () => chooseTester(btn.dataset.testerId));
  });

  node.querySelector('[data-import]')?.addEventListener('click', () => openImport());

  return node;
}
