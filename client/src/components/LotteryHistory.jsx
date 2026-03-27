import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import DangerConfirmModal from './DangerConfirmModal';

export default function LotteryHistory({ onClose }) {
  const { currentClass, lotteryLogs, fetchLotteryLogs, clearLotteryLogs, teams } = useStore();
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentClass) return;
    loadLogs();
  }, [currentClass, filterDate, filterType]);

  const loadLogs = async () => {
    if (!currentClass) return;

    setLoading(true);
    try {
      await fetchLotteryLogs(currentClass.id, filterDate, filterType);
    } catch (err) {
      console.error('加载抽奖记录失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!currentClass) return;
    setLoading(true);
    try {
      await clearLotteryLogs(currentClass.id);
      setClearDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    const date = new Date(value);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getTeamColor = (teamId) => {
    const team = teams.find((item) => item.id === teamId);
    return team?.color || '#666';
  };

  const getTargetLabel = (log) => {
    if (log?.target_name) return log.target_name;
    if (log?.target_type === 'team') return log?.team_name || '未指定战队';
    return log?.team_name || '未指定对象';
  };

  const groupedLogs = lotteryLogs.reduce((groups, log) => {
    const date = log.created_at.split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
    return groups;
  }, {});

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">📵 抽奖记录</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-sm text-white/80">{currentClass?.name || '未选择班级'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b bg-gray-50 p-4">
            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">全部类型</option>
              <option value="reward">🏆 奖励</option>
              <option value="punishment">😈 惩罚</option>
            </select>
            <input
              type="date"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-sm text-gray-500 transition hover:text-gray-700"
              >
                清空日期
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setClearDialogOpen(true)}
              className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-200"
            >
              🗑️ 清空记录
            </button>
          </div>

          <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 180px)' }}>
            {loading ? (
              <div className="py-10 text-center text-gray-400">加载中...</div>
            ) : lotteryLogs.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mb-3 text-5xl">📭</div>
                <p className="text-gray-400">当前还没有抽奖记录</p>
              </div>
            ) : (
              Object.entries(groupedLogs).map(([date, logs]) => (
                <div key={date} className="mb-6">
                  <div className="sticky top-0 mb-2 bg-white py-1 text-sm font-bold text-gray-500">
                    📅 {date}
                  </div>
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`rounded-xl border-2 p-3 ${
                          log.type === 'reward'
                            ? 'border-yellow-200 bg-yellow-50'
                            : 'border-purple-200 bg-purple-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{log.item_icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-gray-800">{log.item_name}</div>
                            {log.effect_summary && (
                              <div className="mt-1 text-sm font-medium text-gray-600">
                                {log.effect_summary}
                              </div>
                            )}
                            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                              <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ backgroundColor: getTeamColor(log.team_id) }}
                              />
                              <span>{getTargetLabel(log)}</span>
                              <span>·</span>
                              <span>{formatDate(log.created_at)}</span>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                              log.type === 'reward'
                                ? 'bg-yellow-200 text-yellow-700'
                                : 'bg-purple-200 text-purple-700'
                            }`}
                          >
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

      <DangerConfirmModal
        open={clearDialogOpen}
        title="清空本班抽奖记录？"
        description="清空后，这个班级当前保存的全部奖励与惩罚抽奖记录都会被移除。"
        subjectLabel={currentClass?.name || ''}
        impacts={[
          '抽奖历史列表会立即清空。',
          '这批记录不会再出现在老师端查询里。',
          '此操作不可撤回，请确认不是误点。'
        ]}
        busy={loading}
        confirmLabel="确认清空记录"
        cancelLabel="先保留"
        testId="danger-confirm-lottery-history"
        onCancel={() => {
          if (loading) return;
          setClearDialogOpen(false);
        }}
        onConfirm={handleClear}
      />
    </>
  );
}
