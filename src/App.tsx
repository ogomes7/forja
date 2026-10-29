import { HashRouter, Route, Routes } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { PageHeader, Card } from './components/ui';

function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>Em construção.</Card>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <div className="mesh" aria-hidden="true" />
      <main className="mx-auto max-w-xl px-4 pb-32">
        <Routes>
          <Route path="/" element={<Placeholder title="Hoje" />} />
          <Route path="/treino/*" element={<Placeholder title="Treino" />} />
          <Route path="/dieta/*" element={<Placeholder title="Dieta" />} />
          <Route path="/evolucao/*" element={<Placeholder title="Evolução" />} />
        </Routes>
      </main>
      <TabBar />
    </HashRouter>
  );
}
