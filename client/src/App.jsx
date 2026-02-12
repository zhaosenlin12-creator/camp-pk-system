import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import DisplayPage from './pages/DisplayPage';
import AdminPage from './pages/AdminPage';
import ReportPage from './pages/ReportPage';
import ReportViewPage from './pages/ReportViewPage';
import { useStore } from './store/useStore';

function App() {
  const { fetchClasses, fetchRewards, fetchPunishments } = useStore();

  useEffect(() => {
    fetchClasses();
    fetchRewards();
    fetchPunishments();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-300">
      {/* 装饰云朵 - 仅在非报告查看页显示 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 text-8xl opacity-30 animate-float">☁️</div>
        <div className="absolute top-20 right-20 text-6xl opacity-20 animate-float" style={{animationDelay: '1s'}}>☁️</div>
        <div className="absolute top-40 left-1/4 text-7xl opacity-25 animate-float" style={{animationDelay: '2s'}}>☁️</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-20 animate-float" style={{animationDelay: '0.5s'}}>🌟</div>
        <div className="absolute bottom-40 left-20 text-4xl opacity-30 animate-float" style={{animationDelay: '1.5s'}}>⭐</div>
      </div>
      
      <div className="relative z-10">
        <Routes>
          <Route path="/" element={<DisplayPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/report/view/:reportId" element={<ReportViewPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
