import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setBaselineField, markAssessmentRun } from './store.js';
import { unitLabel, unitShort } from './utils.js';

export default function AssessmentTab({ tests, onSaveAssessment }) {
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
      <p className="tab-intro">
        Run this assessment every 4 weeks to track progress. Results will be included in your next exported session.
      </p>
      <div id="tests-container">
        {(tests || []).map(test => (
          <TestCard key={test.id} test={test} />
        ))}
      </div>
      <div className="action-bar">
        <button type="button" className="btn-secondary" onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Assessment'}
        </button>
      </div>
    </>
  );
}

function TestCard({ test }) {
  const dispatch = useDispatch();
  const d = useSelector(state => state.baselineInputs[test.id] || {});
  const isScore = test.unit === 'score_0_10';

  const handleChange = (side, value) => {
    dispatch(setBaselineField({ testId: test.id, side, value }));
  };

  return (
    <div className="test-card">
      <h3>{test.name} <span className="test-unit">{unitLabel(test.unit)}</span></h3>
      <p className="test-instructions">{test.instructions}</p>
      <p className="test-target">Target: {test.target} {unitShort(test.unit)}</p>
      <div className={'test-inputs' + (test.bilateral ? ' bilateral' : '')}>
        {test.bilateral
          ? ['left', 'right'].map(side => (
            <label key={side}>
              <span>{side.charAt(0).toUpperCase() + side.slice(1)}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max={isScore ? '10' : undefined}
                step={isScore ? '0.5' : undefined}
                value={d[side] ?? ''}
                onChange={e => handleChange(side, e.target.value)}
              />
            </label>
          ))
          : (
            <label>
              <span>{unitLabel(test.unit)}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max={isScore ? '10' : undefined}
                step={isScore ? '0.5' : undefined}
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
