import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useStore } from './store/useStore';

const DisplayPage = lazy(() => import('./pages/DisplayPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const CertificatePage = lazy(() => import('./pages/CertificatePage'));

function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card-game max-w-sm text-center">
        <div className="text-5xl">🐾</div>
        <div className="mt-4 text-xl font-black text-gray-800">页面加载中</div>
        <p className="mt-2 text-sm text-gray-500">正在准备班级大作战内容...</p>
      </div>
    </div>
  );
}

function App() {
  const { fetchClasses, fetchRewards, fetchPunishments, fetchPets } = useStore();

  useEffect(() => {
    fetchClasses();
    fetchRewards();
    fetchPunishments();
    fetchPets();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-300">
      {/* 装饰云朵 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 text-8xl opacity-30 animate-float">☁️</div>
        <div className="absolute top-20 right-20 text-6xl opacity-20 animate-float" style={{animationDelay: '1s'}}>☁️</div>
        <div className="absolute top-40 left-1/4 text-7xl opacity-25 animate-float" style={{animationDelay: '2s'}}>☁️</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-20 animate-float" style={{animationDelay: '0.5s'}}>🌟</div>
        <div className="absolute bottom-40 left-20 text-4xl opacity-30 animate-float" style={{animationDelay: '1.5s'}}>⭐</div>
      </div>
      
      <div className="relative z-10">
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<DisplayPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/report/:shortId" element={<ReportPage />} />
            <Route path="/report/view/:reportId" element={<ReportPage />} />
            <Route path="/certificate/:shortId" element={<CertificatePage />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default App;
