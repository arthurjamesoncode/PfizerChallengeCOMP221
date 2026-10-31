import { state, onChange, render, goHome, loadTesters } from './store.js';
import { resetMockData } from './api.js';
import { CONFIG } from './config.js';
import { toast, esc } from './ui.js';
import { renderTesterSelect } from './views/testerSelect.js';
import { renderTestList } from './views/testList.js';
import { renderRunTest } from './views/runTest.js';
import { renderSummary } from './views/summary.js';
import { renderImportScripts } from './views/importScripts.js';

const root = document.getElementById('app');
const topbarRight = document.getElementById('topbar-right');

const views = {
  select: renderTesterSelect,
  tests: renderTestList,
  run: renderRunTest,
  summary: renderSummary,
  import: renderImportScripts,
};

function paintTopbar() {
  if (!topbarRight) return;

  if (state.view === 'select' || state.view === 'import' || !state.tester) {
    topbarRight.innerHTML = '';
    return;
  }

  if (state.view === 'tests') {
    topbarRight.innerHTML = '';
    return;
  }

  const test = state.test;
  topbarRight.innerHTML = `
    <span class="topbar-chip">
      ${test ? `${test.testNumber}` : ''}
      <span class="topbar-sep">·</span>
      ${state.tester.name}
    </span>
  `;
}

function paint() {
  paintTopbar();
  const node = views[state.view](state);
  root.replaceChildren(node);

  // The run view owns keyboard shortcuts, so give it focus once it is attached.
  if (state.view === 'run' && node instanceof HTMLElement && node.hasAttribute('tabindex')) {
    node.focus({ preventScroll: true });
  }
}

onChange(paint);

document.getElementById('brand-home')?.addEventListener('click', (ev) => {
  ev.preventDefault();
  if (state.view === 'run') {
    if (!confirm('Leave this run? Progress will not be saved.')) return;
  }
  goHome();
});

document.getElementById('reset-demo')?.addEventListener('click', () => {
  resetMockData();
  toast('Demo data cleared', 'success');
  goHome();
});

// Tell the user which backend they are looking at.
const modeNote = document.querySelector('.footer .footer-note');
if (modeNote) {
  modeNote.innerHTML = CONFIG.MOCK
    ? 'Demo data &middot; no server required'
    : `Connected to <code>${esc(CONFIG.BASE_URL)}</code>`;
}

// Boot
loadTesters();
paint();
