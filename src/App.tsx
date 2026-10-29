import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { Icon } from './components/Icon';
import { PageHeader, Card } from './components/ui';
import { ensureSeeded } from './db/repo';
import { useProfile } from './db/hooks';
import { useUi } from './store';
import { Onboarding } from './screens/Onboarding';
import { Today } from './screens/Today';
import { Diet } from './screens/diet/Diet';
import { DietGoals, Shakes, Shopping } from './screens/diet/DietExtras';
import { Equipment, ExerciseDetail, History, Library, WorkoutDetail, WorkoutHome } from './screens/workout/Workout';
import { CheckinScreen, Goals, Lifts, Measures, MetricLog, Photos, ProgressHome } from './screens/progress/Progress';
import { LiveWorkout, SessionSummary, TodayShortcut } from './screens/workout/Live';

function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>Em construção.</Card>
    </>
  );
}

function Toast() {
  const toast = useUi((s) => s.toast);
  if (!toast) return null;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-safe">
      <div className="glass fade-up mt-2 flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold" style={{ background: 'var(--glass-strong)' }}>
        {toast.icon && <span className="text-accent"><Icon name={toast.icon} size={18} /></span>}
        {toast.text}
      </div>
    </div>
  );
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Shell() {
  const profile = useProfile();
  const { pathname } = useLocation();

  // Tema e transparência
  useEffect(() => {
    if (!profile) return;
    const root = document.documentElement;
    if (profile.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', profile.theme);
    root.setAttribute('data-blur', profile.blur ? 'on' : 'off');
  }, [profile]);

  if (!profile) return null;
  if (!profile.onboarded) return <Onboarding />;
  const hideTabs = pathname.startsWith('/treino/ao-vivo');

  return (
    <>
      <ScrollTop />
      <main className={hideTabs ? '' : 'mx-auto max-w-xl px-4 pb-32'}>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/dieta" element={<Diet />} />
          <Route path="/dieta/metas" element={<DietGoals />} />
          <Route path="/dieta/vitaminas" element={<Shakes />} />
          <Route path="/dieta/compras" element={<Shopping />} />
          <Route path="/treino" element={<WorkoutHome />} />
          <Route path="/treino/ao-vivo" element={<LiveWorkout />} />
          <Route path="/treino/hoje" element={<TodayShortcut />} />
          <Route path="/treino/equipamentos" element={<Equipment />} />
          <Route path="/treino/biblioteca" element={<Library />} />
          <Route path="/treino/historico" element={<History />} />
          <Route path="/treino/exercicio/:id" element={<ExerciseDetail />} />
          <Route path="/treino/resumo/:id" element={<SessionSummary />} />
          <Route path="/treino/:id" element={<WorkoutDetail />} />
          <Route path="/evolucao" element={<ProgressHome />} />
          <Route path="/evolucao/medidas" element={<Measures />} />
          <Route path="/evolucao/cargas" element={<Lifts />} />
          <Route path="/evolucao/fotos" element={<Photos />} />
          <Route path="/evolucao/checkin" element={<CheckinScreen />} />
          <Route path="/evolucao/metas" element={<Goals />} />
          <Route path="/evolucao/historico" element={<MetricLog />} />
          <Route path="/ajustes" element={<Placeholder title="Ajustes" />} />
        </Routes>
      </main>
      {!hideTabs && <TabBar />}
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureSeeded().finally(() => setReady(true));
    // Pede ao navegador para não apagar os dados (quando suportado).
    navigator.storage?.persist?.().catch(() => {});
  }, []);
  return (
    <HashRouter>
      <div className="mesh" aria-hidden="true" />
      <Toast />
      {ready && <Shell />}
    </HashRouter>
  );
}
