'use strict';

const DRAFT_KEY = 'knee_prehab_draft';

const State = {
  data: null,
  activeTier: '1-2',
  draft: {
    assessmentRun: false,
    baselineInputs: {},
    exerciseInputs: {},
    editingSessionIndex: null,
    editingDate: null,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

function exType(ex) {
  if (ex.reps !== null && ex.reps.includes('each')) return 'bilateral';
  if (ex.reps !== null) return 'standard';
  return 'duration';
}

function durationSec(ex) {
  if (ex.duration_sec) return ex.duration_sec;
  if (ex.duration_min) return ex.duration_min * 60;
  return null;
}

function formatDuration(sec) {
  if (!sec) return '';
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? m + 'm ' + s + 's' : m + 'm';
}

function buildMeta(ex) {
  const parts = [];
  const type = exType(ex);
  if (type === 'duration') {
    parts.push(ex.sets + ' × ' + formatDuration(durationSec(ex)));
  } else {
    parts.push(ex.sets + ' × ' + ex.reps + ' reps');
  }
  if (ex.tempo) parts.push('Tempo ' + ex.tempo);
  if (ex.rpe) parts.push('RPE ' + ex.rpe);
  if (ex.rest_sec) parts.push('Rest ' + formatDuration(ex.rest_sec));
  return parts.join('  ·  ');
}

function getProgressionTip(ex, tier) {
  if (!ex.progression) return null;
  // Exact match first
  let tip = ex.progression.find(p => p.weeks === tier);
  if (tip) return tip.instruction;
  // 'all' wildcard
  tip = ex.progression.find(p => p.weeks === 'all');
  if (tip) return tip.instruction;
  // Prefix match: "3+" matches "3-4" and "5+"
  if (tier === '3-4' || tier === '5+') {
    tip = ex.progression.find(p => p.weeks === '3+');
    if (tip) return tip.instruction;
  }
  return null;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ── Draft ────────────────────────────────────────────────────────────

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(State.draft));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
  State.draft = { assessmentRun: false, baselineInputs: {}, exerciseInputs: {}, editingSessionIndex: null, editingDate: null };
}

function initExerciseDraft(name, type, sets) {
  if (State.draft.exerciseInputs[name]) return;
  if (type === 'duration') {
    State.draft.exerciseInputs[name] = { completed: false };
  } else if (type === 'bilateral') {
    State.draft.exerciseInputs[name] = {
      weight_kg: '',
      sets: Array.from({ length: sets }, () => ({ left_reps: '', right_reps: '' })),
    };
  } else {
    State.draft.exerciseInputs[name] = {
      weight_kg: '',
      sets: Array.from({ length: sets }, () => ({ reps: '', rpe: '' })),
    };
  }
}

// ── Render: Workout ──────────────────────────────────────────────────

function renderBlocks(blocks, tier) {
  const container = document.getElementById('blocks-container');
  container.innerHTML = '';
  blocks.forEach(block => {
    const card = el('section', 'block-card');
    const titleRow = el('div', 'block-title');
    titleRow.appendChild(el('span', null, block.name));
    titleRow.appendChild(el('span', 'block-time', block.time_min + ' min'));
    card.appendChild(titleRow);
    const list = el('div', 'exercises-list');
    block.exercises.forEach(ex => list.appendChild(renderExerciseRow(ex, tier)));
    card.appendChild(list);
    container.appendChild(card);
  });
}

function renderExerciseRow(ex, tier) {
  const type = exType(ex);
  initExerciseDraft(ex.name, type, ex.sets);

  const row = el('div', 'exercise-row');
  row.dataset.exerciseName = ex.name;

  // Header
  const header = el('div', 'exercise-header');
  header.appendChild(el('span', 'exercise-name', ex.name));
  header.appendChild(el('span', 'exercise-meta', buildMeta(ex)));

  // Notes toggle
  const toggleBtn = el('button', 'notes-toggle', 'Info');
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.setAttribute('type', 'button');
  header.appendChild(toggleBtn);
  row.appendChild(header);

  // Notes panel
  const notesPanel = el('div', 'notes-panel');
  notesPanel.hidden = true;
  notesPanel.appendChild(el('p', null, ex.notes));
  const tip = getProgressionTip(ex, tier);
  if (tip) {
    const tipEl = el('p', 'progression-tip', 'Wks ' + tier + ': ' + tip);
    tipEl.dataset.progressionTip = '1';
    notesPanel.appendChild(tipEl);
  }
  row.appendChild(notesPanel);

  toggleBtn.addEventListener('click', () => {
    const open = notesPanel.hidden === false;
    notesPanel.hidden = open;
    toggleBtn.setAttribute('aria-expanded', String(!open));
  });

  // Log inputs
  const logDiv = el('div', 'log-inputs');

  if (type === 'duration') {
    const sec = durationSec(ex);
    const label = el('label', 'checkbox-label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.field = 'completed';
    cb.checked = !!(State.draft.exerciseInputs[ex.name] && State.draft.exerciseInputs[ex.name].completed);
    label.appendChild(cb);
    label.appendChild(document.createTextNode('Completed' + (sec ? ' (' + formatDuration(sec) + ')' : '')));
    logDiv.appendChild(label);
  } else {
    // Weight input
    const weightLabel = el('label', 'weight-label');
    weightLabel.appendChild(el('span', null, 'Weight (kg)'));
    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.inputMode = 'decimal';
    weightInput.min = '0';
    weightInput.step = '0.5';
    weightInput.placeholder = '0';
    weightInput.dataset.field = 'weight_kg';
    const draftEx = State.draft.exerciseInputs[ex.name];
    if (draftEx && draftEx.weight_kg !== '') weightInput.value = draftEx.weight_kg;
    weightLabel.appendChild(weightInput);
    logDiv.appendChild(weightLabel);

    // Sets table
    const table = el('table', 'sets-table');
    const thead = el('thead');
    const headRow = el('tr');
    headRow.appendChild(el('th', null, 'Set'));
    if (type === 'bilateral') {
      headRow.appendChild(el('th', null, ''));
      headRow.appendChild(el('th', null, 'Reps'));
    } else {
      headRow.appendChild(el('th', null, 'Reps'));
      headRow.appendChild(el('th', null, 'RPE'));
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    for (let i = 0; i < ex.sets; i++) {
      const setDraft = draftEx && draftEx.sets ? draftEx.sets[i] : null;

      if (type === 'bilateral') {
        // One row per side per set
        ['left', 'right'].forEach(side => {
          const tr = el('tr');
          if (side === 'left') {
            const setNumCell = el('td', 'set-num');
            setNumCell.textContent = i + 1;
            setNumCell.rowSpan = 2;
            tr.appendChild(setNumCell);
          }
          tr.appendChild(el('td', 'side-label', side === 'left' ? 'L' : 'R'));
          const repsCell = el('td');
          const repsInput = document.createElement('input');
          repsInput.type = 'number';
          repsInput.inputMode = 'numeric';
          repsInput.min = '0';
          repsInput.placeholder = targetReps(ex.reps);
          repsInput.dataset.field = side === 'left' ? 'left_reps' : 'right_reps';
          repsInput.dataset.setIndex = i;
          if (setDraft) {
            const val = side === 'left' ? setDraft.left_reps : setDraft.right_reps;
            if (val !== '') repsInput.value = val;
          }
          repsCell.appendChild(repsInput);
          tr.appendChild(repsCell);
          tbody.appendChild(tr);
        });
      } else {
        const tr = el('tr');
        tr.appendChild(el('td', 'set-num', String(i + 1)));

        const repsCell = el('td');
        const repsInput = document.createElement('input');
        repsInput.type = 'number';
        repsInput.inputMode = 'numeric';
        repsInput.min = '0';
        repsInput.placeholder = targetReps(ex.reps);
        repsInput.dataset.field = 'reps';
        repsInput.dataset.setIndex = i;
        if (setDraft && setDraft.reps !== '') repsInput.value = setDraft.reps;
        repsCell.appendChild(repsInput);
        tr.appendChild(repsCell);

        const rpeCell = el('td');
        const rpeInput = document.createElement('input');
        rpeInput.type = 'number';
        rpeInput.inputMode = 'decimal';
        rpeInput.min = '0';
        rpeInput.max = '10';
        rpeInput.step = '0.5';
        rpeInput.placeholder = '–';
        rpeInput.dataset.field = 'rpe';
        rpeInput.dataset.setIndex = i;
        if (setDraft && setDraft.rpe !== '') rpeInput.value = setDraft.rpe;
        rpeCell.appendChild(rpeInput);
        tr.appendChild(rpeCell);

        tbody.appendChild(tr);
      }
    }
    table.appendChild(tbody);
    logDiv.appendChild(table);
  }

  row.appendChild(logDiv);
  return row;
}

// Extract numeric part from reps like "6-8", "10", "8 each leg" → "6"
function targetReps(repsStr) {
  if (!repsStr) return '';
  const match = repsStr.match(/\d+/);
  return match ? match[0] : '';
}

// ── Render: Assessment ───────────────────────────────────────────────

function renderAssessmentTests(tests) {
  const container = document.getElementById('tests-container');
  container.innerHTML = '';
  tests.forEach(test => {
    const card = el('div', 'test-card');
    card.dataset.testId = test.id;

    const h3 = el('h3');
    h3.appendChild(document.createTextNode(test.name + ' '));
    h3.appendChild(el('span', 'test-unit', unitLabel(test.unit)));
    card.appendChild(h3);

    card.appendChild(el('p', 'test-instructions', test.instructions));
    card.appendChild(el('p', 'test-target', 'Target: ' + test.target + ' ' + unitShort(test.unit)));

    const inputsDiv = el('div', test.bilateral ? 'test-inputs bilateral' : 'test-inputs');

    if (test.bilateral) {
      ['left', 'right'].forEach(side => {
        const label = el('label');
        label.appendChild(el('span', null, side.charAt(0).toUpperCase() + side.slice(1)));
        const input = document.createElement('input');
        input.type = 'number';
        input.inputMode = 'decimal';
        input.min = '0';
        if (test.unit === 'score_0_10') { input.max = '10'; input.step = '0.5'; }
        input.dataset.side = side;
        // Restore from draft
        const d = State.draft.baselineInputs[test.id];
        if (d && d[side] !== undefined && d[side] !== '') input.value = d[side];
        label.appendChild(input);
        inputsDiv.appendChild(label);
      });
    } else {
      const label = el('label');
      label.appendChild(el('span', null, unitLabel(test.unit)));
      const input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'decimal';
      input.min = '0';
      if (test.unit === 'score_0_10') { input.max = '10'; input.step = '0.5'; }
      input.dataset.side = 'value';
      const d = State.draft.baselineInputs[test.id];
      if (d && d.value !== undefined && d.value !== '') input.value = d.value;
      label.appendChild(input);
      inputsDiv.appendChild(label);
    }

    card.appendChild(inputsDiv);
    container.appendChild(card);
  });
}

function unitLabel(unit) {
  if (unit === 'sec') return 'seconds';
  if (unit === 'reps') return 'reps';
  if (unit === 'score_0_10') return '0–10 score';
  return unit;
}

function unitShort(unit) {
  if (unit === 'sec') return 's';
  if (unit === 'reps') return 'reps';
  if (unit === 'score_0_10') return '/10';
  return unit;
}

// ── Load session into draft for editing ──────────────────────────────

function loadSessionIntoDraft(session, sessionIndex) {
  clearDraft();
  State.draft.editingSessionIndex = sessionIndex;
  State.draft.editingDate = session.date;

  if (session.baseline_results && session.baseline_results.length > 0) {
    State.draft.assessmentRun = true;
    session.baseline_results.forEach(r => {
      if (!State.draft.baselineInputs[r.test_id]) State.draft.baselineInputs[r.test_id] = {};
      if (r.side) {
        State.draft.baselineInputs[r.test_id][r.side] = String(r.value);
      } else {
        State.draft.baselineInputs[r.test_id].value = String(r.value);
      }
    });
  }

  (session.exercise_logs || []).forEach(log => {
    let ex = null;
    for (const block of State.data.blocks) {
      ex = block.exercises.find(e => e.name === log.exercise_name);
      if (ex) break;
    }
    if (!ex) return;

    const type = exType(ex);
    const sets = log.sets_completed || [];

    if (type === 'duration') {
      State.draft.exerciseInputs[log.exercise_name] = { completed: sets.length > 0 };
    } else if (type === 'bilateral') {
      const weight = sets.length > 0 && sets[0].weight_kg !== null ? String(sets[0].weight_kg) : '';
      const pairedSets = [];
      for (let i = 0; i < sets.length; i += 2) {
        pairedSets.push({
          left_reps: sets[i] && sets[i].reps !== null ? String(sets[i].reps) : '',
          right_reps: sets[i + 1] && sets[i + 1].reps !== null ? String(sets[i + 1].reps) : '',
        });
      }
      State.draft.exerciseInputs[log.exercise_name] = { weight_kg: weight, sets: pairedSets };
    } else {
      const weight = sets.length > 0 && sets[0].weight_kg !== null ? String(sets[0].weight_kg) : '';
      const mappedSets = sets.map(s => ({
        reps: s.reps !== null ? String(s.reps) : '',
        rpe: s.rpe_actual !== null ? String(s.rpe_actual) : '',
      }));
      State.draft.exerciseInputs[log.exercise_name] = { weight_kg: weight, sets: mappedSets };
    }
  });

  saveDraft();
  renderBlocks(State.data.blocks, State.activeTier);
  document.getElementById('btn-finish').textContent = 'Update & Export Session';
  switchTab('workout');
}

// ── Render: History ──────────────────────────────────────────────────

function renderHistory(sessions, tests) {
  const container = document.getElementById('history-container');
  container.innerHTML = '';

  if (!sessions || sessions.length === 0) {
    container.appendChild(el('p', 'empty-state', 'No sessions logged yet.'));
    return;
  }

  const testMap = {};
  tests.forEach(t => { testMap[t.id] = t; });

  [...sessions].reverse().forEach((session, reversedIdx) => {
    const origIdx = sessions.length - 1 - reversedIdx;
    const card = el('div', 'history-card');

    const cardHeader = el('div', 'history-card-header');
    cardHeader.appendChild(el('div', 'history-date', session.date));
    const editBtn = el('button', 'history-edit-btn', 'Edit');
    editBtn.addEventListener('click', () => loadSessionIntoDraft(session, origIdx));
    cardHeader.appendChild(editBtn);
    card.appendChild(cardHeader);

    const exList = el('ul', 'history-exercises');
    (session.exercise_logs || []).forEach(log => {
      const li = el('li');
      const sets = log.sets_completed || [];
      const hasDuration = sets.some(s => s.duration_sec !== null && s.duration_sec !== undefined);
      const weight = sets.length > 0 && sets[0].weight_kg ? sets[0].weight_kg + ' kg · ' : '';
      let detail;
      if (hasDuration) {
        detail = formatDuration(sets[0].duration_sec) + (sets.length > 1 ? ' × ' + sets.length : '');
      } else {
        const reps = sets.map(s => s.reps).filter(r => r !== null && r !== undefined);
        const uniqueReps = [...new Set(reps)];
        detail = weight + sets.length + ' sets · ' + (uniqueReps.length === 1 ? uniqueReps[0] : uniqueReps.join('/')) + ' reps';
      }
      li.innerHTML = '<strong>' + escHtml(log.exercise_name) + '</strong> — ' + escHtml(detail);
      exList.appendChild(li);
    });
    card.appendChild(exList);

    const baseline = (session.baseline_results || []);
    if (baseline.length > 0) {
      const details = el('details', 'history-assessment');
      const summary = el('summary', null, 'Assessment Results');
      details.appendChild(summary);
      const ul = el('ul');
      // Group by test_id
      const grouped = {};
      baseline.forEach(r => {
        if (!grouped[r.test_id]) grouped[r.test_id] = [];
        grouped[r.test_id].push(r);
      });
      Object.entries(grouped).forEach(([id, results]) => {
        const test = testMap[id];
        const name = test ? test.name : id;
        const li = el('li');
        const vals = results.map(r => (r.side ? r.side + ': ' + r.value : r.value) + unitShort(test ? test.unit : '')).join('  ·  ');
        li.textContent = name + ' — ' + vals;
        ul.appendChild(li);
      });
      details.appendChild(ul);
      card.appendChild(details);
    }

    container.appendChild(card);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Update progression tips when tier changes ────────────────────────

function updateProgressionTips(tier) {
  const rows = document.querySelectorAll('#blocks-container .exercise-row');
  rows.forEach(row => {
    const name = row.dataset.exerciseName;
    const block = State.data.blocks.find(b => b.exercises.some(e => e.name === name));
    if (!block) return;
    const ex = block.exercises.find(e => e.name === name);
    if (!ex) return;
    const tipEl = row.querySelector('[data-progression-tip]');
    const tip = getProgressionTip(ex, tier);
    if (tipEl && tip) {
      tipEl.textContent = 'Wks ' + tier + ': ' + tip;
    } else if (!tipEl && tip) {
      // Create tip if it wasn't there before (exercise has a 'all' wildcard that was missed)
      const notesPanel = row.querySelector('.notes-panel');
      if (notesPanel) {
        const tipElNew = el('p', 'progression-tip', 'Wks ' + tier + ': ' + tip);
        tipElNew.dataset.progressionTip = '1';
        notesPanel.appendChild(tipElNew);
      }
    } else if (tipEl && !tip) {
      tipEl.remove();
    }
  });
}

// ── Input handling ───────────────────────────────────────────────────

function handleInputChange(e) {
  const input = e.target;
  const exerciseRow = input.closest('.exercise-row');
  const testCard = input.closest('.test-card');

  if (exerciseRow) {
    const name = exerciseRow.dataset.exerciseName;
    const field = input.dataset.field;
    const setIndex = input.dataset.setIndex !== undefined ? parseInt(input.dataset.setIndex, 10) : null;
    const d = State.draft.exerciseInputs[name];
    if (!d) return;

    if (field === 'completed') {
      d.completed = input.checked;
    } else if (field === 'weight_kg') {
      d.weight_kg = input.value;
    } else if (field === 'reps' || field === 'rpe') {
      if (d.sets && d.sets[setIndex] !== undefined) {
        d.sets[setIndex][field] = input.value;
      }
    } else if (field === 'left_reps' || field === 'right_reps') {
      if (d.sets && d.sets[setIndex] !== undefined) {
        d.sets[setIndex][field] = input.value;
      }
    }
    saveDraft();
  } else if (testCard) {
    const testId = testCard.dataset.testId;
    const side = input.dataset.side;
    if (!State.draft.baselineInputs[testId]) State.draft.baselineInputs[testId] = {};
    State.draft.baselineInputs[testId][side] = input.value;
    saveDraft();
  }
}

// ── Tab switching ────────────────────────────────────────────────────

function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.hidden = true;
    p.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('tab-' + tab);
  if (panel) { panel.hidden = false; panel.classList.add('active'); }
  const btn = document.querySelector('.tab-btn[data-tab="' + tab + '"]');
  if (btn) btn.classList.add('active');
}

// ── Session building & export ────────────────────────────────────────

function buildSessionObject() {
  let date;
  if (State.draft.editingDate) {
    date = State.draft.editingDate;
  } else {
    const today = new Date();
    date = today.getFullYear() + '-'
      + String(today.getMonth() + 1).padStart(2, '0') + '-'
      + String(today.getDate()).padStart(2, '0');
  }

  const session = {
    date,
    baseline_results: [],
    exercise_logs: [],
  };

  // Baseline
  if (State.draft.assessmentRun) {
    (State.data.baseline_tests || []).forEach(test => {
      const d = State.draft.baselineInputs[test.id];
      if (!d) return;
      if (test.bilateral) {
        ['left', 'right'].forEach(side => {
          if (d[side] !== undefined && d[side] !== '') {
            session.baseline_results.push({ test_id: test.id, value: parseFloat(d[side]), side });
          }
        });
      } else {
        if (d.value !== undefined && d.value !== '') {
          session.baseline_results.push({ test_id: test.id, value: parseFloat(d.value) });
        }
      }
    });
  }

  // Exercises
  State.data.blocks.forEach(block => {
    block.exercises.forEach(ex => {
      const type = exType(ex);
      const d = State.draft.exerciseInputs[ex.name];
      if (!d) return;

      const log = { exercise_name: ex.name, sets_completed: [] };

      if (type === 'duration') {
        if (d.completed) {
          const sec = durationSec(ex);
          log.sets_completed.push({
            reps: null,
            weight_kg: null,
            duration_sec: sec,
            side: null,
            rpe_actual: null,
          });
        }
      } else if (type === 'bilateral') {
        const weight = d.weight_kg !== '' ? parseFloat(d.weight_kg) : null;
        (d.sets || []).forEach(s => {
          ['left', 'right'].forEach(side => {
            const repsVal = side === 'left' ? s.left_reps : s.right_reps;
            log.sets_completed.push({
              reps: repsVal !== '' ? parseInt(repsVal, 10) : null,
              weight_kg: weight,
              duration_sec: null,
              side,
              rpe_actual: null,
            });
          });
        });
      } else {
        const weight = d.weight_kg !== '' ? parseFloat(d.weight_kg) : null;
        (d.sets || []).forEach(s => {
          log.sets_completed.push({
            reps: s.reps !== '' ? parseInt(s.reps, 10) : null,
            weight_kg: weight,
            duration_sec: null,
            side: null,
            rpe_actual: s.rpe !== '' ? parseFloat(s.rpe) : null,
          });
        });
      }

      // Include exercise even if no sets completed (empty sets_completed is valid)
      session.exercise_logs.push(log);
    });
  });

  return session;
}

function triggerDownload(data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function finishSession() {
  const session = buildSessionObject();
  const updated = JSON.parse(JSON.stringify(State.data)); // deep clone
  if (!updated.sessions) updated.sessions = [];
  if (State.draft.editingSessionIndex !== null) {
    updated.sessions[State.draft.editingSessionIndex] = session;
  } else {
    updated.sessions.push(session);
  }
  triggerDownload(updated);
  clearDraft();
  document.getElementById('btn-finish').textContent = 'Finish & Export Session';
  // Re-render workout with fresh inputs
  renderBlocks(State.data.blocks, State.activeTier);
}

// ── Assessment save ──────────────────────────────────────────────────

function saveAssessment() {
  State.draft.assessmentRun = true;
  saveDraft();
  switchTab('workout');
  // Simple feedback: briefly change button text
  const btn = document.getElementById('btn-save-assessment');
  const orig = btn.textContent;
  btn.textContent = 'Saved!';
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

// ── Draft restore ────────────────────────────────────────────────────

function restoreDraft(stored) {
  State.draft = stored;
  // Re-populate DOM inputs after render
  populateDraftInputs();
}

function populateDraftInputs() {
  // Exercise inputs
  Object.entries(State.draft.exerciseInputs).forEach(([name, d]) => {
    const row = document.querySelector('.exercise-row[data-exercise-name="' + CSS.escape(name) + '"]');
    if (!row) return;
    if (d.completed !== undefined) {
      const cb = row.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = d.completed;
    }
    if (d.weight_kg !== undefined) {
      const wi = row.querySelector('input[data-field="weight_kg"]');
      if (wi && d.weight_kg !== '') wi.value = d.weight_kg;
    }
    if (d.sets) {
      d.sets.forEach((s, i) => {
        Object.entries(s).forEach(([field, val]) => {
          if (val === '') return;
          const inp = row.querySelector('input[data-field="' + field + '"][data-set-index="' + i + '"]');
          if (inp) inp.value = val;
        });
      });
    }
  });

  // Baseline inputs
  Object.entries(State.draft.baselineInputs).forEach(([testId, d]) => {
    const card = document.querySelector('.test-card[data-test-id="' + CSS.escape(testId) + '"]');
    if (!card) return;
    Object.entries(d).forEach(([side, val]) => {
      if (val === '' || val === undefined) return;
      const inp = card.querySelector('input[data-side="' + side + '"]');
      if (inp) inp.value = val;
    });
  });
}

// ── Init ─────────────────────────────────────────────────────────────

async function init() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    State.data = await res.json();
  } catch (err) {
    document.getElementById('loading-overlay').hidden = true;
    const banner = document.getElementById('error-banner');
    banner.hidden = false;
    banner.textContent = 'Failed to load data.json. Run: python3 -m http.server and open http://localhost:8000';
    return;
  }

  // Render all tabs
  renderBlocks(State.data.blocks, State.activeTier);
  renderAssessmentTests(State.data.baseline_tests);
  renderHistory(State.data.sessions, State.data.baseline_tests);

  // Check for stored draft
  const storedRaw = localStorage.getItem(DRAFT_KEY);
  if (storedRaw) {
    try {
      const stored = JSON.parse(storedRaw);
      document.getElementById('draft-banner').hidden = false;

      document.getElementById('btn-restore-draft').addEventListener('click', () => {
        document.getElementById('draft-banner').hidden = true;
        restoreDraft(stored);
      });

      document.getElementById('btn-discard-draft').addEventListener('click', () => {
        document.getElementById('draft-banner').hidden = true;
        clearDraft();
        renderBlocks(State.data.blocks, State.activeTier);
      });
    } catch (_) {
      localStorage.removeItem(DRAFT_KEY);
    }
  }

  // Show app
  document.getElementById('loading-overlay').hidden = true;
  document.getElementById('app').hidden = false;
  document.getElementById('tab-bar').hidden = false;

  // Tab bar
  document.getElementById('tab-bar').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });

  // Tier selector
  document.getElementById('tier-selector').addEventListener('click', e => {
    const btn = e.target.closest('.tier-btn');
    if (!btn) return;
    document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    State.activeTier = btn.dataset.tier;
    updateProgressionTips(State.activeTier);
  });

  // Finish session
  document.getElementById('btn-finish').addEventListener('click', finishSession);

  // Save assessment
  document.getElementById('btn-save-assessment').addEventListener('click', saveAssessment);
}

// Script is at bottom of <body> — DOM is already parsed, call directly
document.getElementById('app').addEventListener('change', handleInputChange);
document.getElementById('app').addEventListener('input', handleInputChange);
init();
