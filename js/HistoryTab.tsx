import { formatDuration, unitShort } from './utils';
import type { Session, BaselineTest } from './types';

interface HistoryTabProps {
  sessions: Session[] | undefined;
  tests: BaselineTest[];
  onEditSession: (session: Session, index: number) => void;
}

export default function HistoryTab({ sessions, tests, onEditSession }: HistoryTabProps) {
  const testMap: Record<string, BaselineTest> = {};
  (tests || []).forEach(t => { testMap[t.id] = t; });

  if (!sessions || sessions.length === 0) {
    return (
      <div className="p-4">
        <p className="text-center text-muted py-10 text-sm">No sessions logged yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {[...sessions].reverse().map((session, reversedIdx) => {
        const origIdx = sessions.length - 1 - reversedIdx;
        return (
          <HistoryCard
            key={session.date + '-' + origIdx}
            session={session}
            origIdx={origIdx}
            testMap={testMap}
            onEdit={onEditSession}
          />
        );
      })}
    </div>
  );
}

interface HistoryCardProps {
  session: Session;
  origIdx: number;
  testMap: Record<string, BaselineTest>;
  onEdit: (session: Session, index: number) => void;
}

function HistoryCard({ session, origIdx, testMap, onEdit }: HistoryCardProps) {
  const baseline = session.baseline_results || [];

  const grouped = baseline.reduce<Record<string, typeof baseline>>((acc, r) => {
    if (!acc[r.test_id]) acc[r.test_id] = [];
    acc[r.test_id].push(r);
    return acc;
  }, {});

  return (
    <div className="bg-surface border border-app-border rounded-xl px-4 py-3.5 mb-3">
      <div className="flex justify-between items-center mb-2.5">
        <div className="font-bold text-sm text-accent">{session.date}</div>
        <button
          type="button"
          className="px-3 py-1 text-xs border border-app-border rounded bg-transparent text-muted shrink-0 active:bg-surface-raised"
          onClick={() => onEdit(session, origIdx)}
        >Edit</button>
      </div>
      <ul className="flex flex-col gap-1 list-none">
        {(session.exercise_logs || []).map((log, i) => {
          const sets = log.sets_completed || [];
          const hasDuration = sets.some(s => s.duration_sec !== null && s.duration_sec !== undefined);
          let detail: string;
          if (hasDuration) {
            detail = formatDuration(sets[0].duration_sec) + (sets.length > 1 ? ' × ' + sets.length : '');
          } else {
            const weight = sets.length > 0 && sets[0].weight_kg ? sets[0].weight_kg + ' kg · ' : '';
            const reps = sets.map(s => s.reps).filter((r): r is number => r !== null && r !== undefined);
            const uniqueReps = [...new Set(reps)];
            detail = weight + sets.length + ' sets · ' + (uniqueReps.length === 1 ? uniqueReps[0] : uniqueReps.join('/')) + ' reps';
          }
          return (
            <li key={i} className="text-sm text-muted">
              <strong className="text-[#f0f0f0] font-medium">{log.exercise_name}</strong> — {detail}
            </li>
          );
        })}
      </ul>
      {baseline.length > 0 && (
        <details className="mt-2.5 pt-2.5 border-t border-app-border">
          <summary className="text-xs text-accent cursor-pointer list-none flex items-center gap-1.5">
            <span className="summary-arrow">▶</span>
            Assessment Results
          </summary>
          <ul className="list-none mt-2 flex flex-col gap-1">
            {Object.entries(grouped).map(([id, results]) => {
              const test = testMap[id];
              const name = test ? test.name : id;
              const vals = results
                .map(r => (r.side ? r.side + ': ' + r.value : r.value) + unitShort(test ? test.unit : ''))
                .join('  ·  ');
              return <li key={id} className="text-xs text-muted">{name} — {vals}</li>;
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
