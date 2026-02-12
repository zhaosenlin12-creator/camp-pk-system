import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function LotteryHistory({ onClose }) {
  const { currentClass, lotteryLogs, fetchLotteryLogs, clearLotteryLogs, teams } = useStore();
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentClass) {
      loadLogs();
    }
  }, [currentClass, filterType, filterDate]);

  const loadLogs = async () => {
    if (!currentClass) return;
    setLoading(true);
    try {
      await fetchLotteryLogs(currentClass.id, filterDate, filterType);
    } catch (err) {
      console.error('加载记录失败:', err);
    }
    setLoading(false);
  };

  const handleClear = async () => {
    if (!currentClass) return;
    if (window.confirm('确定要清空所有抽奖记录吗？此操作不可恢复！')) {
      await clearLotteryLogs(currentClass.id);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getTeamColor = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.color || '#666';
  };

  // 按日期分组
  const groupedLogs = lotteryLogs.reduce((groups, log) => {
    const date = log.created_at.split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
    return groups;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* 头部 */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">📋 抽奖记录</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">✕</button>
          </div>
          <p className="text-white/80 text-sm mt-1">{currentClass?.name || '未选择班级'}</p>
        </div>

        {/* 筛选栏 */}
        <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-3 items-center">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
          >
            <option value="all">全部类型</option>
            <option value="reward">🎁 奖励</option>
            <option value="punishment">😈 惩罚</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-sm text-gray-500 hover:text-gray-700">清除日期</button>
          )}
          <div className="flex-1" />
          <button
            onClick={handleClear}
            className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200"
          >
            🗑️ 清空记录
          </button>
        </div>

        {/* 记录列表 */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 180px)' }}>
          {loading ? (
            <div className="text-center py-10 text-gray-400">加载中...</div>
          ) : lotteryLogs.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-400">暂无抽奖记录</p>
            </div>
          ) : (
            Object.entries(groupedLogs).map(([date, logs]) => (
              <div key={date} className="mb-6">
                <div className="text-sm font-bold text-gray-500 mb-2 sticky top-0 bg-white py-1">
                  📅 {date}
                </div>
                <div className="space-y-2">
                  {logs.map(log => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-xl border-2 ${
                        log.type === 'reward' 
                          ? 'bg-yellow-50 border-yellow-200' 
                          : 'bg-purple-50 border-purple-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{log.item_icon}</span>
                        <div className="flex-1">
                          <div className="font-bold text-gray-800">{log.item_name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span
                              className="inline-block w-3 h-3 rounded-full"
                              style={{ backgroundColor: getTeamColor(log.team_id) }}
                            />
                            <span>{log.team_name}</span>
                            <span>•</span>
                            <span>{formatDate(log.created_at)}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          log.type === 'reward' 
                            ? 'bg-yellow-200 text-yellow-700' 
                            : 'bg-purple-200 text-purple-700'
                        }`}>
                          {log.type === 'reward' ? '奖励' : '惩罚'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}