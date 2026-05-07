import { exType, durationSec } from './utils';
import type { AppData, DraftState, Session } from './types';

export function buildSessionObject(data: AppData, draft: DraftState): Session {
  let date: string;
  if (draft.editingDate) {
    date = draft.editingDate;
  } else {
    const today = new Date();
    date = today.getFullYear() + '-'
      + String(today.getMonth() + 1).padStart(2, '0') + '-'
      + String(today.getDate()).padStart(2, '0');
  }

  const session: Session = { date, baseline_results: [], exercise_logs: [] };

  if (draft.assessmentRun) {
    (data.baseline_tests || []).forEach(test => {
      const d = draft.baselineInputs[test.id];
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

  data.blocks.forEach(block => {
    block.exercises.forEach(ex => {
      const type = exType(ex);
      const d = draft.exerciseInputs[ex.name];
      if (!d) return;

      const log = { exercise_name: ex.name, sets_completed: [] as Session['exercise_logs'][number]['sets_completed'] };

      if (type === 'duration') {
        if (d.completed) {
          log.sets_completed.push({
            reps: null, weight_kg: null, duration_sec: durationSec(ex), side: null, rpe_actual: null,
          });
        }
      } else if (type === 'bilateral') {
        const weight = ex.bodyweight ? null : (d.weight_kg !== undefined && d.weight_kg !== '' ? parseFloat(d.weight_kg) : null);
        (d.sets || []).forEach(s => {
          ['left', 'right'].forEach(side => {
            const repsVal = side === 'left' ? s.left_reps : s.right_reps;
            log.sets_completed.push({
              reps: repsVal !== '' ? parseInt(repsVal ?? '', 10) : null,
              weight_kg: weight, duration_sec: null, side, rpe_actual: null,
            });
          });
        });
      } else {
        const weight = ex.bodyweight ? null : (d.weight_kg !== undefined && d.weight_kg !== '' ? parseFloat(d.weight_kg) : null);
        (d.sets || []).forEach(s => {
          log.sets_completed.push({
            reps: s.reps !== '' ? parseInt(s.reps ?? '', 10) : null,
            weight_kg: weight, duration_sec: null, side: null,
            rpe_actual: s.rpe !== '' ? parseFloat(s.rpe ?? '') : null,
          });
        });
      }

      session.exercise_logs.push(log);
    });
  });

  return session;
}

export function triggerDownload(data: AppData): void {
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
