import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import ClassSelector from '../components/ClassSelector';
import CertificateManager from '../components/report/CertificateManager';
import ReportGenerator from '../components/report/ReportGenerator';
import Footer from '../components/Footer';

export default function ReportPage() {
  const { isAdmin, currentClass } = useStore();
  const [verified, setVerified] = useState(false);
  const [activeTab, setActiveTab] = useState('certificate');
  const { verifyAdmin } = useStore();

  useEffect(() => {
    if (isAdmin) setVerified(true);
  }, [isAdmin]);

  // 简单的密码验证
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    const success = await verifyAdmin(pin);
    if (success) {
      setVerified(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1000);
    }
  };

  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card-game max-w-sm w-full text-center"
        >
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">结营报告系统</h2>
          
          <form onSubmit={handleVerify}>
            <motion.input
              animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="请输入管理密码"
              className={`w-full px-6 py-4 text-2xl text-center rounded-xl border-4 outline-none ${
                error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-orange-400'
              }`}
              maxLength={6}
            />
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full mt-4 btn-game btn-orange text-xl"
            >
              进入系统
            </motion.button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* 头部 */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <motion.h1
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-3xl font-black text-white drop-shadow-lg"
          >
            📋 结营报告系统
          </motion.h1>
          
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="px-4 py-2 rounded-xl bg-white/20 text-white hover:bg-white/30 font-bold"
            >
              🔧 管理中心
            </a>
            <a
              href="/"
              className="px-4 py-2 rounded-xl bg-white/20 text-white hover:bg-white/30 font-bold"
            >
              📺 展示页
            </a>
          </div>
        </div>

        <ClassSelector showCreate={false} />
      </header>

      {!currentClass ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-10"
        >
          <div className="text-6xl mb-4 animate-bounce">👆</div>
          <p className="text-xl text-white font-bold">请先选择一个班级</p>
        </motion.div>
      ) : (
        <>
          {/* Tab 切换 */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setActiveTab('certificate')}
              className={`px-6 py-3 rounded-full font-bold transition-all ${
                activeTab === 'certificate'
                  ? 'bg-white text-orange-500 shadow-lg'
                  : 'bg-white/30 text-white hover:bg-white/50'
              }`}
            >
              🏆 奖状生成
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-6 py-3 rounded-full font-bold transition-all ${
                activeTab === 'report'
                  ? 'bg-white text-orange-500 shadow-lg'
                  : 'bg-white/30 text-white hover:bg-white/50'
              }`}
            >
              📄 结营报告
            </button>
          </div>

          {/* 内容区域 */}
          <AnimatePresence mode="wait">
            {activeTab === 'certificate' ? (
              <motion.div
                key="certificate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <CertificateManager />
              </motion.div>
            ) : (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ReportGenerator />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* 备案信息 */}
      <Footer className="mt-8" />
    </div>
  );
}
