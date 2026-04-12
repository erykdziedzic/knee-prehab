import { useReducer, useEffect, useCallback } from 'react';
import { exType } from './utils.js';

export const DRAFT_KEY = 'knee_prehab_draft';

export const initialDraft = {
  assessmentRun: false,
  baselineInputs: {},
  exerciseInputs: {},
  editingSessionIndex: null,
  editingDate: null,
};

function draftReducer(state, action) {
  switch (action.type) {
    case 'SET_EXERCISE_FIELD': {
      const { name, field, value } = action;
      const prev = state.exerciseInputs[name] || {};
      return { ...state, exerciseInputs: { ...state.exerciseInputs, [name]: { ...prev, [field]: value } } };
    }
    case 'SET_EXERCISE_SET_FIELD': {
      const { name, setIndex, field, value } = action;
      const prev = state.exerciseInputs[name] || {};
      const sets = [...(prev.sets || [])];
      while (sets.length <= setIndex) sets.push({});
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      return { ...state, exerciseInputs: { ...state.exerciseInputs, [name]: { ...prev, sets } } };
    }
    case 'SET_BASELINE_FIELD': {
      const { testId, side, value } = action;
      const prev = state.baselineInputs[testId] || {};
      return { ...state, baselineInputs: { ...state.baselineInputs, [testId]: { ...prev, [side]: value } } };
    }
    case 'MARK_ASSESSMENT_RUN':
      return { ...state, assessmentRun: true };
    case 'LOAD_SESSION': {
      const { session, index, blocks } = action;
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
    }
    case 'RESTORE_DRAFT':
      return action.draft;
    case 'CLEAR':
      return initialDraft;
    default:
      return state;
  }
}

export function useDraft() {
  const [draft, dispatch] = useReducer(draftReducer, initialDraft);

  // Persist draft to localStorage whenever it has user data.
  // CLEAR removes the item explicitly via wrappedDispatch before resetting state.
  useEffect(() => {
    const hasData = draft.assessmentRun ||
      draft.editingSessionIndex !== null ||
      Object.keys(draft.exerciseInputs).length > 0 ||
      Object.keys(draft.baselineInputs).length > 0;
    if (hasData) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [draft]);

  const wrappedDispatch = useCallback((action) => {
    if (action.type === 'CLEAR') localStorage.removeItem(DRAFT_KEY);
    dispatch(action);
  }, []);

  return { draft, dispatch: wrappedDispatch };
}
