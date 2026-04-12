import { useState, Fragment } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setExerciseField, setExerciseSetField, type RootState } from './store';
import { exType, durationSec, formatDuration, buildMeta, getProgressionTip, targetReps } from './utils';
import type { AppData, Exercise, Block } from './types';

const TIERS = ['1-2', '3-4', '5+'] as const;
const TIER_LABELS: Record<string, string> = { '1-2': 'Wks 1–2', '3-4': 'Wks 3–4', '5+': 'Wks 5+' };

const inputCls = 'h-12 bg-surface-raised border border-app-border rounded-lg text-[1.1rem] px-3 w-full appearance-none focus:outline-none focus:border-accent';
const setInputCls = 'h-11 bg-surface-raised border border-app-border rounded-lg text-base px-3 w-full appearance-none focus:outline-none focus:border-accent';

interface WorkoutTabProps {
  data: AppData;
  activeTier: string;
  onTierChange: (tier: string) => void;
  onFinish: () => void;
}

export default function WorkoutTab({ data, activeTier, onTierChange, onFinish }: WorkoutTabProps) {
  const isEditing = useSelector((state: RootState) => state.editingSessionIndex !== null);

  return (
    <>
      <div className="sticky top-0 z-20 bg-app-bg border-b border-app-border py-2.5 px-4 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <span className="text-muted text-xs whitespace-nowrap shrink-0">Week:</span>
        {TIERS.map(tier => (
          <button
            key={tier}
            type="button"
            className={`px-3.5 py-1.5 rounded-full border text-xs whitespace-nowrap shrink-0 active:opacity-80 ${activeTier === tier ? 'bg-accent text-black border-accent font-semibold' : 'border-app-border bg-transparent text-muted'}`}
            onClick={() => onTierChange(tier)}
          >
            {TIER_LABELS[tier]}
          </button>
        ))}
      </div>
      <div className="pb-2">
        {data.blocks.map(block => (
          <BlockCard key={block.name} block={block} tier={activeTier} />
        ))}
      </div>
      <div className="p-4">
        <button
          type="button"
          className="block w-full h-[52px] bg-accent text-black border-none rounded-xl text-base font-bold tracking-wide active:opacity-85"
          onClick={onFinish}
        >
          {isEditing ? 'Update & Export Session' : 'Finish & Export Session'}
        </button>
      </div>
    </>
  );
}

function BlockCard({ block, tier }: { block: Block; tier: string }) {
  return (
    <section className="mx-4 mt-4 bg-surface rounded-xl overflow-hidden border border-app-border">
      <div className="px-4 py-3 text-xs tracking-widest uppercase text-accent border-b border-app-border flex justify-between items-center">
        <span>{block.name}</span>
        <span className="text-[0.7rem] text-muted normal-case tracking-normal">{block.time_min} min</span>
      </div>
      <div>
        {block.exercises.map(ex => (
          <ExerciseRow key={ex.name} ex={ex} tier={tier} />
        ))}
      </div>
    </section>
  );
}

function ExerciseRow({ ex, tier }: { ex: Exercise; tier: string }) {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const type = exType(ex);
  const d = useSelector((state: RootState) => state.exerciseInputs[ex.name]);
  const tip = getProgressionTip(ex, tier);

  return (
    <div className="px-4 py-3.5 border-b border-app-border last:border-b-0">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-base">{ex.name}</span>
        <span className="text-xs text-muted">{buildMeta(ex)}</span>
        <button
          type="button"
          className="self-start mt-2 px-3 py-1 text-xs border border-app-border rounded bg-transparent text-muted active:bg-surface-raised"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >Info</button>
      </div>
      {open && (
        <div className="mt-2.5 p-3 bg-surface-raised rounded-lg text-sm text-muted leading-relaxed">
          {ex.notes && <p>{ex.notes}</p>}
          {tip && <p className="mt-2.5 pt-2.5 border-t border-app-border text-accent italic text-xs">Wks {tier}: {tip}</p>}
        </div>
      )}
      <div className="mt-3">
        {type === 'duration' ? (
          <label className="flex items-center gap-3.5 py-1.5 text-base active:opacity-75 cursor-pointer">
            <input
              type="checkbox"
              className="w-7 h-7 shrink-0 accent-accent cursor-pointer"
              checked={!!(d?.completed)}
              onChange={e => dispatch(setExerciseField({ name: ex.name, field: 'completed', value: e.target.checked }))}
            />
            {' Completed' + (durationSec(ex) ? ' (' + formatDuration(durationSec(ex)) + ')' : '')}
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1 mb-2.5">
              <span className="text-xs text-muted uppercase tracking-wide">Weight (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                placeholder="0"
                className={inputCls}
                value={d?.weight_kg ?? ''}
                onChange={e => dispatch(setExerciseField({ name: ex.name, field: 'weight_kg', value: e.target.value }))}
              />
            </label>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-muted font-medium pb-1.5 pt-1 text-left text-xs uppercase tracking-widest">Set</th>
                  {type === 'bilateral'
                    ? <><th></th><th className="text-muted font-medium pb-1.5 pt-1 text-left text-xs uppercase tracking-widest">Reps</th></>
                    : <><th className="text-muted font-medium pb-1.5 pt-1 text-left text-xs uppercase tracking-widest">Reps</th><th className="text-muted font-medium pb-1.5 pt-1 text-left text-xs uppercase tracking-widest">RPE</th></>
                  }
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: ex.sets }, (_, i) =>
                  type === 'bilateral' ? (
                    <Fragment key={i}>
                      <tr>
                        <td className="text-muted text-sm pr-2 whitespace-nowrap align-middle" rowSpan={2}>{i + 1}</td>
                        <td className="text-xs text-muted uppercase tracking-wide pr-1.5 whitespace-nowrap align-middle py-0.5">L</td>
                        <td className="py-0.5 px-1 align-middle">
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder={targetReps(ex.reps)}
                            className={setInputCls}
                            value={d?.sets?.[i]?.left_reps ?? ''}
                            onChange={e => dispatch(setExerciseSetField({ name: ex.name, setIndex: i, field: 'left_reps', value: e.target.value }))}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-xs text-muted uppercase tracking-wide pr-1.5 whitespace-nowrap align-middle py-0.5">R</td>
                        <td className="py-0.5 px-1 align-middle">
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder={targetReps(ex.reps)}
                            className={setInputCls}
                            value={d?.sets?.[i]?.right_reps ?? ''}
                            onChange={e => dispatch(setExerciseSetField({ name: ex.name, setIndex: i, field: 'right_reps', value: e.target.value }))}
                          />
                        </td>
                      </tr>
                    </Fragment>
                  ) : (
                    <tr key={i}>
                      <td className="text-muted text-sm pr-2 whitespace-nowrap align-middle py-0.5">{i + 1}</td>
                      <td className="py-0.5 px-1 align-middle">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder={targetReps(ex.reps)}
                          className={setInputCls}
                          value={d?.sets?.[i]?.reps ?? ''}
                          onChange={e => dispatch(setExerciseSetField({ name: ex.name, setIndex: i, field: 'reps', value: e.target.value }))}
                        />
                      </td>
                      <td className="py-0.5 px-1 align-middle">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="10"
                          step="0.5"
                          placeholder="–"
                          className={setInputCls}
                          value={d?.sets?.[i]?.rpe ?? ''}
                          onChange={e => dispatch(setExerciseSetField({ name: ex.name, setIndex: i, field: 'rpe', value: e.target.value }))}
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
