import {
  closeImport,
  finishImport,
  loadImportFile,
  resetImportFile,
  runImport,
} from '../store.js';
import { EXAMPLE, summarise } from '../importer.js';
import { el, esc, toast } from '../ui.js';

/** Read a picked/dropped file and hand its text to the store for validation. */
function readFile(file) {
  if (!file) return;
  if (!/\.json$/i.test(file.name)) {
    toast('That is not a .json file', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => loadImportFile(file.name, String(reader.result));
  reader.onerror = () => toast('Could not read that file', 'error');
  reader.readAsText(file);
}

function downloadExample() {
  const blob = new Blob([JSON.stringify(EXAMPLE, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'test-scripts.example.json';
  a.click();
  URL.revokeObjectURL(url);
}

function picker() {
  return `
    <div class="card import-card">
      <label class="import-drop" data-drop>
        <input class="import-input" type="file" accept=".json,application/json" data-file />
        <span class="import-drop-title">Choose a .json file</span>
        <span class="import-drop-sub">or drop one here</span>
      </label>
      <p class="hint">
        Not sure of the format?
        <button class="link-btn" type="button" data-example>Download an example file</button>
      </p>
    </div>
  `;
}

function errorList(errors) {
  return `
    <div class="alert alert-error">
      <strong>This file can't be imported.</strong>
      <span>Fix the items below, then choose it again.</span>
    </div>
    <ul class="import-errors">
      ${errors
        .map(
          (e) => `<li><code>${esc(e.path)}</code><span>${esc(e.message)}</span></li>`
        )
        .join('')}
    </ul>
  `;
}

function warningList(warnings) {
  if (!warnings.length) return '';
  return `
    <div class="alert alert-warn">
      <strong>Heads up</strong>
      <span>${warnings.map((w) => esc(w)).join(' ')}</span>
    </div>
  `;
}

function preview(state) {
  const { plan, fileName, warnings } = state.import;
  const totals = summarise(plan);

  return `
    ${warningList(warnings)}
    <div class="card">
      <p class="section-title">From <code>${esc(fileName)}</code></p>
      <div class="import-totals">
        <span><strong>${totals.testers}</strong> tester${totals.testers === 1 ? '' : 's'}</span>
        <span><strong>${totals.scripts}</strong> script${totals.scripts === 1 ? '' : 's'}</span>
        <span><strong>${totals.tasks}</strong> task${totals.tasks === 1 ? '' : 's'}</span>
      </div>
      <ul class="import-plan">
        ${plan.scripts
          .map(
            (s, i) => `
          <li>
            <span class="import-plan-num">${i + 1}</span>
            <span class="import-plan-main">
              <span class="import-plan-assignee">${esc(s.assigned)}</span>
              <span class="import-plan-tasks">${s.tasks.length} task${
                s.tasks.length === 1 ? '' : 's'
              } &middot; ${esc(s.tasks[0]?.description || '')}</span>
            </span>
          </li>`
          )
          .join('')}
      </ul>
      <p class="field-help">
        Scripts are titled automatically, continuing from any existing
        &ldquo;Test Script&nbsp;N&rdquo;. Testers are matched by name; missing ones are created.
      </p>
    </div>
    <div class="actions">
      <button class="btn btn-primary" type="button" data-run>
        Import ${totals.scripts} script${totals.scripts === 1 ? '' : 's'}
      </button>
      <button class="btn btn-ghost" type="button" data-reset>Choose a different file</button>
    </div>
  `;
}

function running(state) {
  const { progress, plan } = state.import;
  const totals = summarise(plan);
  const total = progress?.total || 0;
  const step = progress?.step || 0;
  const pct = total ? Math.round((step / total) * 100) : 0;

  return `
    <div class="card">
      <p class="section-title">Importing&hellip; ${step} / ${total}</p>
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
      <p class="hint">${esc(progress?.label || 'Starting…')}</p>
      <p class="field-help">
        Creating ${totals.scripts} script${totals.scripts === 1 ? '' : 's'} and
        ${totals.tasks} task${totals.tasks === 1 ? '' : 's'}. Keep this tab open.
      </p>
    </div>
  `;
}

function done(state) {
  const { result } = state.import;
  const created = result.testersCreated.length;
  const matched = result.testersMatched.length;
  const tasks = result.scripts.reduce((n, s) => n + s.taskCount, 0);

  return `
    <div class="alert alert-ok" role="status">
      <strong>Import complete.</strong>
      <span>${result.scripts.length} script${result.scripts.length === 1 ? '' : 's'} and
      ${tasks} task${tasks === 1 ? '' : 's'} created.</span>
    </div>
    <div class="card">
      <p class="section-title">What was created</p>
      <ul class="import-plan">
        ${result.scripts
          .map(
            (s) => `
          <li>
            <span class="import-plan-main">
              <span class="import-plan-assignee">${esc(s.label)}</span>
              <span class="import-plan-tasks">assigned to ${esc(s.assigned)} &middot; ${
                s.taskCount
              } task${s.taskCount === 1 ? '' : 's'}</span>
            </span>
          </li>`
          )
          .join('')}
      </ul>
      <p class="field-help">
        Testers: ${created} created${matched ? `, ${matched} already existed` : ''}.
      </p>
    </div>
    <div class="actions">
      <button class="btn btn-primary" type="button" data-finish>Back to testers</button>
    </div>
  `;
}

function failed(state) {
  return `
    <div class="alert alert-error">
      <strong>The import failed.</strong>
      <span>${esc(state.import.error)}</span>
    </div>
    <p class="field-help">
      Anything created before the failure is still on the server. Check the backend is running,
      then open the import screen again to retry the rest.
    </p>
    <div class="actions">
      <button class="btn btn-primary" type="button" data-finish>Back to testers</button>
    </div>
  `;
}

/** Import screen: pick a JSON file, review it, then create it on the server. */
export function renderImportScripts(state) {
  const imp = state.import;

  let body;
  if (imp.phase === 'running') body = running(state);
  else if (imp.phase === 'done') body = done(state);
  else if (imp.phase === 'error') body = failed(state);
  else if (imp.phase === 'preview') body = preview(state);
  else if (imp.errors.length) body = errorList(imp.errors) + picker();
  else body = picker();

  const node = el(`
    <section class="view view-import">
      <header class="view-head">
        <p class="eyebrow">Import</p>
        <h1>Load test scripts</h1>
        <p class="lede">
          Pick a <code>.json</code> file. Each script is created on the server, assigned to the
          tester named in the file, and titled automatically.
        </p>
      </header>
      ${body}
      ${
        imp.phase === 'idle' && !imp.errors.length
          ? `<div class="actions"><button class="btn btn-ghost" type="button" data-cancel>Cancel</button></div>`
          : ''
      }
    </section>
  `);

  const input = node.querySelector('[data-file]');
  input?.addEventListener('change', () => readFile(input.files?.[0]));

  const drop = node.querySelector('[data-drop]');
  if (drop) {
    drop.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      drop.classList.add('is-over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', (ev) => {
      ev.preventDefault();
      drop.classList.remove('is-over');
      readFile(ev.dataTransfer?.files?.[0]);
    });
  }

  node.querySelector('[data-example]')?.addEventListener('click', downloadExample);
  node.querySelector('[data-run]')?.addEventListener('click', () => runImport());
  node.querySelector('[data-reset]')?.addEventListener('click', () => resetImportFile());
  node.querySelector('[data-cancel]')?.addEventListener('click', () => closeImport());
  node.querySelector('[data-finish]')?.addEventListener('click', () => finishImport());

  return node;
}
