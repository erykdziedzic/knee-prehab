import '../index.css';
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, DRAFT_KEY, restoreDraft, clear, loadSession, type RootState } from './store';
import { buildSessionObject, triggerDownload } from './session';
import WorkoutTab from './WorkoutTab';
import AssessmentTab from './AssessmentTab';
import HistoryTab from './HistoryTab';
import type { AppData, DraftState, Session } from './types';

function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [activeTab, setActiveTab] = useState('workout');
  const [activeTier, setActiveTier] = useState('1-2');
  const [storedDraft, setStoredDraft] = useState<DraftState | null>(null);
  const dispatch = useDispatch();
  const draft = useSelector((state: RootState) => state);

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data.json')
      .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then((d: AppData) => {
        setData(d);
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          try { setStoredDraft(JSON.parse(raw) as DraftState); } catch (_) { localStorage.removeItem(DRAFT_KEY); }
        }
        (document.getElementById('loading-overlay') as HTMLElement).hidden = true;
      })
      .catch(() => {
        (document.getElementById('loading-overlay') as HTMLElement).hidden = true;
        const banner = document.getElementById('error-banner') as HTMLElement;
        banner.hidden = false;
        banner.textContent = 'Failed to load data.json.';
      });
  }, []);

  if (!data) return null;

  const handleContinue = () => {
    dispatch(restoreDraft(storedDraft!));
    setStoredDraft(null);
  };

  const handleDiscard = () => {
    dispatch(clear());
    setStoredDraft(null);
  };

  const handleFinish = () => {
    const session = buildSessionObject(data, draft);
    const updated: AppData = JSON.parse(JSON.stringify(data));
    if (!updated.sessions) updated.sessions = [];
    if (draft.editingSessionIndex !== null) {
      updated.sessions[draft.editingSessionIndex] = session;
    } else {
      updated.sessions.push(session);
    }
    triggerDownload(updated);
    dispatch(clear());
  };

  const handleEditSession = (session: Session, index: number) => {
    dispatch(loadSession({ session, index, blocks: data.blocks }));
    setActiveTab('workout');
  };

  return (
    <>
      {storedDraft && (
        <div className="mx-4 my-3 p-4 bg-accent/15 border border-accent rounded-xl flex items-center gap-2.5 flex-wrap">
          <p className="flex-1 text-sm">You have an unfinished session. Continue?</p>
          <button
            type="button"
            className="px-3.5 py-2 rounded-lg border border-app-border bg-transparent text-sm"
            onClick={handleDiscard}
          >Start Fresh</button>
          <button
            type="button"
            className="px-3.5 py-2 rounded-lg bg-accent text-black border border-accent font-semibold text-sm"
            onClick={handleContinue}
          >Continue</button>
        </div>
      )}
      <main>
        <section className={activeTab === 'workout' ? 'block' : 'hidden'}>
          <WorkoutTab
            data={data}
            activeTier={activeTier}
            onTierChange={setActiveTier}
            onFinish={handleFinish}
          />
        </section>
        <section className={activeTab === 'assessment' ? 'block' : 'hidden'}>
          <AssessmentTab
            tests={data.baseline_tests}
            onSaveAssessment={() => setActiveTab('workout')}
          />
        </section>
        <section className={activeTab === 'history' ? 'block' : 'hidden'}>
          <HistoryTab
            sessions={data.sessions}
            tests={data.baseline_tests}
            onEditSession={handleEditSession}
          />
        </section>
      </main>
      <nav
        className="fixed bottom-0 left-0 right-0 flex bg-surface border-t border-app-border z-50"
        style={{ height: 'calc(60px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {[['workout', 'Workout'], ['assessment', 'Assessment'], ['history', 'History']].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className={`flex-1 flex flex-col items-center justify-center min-h-11 border-none bg-transparent text-xs font-medium tracking-wide px-2 active:opacity-70 ${activeTab === tab ? 'text-accent' : 'text-muted'}`}
            onClick={() => setActiveTab(tab!)}
          >{label}</button>
        ))}
      </nav>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
  </Provider>
);
