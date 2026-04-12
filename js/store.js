import { createSlice, configureStore } from '@reduxjs/toolkit';
import { exType } from './utils.js';

export const DRAFT_KEY = 'knee_prehab_draft';

const initialState = {
  assessmentRun: false,
  baselineInputs: {},
  exerciseInputs: {},
  editingSessionIndex: null,
  editingDate: null,
};

const draftSlice = createSlice({
  name: 'draft',
  initialState,
  reducers: {
    setExerciseField(state, { payload: { name, field, value } }) {
      if (!state.exerciseInputs[name]) state.exerciseInputs[name] = {};
      state.exerciseInputs[name][field] = value;
    },
    setExerciseSetField(state, { payload: { name, setIndex, field, value } }) {
      if (!state.exerciseInputs[name]) state.exerciseInputs[name] = {};
      if (!state.exerciseInputs[name].sets) state.exerciseInputs[name].sets = [];
      const sets = state.exerciseInputs[name].sets;
      while (sets.length <= setIndex) sets.push({});
      sets[setIndex][field] = value;
    },
    setBaselineField(state, { payload: { testId, side, value } }) {
      if (!state.baselineInputs[testId]) state.baselineInputs[testId] = {};
      state.baselineInputs[testId][side] = value;
    },
    markAssessmentRun(state) {
      state.assessmentRun = true;
    },
    loadSession(state, { payload: { session, index, blocks } }) {
      const exerciseInputs = {};
      const baselineInputs = {};
      let assessmentRun = false;

      if (session.baseline_results && session.baseline_results.length > 0) {
        assessmentRun = true;
        session.baseline_results.forEach(r => {
          if (!baselineInputs[r.test_id]) baselineInputs[r.test_id] = {};
          if (r.side) {
            baselineInputs[r.test_id][r.side] = String(r.value);
          } else {
            baselineInputs[r.test_id].value = String(r.value);
          }
        });
      }

      (session.exercise_logs || []).forEach(log => {
        let ex = null;
        for (const block of blocks) {
          ex = block.exercises.find(e => e.name === log.exercise_name);
          if (ex) break;
        }
        if (!ex) return;

        const type = exType(ex);
        const sets = log.sets_completed || [];

        if (type === 'duration') {
          exerciseInputs[log.exercise_name] = { completed: sets.length > 0 };
        } else if (type === 'bilateral') {
          const weight = sets.length > 0 && sets[0].weight_kg !== null ? String(sets[0].weight_kg) : '';
          const pairedSets = [];
          for (let i = 0; i < sets.length; i += 2) {
            pairedSets.push({
              left_reps: sets[i] && sets[i].reps !== null ? String(sets[i].reps) : '',
              right_reps: sets[i + 1] && sets[i + 1].reps !== null ? String(sets[i + 1].reps) : '',
            });
          }
          exerciseInputs[log.exercise_name] = { weight_kg: weight, sets: pairedSets };
        } else {
          const weight = sets.length > 0 && sets[0].weight_kg !== null ? String(sets[0].weight_kg) : '';
          const mappedSets = sets.map(s => ({
            reps: s.reps !== null ? String(s.reps) : '',
            rpe: s.rpe_actual !== null ? String(s.rpe_actual) : '',
          }));
          exerciseInputs[log.exercise_name] = { weight_kg: weight, sets: mappedSets };
        }
      });

      return { exerciseInputs, baselineInputs, assessmentRun, editingSessionIndex: index, editingDate: session.date };
    },
    restoreDraft(state, { payload }) {
      return payload;
    },
    clear() {
      return initialState;
    },
  },
});

export const { setExerciseField, setExerciseSetField, setBaselineField, markAssessmentRun, loadSession, restoreDraft, clear } = draftSlice.actions;

export const store = configureStore({ reducer: draftSlice.reducer });

store.subscribe(() => {
  const draft = store.getState();
  const hasData = draft.assessmentRun ||
    draft.editingSessionIndex !== null ||
    Object.keys(draft.exerciseInputs).length > 0 ||
    Object.keys(draft.baselineInputs).length > 0;
  if (hasData) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } else {
    localStorage.removeItem(DRAFT_KEY);
  }
});
