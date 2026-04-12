import type { Exercise } from './types';

export type ExType = 'bilateral' | 'standard' | 'duration';

export function exType(ex: Exercise): ExType {
  if (ex.reps !== null && ex.reps.includes('each')) return 'bilateral';
  if (ex.reps !== null) return 'standard';
  return 'duration';
}

export function durationSec(ex: Exercise): number | null {
  if (ex.duration_sec) return ex.duration_sec;
  if (ex.duration_min) return ex.duration_min * 60;
  return null;
}

export function formatDuration(sec: number | null | undefined): string {
  if (!sec) return '';
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? m + 'm ' + s + 's' : m + 'm';
}

export function buildMeta(ex: Exercise): string {
  const parts: string[] = [];
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

export function getProgressionTip(ex: Exercise, tier: string): string | null {
  if (!ex.progression) return null;
  let tip = ex.progression.find(p => p.weeks === tier);
  if (tip) return tip.instruction;
  tip = ex.progression.find(p => p.weeks === 'all');
  if (tip) return tip.instruction;
  if (tier === '3-4' || tier === '5+') {
    tip = ex.progression.find(p => p.weeks === '3+');
    if (tip) return tip.instruction;
  }
  return null;
}

export function targetReps(repsStr: string | null): string {
  if (!repsStr) return '';
  const match = repsStr.match(/\d+/);
  return match ? match[0] : '';
}

export function unitLabel(unit: string): string {
  if (unit === 'sec') return 'seconds';
  if (unit === 'reps') return 'reps';
  if (unit === 'score_0_10') return '0–10 score';
  return unit;
}

export function unitShort(unit: string): string {
  if (unit === 'sec') return 's';
  if (unit === 'reps') return 'reps';
  if (unit === 'score_0_10') return '/10';
  return unit;
}
