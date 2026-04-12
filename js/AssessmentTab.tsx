import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setBaselineField, markAssessmentRun, type RootState } from './store';
import { unitLabel, unitShort } from './utils';
import type { BaselineTest } from './types';

const inputCls = 'h-12 bg-surface-raised border border-app-border rounded-lg text-[1.1rem] px-3 w-full appearance-none focus:outline-none focus:border-accent';

interface AssessmentTabProps {
  tests: BaselineTest[];
  onSaveAssessment: () => void;
}

export default function AssessmentTab({ tests, onSaveAssessment }: AssessmentTabProps) {
  const [saved, setSaved] = useState(false);
  const dispatch = useDispatch();

  const handleSave = () => {
    dispatch(markAssessmentRun());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSaveAssessment();
  };

  return (
    <>
      <p className="px-4 py-3.5 text-sm text-muted border-b border-app-border">
        Run this assessment every 4 weeks to track progress. Results will be included in your next exported session.
      </p>
      <div className="px-4 pt-2">
        {(tests || []).map(test => (
          <TestCard key={test.id} test={test} />
        ))}
      </div>
      <div className="p-4">
        <button
          type="button"
          className="block w-full h-[52px] bg-transparent text-accent border border-accent rounded-xl text-base font-semibold active:bg-accent/15"
          onClick={handleSave}
        >
          {saved ? 'Saved!' : 'Save Assessment'}
        </button>
      </div>
    </>
  );
}

function TestCard({ test }: { test: BaselineTest }) {
  const dispatch = useDispatch();
  const d = useSelector((state: RootState) => state.baselineInputs[test.id] || {});
  const isScore = test.unit === 'score_0_10';

  const handleChange = (side: string, value: string) => {
    dispatch(setBaselineField({ testId: test.id, side, value }));
  };

  return (
    <div className="bg-surface border border-app-border rounded-xl p-4 mb-3">
      <h3 className="text-base font-semibold flex justify-between items-baseline gap-2 flex-wrap">
        {test.name}
        <span className="text-xs text-muted font-normal">{unitLabel(test.unit)}</span>
      </h3>
      <p className="mt-2 text-xs text-muted leading-relaxed">{test.instructions}</p>
      <p className="mt-1.5 text-xs text-accent">Target: {test.target} {unitShort(test.unit)}</p>
      <div className={test.bilateral ? 'mt-3 grid grid-cols-2 gap-2.5' : 'mt-3 flex flex-col gap-2'}>
        {test.bilateral
          ? ['left', 'right'].map(side => (
            <label key={side} className="flex flex-col gap-1 text-xs text-muted uppercase tracking-wide">
              <span>{side.charAt(0).toUpperCase() + side.slice(1)}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max={isScore ? '10' : undefined}
                step={isScore ? '0.5' : undefined}
                className={inputCls}
                value={d[side] ?? ''}
                onChange={e => handleChange(side, e.target.value)}
              />
            </label>
          ))
          : (
            <label className="flex flex-col gap-1 text-xs text-muted uppercase tracking-wide">
              <span>{unitLabel(test.unit)}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max={isScore ? '10' : undefined}
                step={isScore ? '0.5' : undefined}
                className={inputCls}
                value={d.value ?? ''}
                onChange={e => handleChange('value', e.target.value)}
              />
            </label>
          )
        }
      </div>
    </div>
  );
}
