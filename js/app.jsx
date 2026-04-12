import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, DRAFT_KEY, restoreDraft, clear, loadSession } from './store.js';
import { buildSessionObject, triggerDownload } from './session.js';
import WorkoutTab from './WorkoutTab.jsx';
import AssessmentTab from './AssessmentTab.jsx';
import HistoryTab from './HistoryTab.jsx';

function App() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('workout');
  const [activeTier, setActiveTier] = useState('1-2');
  const [storedDraft, setStoredDraft] = useState(null);
  const dispatch = useDispatch();
  const draft = useSelector(state => state);

  useEffect(() => {
    fetch('./data.json')
      .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(d => {
        setData(d);
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          try { setStoredDraft(JSON.parse(raw)); } catch (_) { localStorage.removeItem(DRAFT_KEY); }
        }
        document.getElementById('loading-overlay').hidden = true;
      })
      .catch(() => {
        document.getElementById('loading-overlay').hidden = true;
        const banner = document.getElementById('error-banner');
        banner.hidden = false;
        banner.textContent = 'Failed to load data.json.';
      });
  }, []);

  if (!data) return null;

  const handleContinue = () => {
    dispatch(restoreDraft(storedDraft));
    setStoredDraft(null);
  };

  const handleDiscard = () => {
    dispatch(clear());
    setStoredDraft(null);
  };

  const handleFinish = () => {
    const session = buildSessionObject(data, draft);
    const updated = JSON.parse(JSON.stringify(data));
    if (!updated.sessions) updated.sessions = [];
    if (draft.editingSessionIndex !== null) {
      updated.sessions[draft.editingSessionIndex] = session;
    } else {
      updated.sessions.push(session);
    }
    triggerDownload(updated);
    dispatch(clear());
  };

  const handleEditSession = (session, index) => {
    dispatch(loadSession({ session, index, blocks: data.blocks }));
    setActiveTab('workout');
  };

  return (
    <>
      {storedDraft && (
        <div id="draft-banner">
          <p>You have an unfinished session. Continue?</p>
          <button id="btn-discard-draft" type="button" onClick={handleDiscard}>Start Fresh</button>
          <button id="btn-restore-draft" type="button" onClick={handleContinue}>Continue</button>
        </div>
      )}
      <main id="app">
        <section id="tab-workout" className={'tab-panel' + (activeTab === 'workout' ? ' active' : '')}>
          <WorkoutTab
            data={data}
            activeTier={activeTier}
            onTierChange={setActiveTier}
            onFinish={handleFinish}
          />
        </section>
        <section id="tab-assessment" className={'tab-panel' + (activeTab === 'assessment' ? ' active' : '')}>
          <AssessmentTab
            tests={data.baseline_tests}
            onSaveAssessment={() => setActiveTab('workout')}
          />
        </section>
        <section id="tab-history" className={'tab-panel' + (activeTab === 'history' ? ' active' : '')}>
          <HistoryTab
            sessions={data.sessions}
            tests={data.baseline_tests}
            onEditSession={handleEditSession}
          />
        </section>
      </main>
      <nav id="tab-bar">
        {[['workout', 'Workout'], ['assessment', 'Assessment'], ['history', 'History']].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className={'tab-btn' + (activeTab === tab ? ' active' : '')}
            onClick={() => setActiveTab(tab)}
          >{label}</button>
        ))}
      </nav>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
);
