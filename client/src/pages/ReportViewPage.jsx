import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getRank } from '../utils/ranks';
import { ORG_INFO, REPORT_EXPIRE_DAYS } from '../utils/certificates';

export default function ReportViewPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else if (res.status === 410) {
        // 服务端返回过期状态
        setExpired(true);
      } else {
        setError('报告不存在或已过期');
      }
    } catch (err) {
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-100 to-amber-50">
        <div className="text-center">
          <div className="text-5xl animate-bounce mb-4">📄</div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-100 to-amber-50">
        <div className="text-center max-w-sm mx-auto p-6">
          <div className="text-5xl mb-4">⏰</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">报告已过期</h2>
          <p className="text-gray-600 text-sm">
            该报告链接已超过{REPORT_EXPIRE_DAYS}天有效期，如需查看请联系老师重新生成。
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-100 to-amber-50">
        <div className="text-center">
          <div className="text-5xl mb-4">😢</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const rank = getRank(report.student_score);
  const scoreLogs = report.score_logs || [];
  const photos = report.photos || [];
  const rewards = scoreLogs.filter(log => log.delta > 0);
  const penalties = scoreLogs.filter(log => log.delta < 0);
  const totalRewardPoints = rewards.reduce((sum, log) => sum + log.delta, 0);
  const totalPenaltyPoints = Math.abs(penalties.reduce((sum, log) => sum + log.delta, 0));

  const displayDate = new Date(report.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 via-amber-50 to-orange-100">
      {/* 头部 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 text-center shadow-lg"
      >
        <div className="text-sm opacity-80 mb-1">{ORG_INFO.name}</div>
        <h1 className="text-2xl font-black mb-1">🎓 结营报告</h1>
        <p className="text-sm opacity-80">{ORG_INFO.campName}</p>
      </motion.div>

      <div className="max-w-lg mx-auto p-4">
        {/* 学员信息卡片 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl p-5 mb-6 text-white shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/30 rounded-full flex items-center justify-center text-5xl shadow-inner">
              {report.student_avatar}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black">{report.student_name}</h2>
              {report.team_name && (
                <p className="text-white/80 text-sm">⚔️ {report.team_name}</p>
              )}
              <p className="text-white/70 text-xs">{report.class_name}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl">{rank.icon}</div>
              <div className="text-sm font-bold">{rank.name}</div>
            </div>
          </div>
        </motion.div>

        {/* 积分统计 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-white rounded-xl p-4 text-center shadow-md border border-orange-100">
            <div className="text-3xl font-black text-orange-600">{report.student_score}</div>
            <div className="text-xs text-orange-500 mt-1">总积分</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-md border border-green-100">
            <div className="text-3xl font-black text-green-600">+{totalRewardPoints}</div>
            <div className="text-xs text-green-500 mt-1">获得积分</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-md border border-red-100">
            <div className="text-3xl font-black text-red-600">-{totalPenaltyPoints}</div>
            <div className="text-xs text-red-500 mt-1">扣除积分</div>
          </div>
        </motion.div>

        {/* 积分记录 */}
        {scoreLogs.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-4 mb-6 shadow-md"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              📊 积分明细
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scoreLogs.map((log, index) => (
                <div 
                  key={log.id || index}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    log.delta > 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={log.delta > 0 ? 'text-green-500' : 'text-red-500'}>
                      {log.delta > 0 ? '🎉' : '😅'}
                    </span>
                    <span className="text-gray-700 text-sm">{log.reason || '积分变动'}</span>
                  </div>
                  <span className={`font-bold ${log.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {log.delta > 0 ? '+' : ''}{log.delta}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 照片墙 */}
        {photos.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-4 mb-6 shadow-md"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              📸 精彩瞬间
            </h3>
            <div className={`grid gap-2 ${
              photos.length === 1 ? 'grid-cols-1' :
              photos.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
            }`}>
              {photos.map((photo, index) => (
                <div 
                  key={index}
                  className="aspect-square rounded-xl overflow-hidden shadow-sm"
                >
                  <img 
                    src={photo} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* AI老师寄语 */}
        {report.ai_comment && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-4 mb-6 shadow-md"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              💌 老师寄语
            </h3>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {report.ai_comment}
              </p>
              <div className="text-right mt-3 text-amber-600 text-sm font-medium">
                —— {report.teacher_name || '老师'}
              </div>
            </div>
          </motion.div>
        )}

        {/* 底部 */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center py-6"
        >
          <p className="text-xl font-bold text-orange-600 mb-1">{ORG_INFO.name}</p>
          <p className="text-gray-500 text-sm">
            感谢参与{ORG_INFO.campName}，期待下次再见！
          </p>
          <p className="text-gray-400 text-xs mt-2">
            {displayDate}
          </p>
        </motion.div>

        {/* 备案信息 */}
        <div className="text-center py-4 border-t border-gray-200 mt-4">
          <p className="text-gray-400 text-xs">
            {ORG_INFO.name}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            <a 
              href={ORG_INFO.icpUrl}
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-600"
            >
              {ORG_INFO.icp}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
