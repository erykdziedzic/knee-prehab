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
    return <div id="history-container"><p className="empty-state">No sessions logged yet.</p></div>;
  }

  return (
    <div id="history-container">
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
    <div className="history-card">
      <div className="history-card-header">
        <div className="history-date">{session.date}</div>
        <button type="button" className="history-edit-btn" onClick={() => onEdit(session, origIdx)}>Edit</button>
      </div>
      <ul className="history-exercises">
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
          return <li key={i}><strong>{log.exercise_name}</strong> — {detail}</li>;
        })}
      </ul>
      {baseline.length > 0 && (
        <details className="history-assessment">
          <summary>Assessment Results</summary>
          <ul>
            {Object.entries(grouped).map(([id, results]) => {
              const test = testMap[id];
              const name = test ? test.name : id;
              const vals = results
                .map(r => (r.side ? r.side + ': ' + r.value : r.value) + unitShort(test ? test.unit : ''))
                .join('  ·  ');
              return <li key={id}>{name} — {vals}</li>;
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
