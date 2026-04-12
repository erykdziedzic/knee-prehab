import { useState, Fragment } from 'react';
import { exType, durationSec, formatDuration, buildMeta, getProgressionTip, targetReps } from './utils.js';

const TIERS = ['1-2', '3-4', '5+'];
const TIER_LABELS = { '1-2': 'Wks 1–2', '3-4': 'Wks 3–4', '5+': 'Wks 5+' };

export default function WorkoutTab({ data, draft, dispatch, activeTier, onTierChange, onFinish }) {
  const isEditing = draft.editingSessionIndex !== null;

  return (
    <>
      <div id="tier-selector">
        <span>Week:</span>
        {TIERS.map(tier => (
          <button
            key={tier}
            type="button"
            className={'tier-btn' + (activeTier === tier ? ' active' : '')}
            onClick={() => onTierChange(tier)}
          >
            {TIER_LABELS[tier]}
          </button>
        ))}
      </div>
      <div id="blocks-container">
        {data.blocks.map(block => (
          <BlockCard key={block.name} block={block} tier={activeTier} draft={draft} dispatch={dispatch} />
        ))}
      </div>
      <div className="action-bar">
        <button type="button" className="btn-primary" onClick={onFinish}>
          {isEditing ? 'Update & Export Session' : 'Finish & Export Session'}
        </button>
      </div>
    </>
  );
}

function BlockCard({ block, tier, draft, dispatch }) {
  return (
    <section className="block-card">
      <div className="block-title">
        <span>{block.name}</span>
        <span className="block-time">{block.time_min} min</span>
      </div>
      <div className="exercises-list">
        {block.exercises.map(ex => (
          <ExerciseRow key={ex.name} ex={ex} tier={tier} draft={draft} dispatch={dispatch} />
        ))}
      </div>
    </section>
  );
}

function ExerciseRow({ ex, tier, draft, dispatch }) {
  const [open, setOpen] = useState(false);
  const type = exType(ex);
  const d = draft.exerciseInputs[ex.name];
  const tip = getProgressionTip(ex, tier);

  return (
    <div className="exercise-row">
      <div className="exercise-header">
        <span className="exercise-name">{ex.name}</span>
        <span className="exercise-meta">{buildMeta(ex)}</span>
        <button
          type="button"
          className="notes-toggle"
          aria-expanded={String(open)}
          onClick={() => setOpen(o => !o)}
        >Info</button>
      </div>
      {open && (
        <div className="notes-panel">
          {ex.notes && <p>{ex.notes}</p>}
          {tip && <p className="progression-tip">Wks {tier}: {tip}</p>}
        </div>
      )}
      <div className="log-inputs">
        {type === 'duration' ? (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!(d?.completed)}
              onChange={e => dispatch({ type: 'SET_EXERCISE_FIELD', name: ex.name, field: 'completed', value: e.target.checked })}
            />
            {' Completed' + (durationSec(ex) ? ' (' + formatDuration(durationSec(ex)) + ')' : '')}
          </label>
        ) : (
          <>
            <label className="weight-label">
              <span>Weight (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                placeholder="0"
                value={d?.weight_kg ?? ''}
                onChange={e => dispatch({ type: 'SET_EXERCISE_FIELD', name: ex.name, field: 'weight_kg', value: e.target.value })}
              />
            </label>
            <table className="sets-table">
              <thead>
                <tr>
                  <th>Set</th>
                  {type === 'bilateral'
                    ? <><th></th><th>Reps</th></>
                    : <><th>Reps</th><th>RPE</th></>
                  }
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: ex.sets }, (_, i) =>
                  type === 'bilateral' ? (
                    <Fragment key={i}>
                      <tr>
                        <td className="set-num" rowSpan={2}>{i + 1}</td>
                        <td className="side-label">L</td>
                        <td>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder={targetReps(ex.reps)}
                            value={d?.sets?.[i]?.left_reps ?? ''}
                            onChange={e => dispatch({ type: 'SET_EXERCISE_SET_FIELD', name: ex.name, setIndex: i, field: 'left_reps', value: e.target.value })}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="side-label">R</td>
                        <td>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder={targetReps(ex.reps)}
                            value={d?.sets?.[i]?.right_reps ?? ''}
                            onChange={e => dispatch({ type: 'SET_EXERCISE_SET_FIELD', name: ex.name, setIndex: i, field: 'right_reps', value: e.target.value })}
                          />
                        </td>
                      </tr>
                    </Fragment>
                  ) : (
                    <tr key={i}>
                      <td className="set-num">{i + 1}</td>
                      <td>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder={targetReps(ex.reps)}
                          value={d?.sets?.[i]?.reps ?? ''}
                          onChange={e => dispatch({ type: 'SET_EXERCISE_SET_FIELD', name: ex.name, setIndex: i, field: 'reps', value: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="10"
                          step="0.5"
                          placeholder="–"
                          value={d?.sets?.[i]?.rpe ?? ''}
                          onChange={e => dispatch({ type: 'SET_EXERCISE_SET_FIELD', name: ex.name, setIndex: i, field: 'rpe', value: e.target.value })}
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
