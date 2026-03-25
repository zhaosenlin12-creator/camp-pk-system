import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { CURRENT_CLASS_STORAGE_KEY, useStore } from './store/useStore';

const DisplayPage = lazy(() => import('./pages/DisplayPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const CertificatePage = lazy(() => import('./pages/CertificatePage'));

function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card-game max-w-sm text-center">
        <div className="text-5xl">宠物</div>
        <div className="mt-4 text-xl font-black text-gray-800">页面加载中</div>
        <p className="mt-2 text-sm text-gray-500">正在准备班级互动内容...</p>
      </div>
    </div>
  );
}

function App() {
  const { fetchClasses, fetchRewards, fetchPunishments, fetchPets, syncCurrentClassFromStorage } = useStore();

  useEffect(() => {
    fetchClasses();
    fetchRewards();
    fetchPunishments();
    fetchPets();
  }, [fetchClasses, fetchPets, fetchPunishments, fetchRewards]);

  useEffect(() => {
    const syncClassSelection = () => {
      syncCurrentClassFromStorage();
    };

    const handleStorage = (event) => {
      if (event.key && event.key !== CURRENT_CLASS_STORAGE_KEY) {
        return;
      }

      syncClassSelection();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncClassSelection();
      }
    };

    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncCurrentClassFromStorage]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-300">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-10 top-10 text-8xl opacity-30 animate-float">☁️</div>
        <div className="absolute right-20 top-20 text-6xl opacity-20 animate-float" style={{ animationDelay: '1s' }}>☁️</div>
        <div className="absolute left-1/4 top-40 text-7xl opacity-25 animate-float" style={{ animationDelay: '2s' }}>☁️</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-20 animate-float" style={{ animationDelay: '0.5s' }}>✨</div>
        <div className="absolute bottom-40 left-20 text-4xl opacity-30 animate-float" style={{ animationDelay: '1.5s' }}>🐾</div>
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
