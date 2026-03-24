import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { formatScore } from '../utils/score';

export default function RatingManager() {
  const {
    currentClass,
    students,
    activeSession,
    ratingSessions,
    fetchActiveSession,
    fetchRatingSessions,
    fetchSessionDetail,
    createRatingSession,
    closeRatingSession,
    cancelRatingSession,
    deleteVote,
    editVote,
    deleteRatingSession
  } = useStore();

  const [sessionDetail, setSessionDetail] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingVote, setEditingVote] = useState(null);
  const [editScore, setEditScore] = useState(0);

  // 加载数据
  useEffect(() => {
    if (currentClass) {
      fetchActiveSession(currentClass.id);
      fetchRatingSessions(currentClass.id);
    }
  }, [currentClass]);

  // 加载活跃会话详情
  useEffect(() => {
    if (activeSession) {
      loadSessionDetail(activeSession.id);
    } else {
      setSessionDetail(null);
    }
  }, [activeSession]);

  // 定时刷新活跃会话
  useEffect(() => {
    if (activeSession) {
      const interval = setInterval(() => {
        if (!document.hidden) {
          loadSessionDetail(activeSession.id);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  const loadSessionDetail = async (sessionId) => {
    const detail = await fetchSessionDetail(sessionId);
    setSessionDetail(detail);
  };

  // 发起打分
  const handleStartRating = async () => {
    if (!selectedStudent) {
      setError('请选择要评分的学员');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createRatingSession(currentClass.id, parseInt(selectedStudent));
      setSelectedStudent('');
    } catch (err) {
      setError(err.message || '发起失败');
    } finally {
      setLoading(false);
    }
  };

  // 结束打分
  const handleCloseRating = async () => {
    if (!activeSession) return;

    if (!confirm('确定要结束本轮评分吗？结束后将自动计算分数并累加到学员积分。')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await closeRatingSession(activeSession.id);
    } catch (err) {
      setError(err.message || '结束失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除打分记录
  const handleDeleteVote = async (voteId) => {
    if (!confirm('确定要删除这条打分记录吗？')) return;

    try {
      await deleteVote(voteId);
      loadSessionDetail(activeSession.id);
    } catch (err) {
      setError(err.message || '删除失败');
    }
  };

  // 编辑打分记录
  const handleEditVote = async () => {
    if (!editingVote) return;

    try {
      await editVote(editingVote.id, editScore);
      setEditingVote(null);
      loadSessionDetail(activeSession.id);
    } catch (err) {
      setError(err.message || '编辑失败');
    }
  };

  // 删除历史会话
  const handleDeleteSession = async (sessionId) => {
    if (!confirm('确定要删除这条评分记录吗？此操作不可恢复。')) return;

    try {
      await deleteRatingSession(sessionId);
    } catch (err) {
      setError(err.message || '删除失败');
    }
  };

  // 历史会话列表（排除当前活跃的）
  const historySessions = ratingSessions.filter(s => s.status === 'closed');
  
  // 是否显示打分者姓名
  const [showVoterNames, setShowVoterNames] = useState(false);

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 rounded-2xl font-bold border-2 border-orange-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            {error}
          </div>
          <button onClick={() => setError('')} className="text-orange-400 hover:text-orange-600 text-xl font-bold">✕</button>
        </motion.div>
      )}

      {/* 当前进行中的评分 */}
      {activeSession && sessionDetail ? (
        <div className="card-game bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-2xl"
              >
                🔴
              </motion.span>
              评分进行中
            </h3>
            <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
              {new Date(sessionDetail.created_at).toLocaleTimeString()}
            </span>
          </div>

          {/* 被评学生信息 */}
          <div className="bg-gradient-to-r from-white to-orange-50 rounded-2xl p-4 mb-4 flex items-center gap-4 shadow-sm">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl"
            >
              {sessionDetail.student_avatar}
            </motion.div>
            <div>
              <p className="text-2xl font-black text-gray-800">{sessionDetail.student_name}</p>
              <p className="text-gray-500 flex items-center gap-1">
                <span className="text-lg">🎯</span> 正在接受评分
              </p>
            </div>
          </div>

          {/* 打分进度 */}
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-600 font-bold flex items-center gap-2">
                <span className="text-xl">📊</span> 打分进度
              </span>
              <span className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                {sessionDetail.vote_count} / {sessionDetail.total_students - 1}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 h-4 rounded-full"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${Math.min(100, (sessionDetail.vote_count / Math.max(1, sessionDetail.total_students - 1)) * 100)}%` 
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* 打分明细 */}
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-700 flex items-center gap-2">
                <span className="text-xl">📋</span> 打分明细
              </h4>
              <button
                onClick={() => setShowVoterNames(!showVoterNames)}
                className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <span className="text-lg">{showVoterNames ? '👁️' : '👁️‍🗨️'}</span>
                {showVoterNames ? '隐藏姓名' : '显示姓名'}
              </button>
            </div>
            {sessionDetail.votes?.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sessionDetail.votes.map((vote, index) => (
                  <motion.div
                    key={vote.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-bold w-8">#{index + 1}</span>
                      <span className="font-bold text-gray-700">
                        {showVoterNames ? vote.voter_name : '***'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                        {vote.score}
                      </span>
                      <button
                        onClick={() => {
                          setEditingVote(vote);
                          setEditScore(vote.score);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteVote(vote.id)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-6 text-lg">暂无打分记录</p>
            )}
          </div>

          {/* 结束按钮 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCloseRating}
            disabled={loading || sessionDetail.vote_count === 0}
            className={`w-full py-4 rounded-2xl font-black text-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
              loading || sessionDetail.vote_count === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-400 via-teal-400 to-cyan-400 text-white hover:shadow-xl'
            }`}
          >
            {loading ? '处理中...' : (
              <>
                <span className="text-2xl">✅</span> 结束评分并计算分数
              </>
            )}
          </motion.button>

          {/* 取消按钮 */}
          <button
            onClick={async () => {
              if (!window.confirm('确定要取消本次评分吗？所有投票记录将被删除，不会计入分数。')) return;
              setLoading(true);
              try {
                await cancelRatingSession(sessionDetail.id);
                setSessionDetail(null);
              } catch (err) {
                setError(err.message);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className={`w-full py-3 mt-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
              loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 hover:from-red-100 hover:to-red-200 hover:text-red-600'
            }`}
          >
            <span className="text-xl">❌</span> 取消评分
          </button>
        </div>
      ) : (
        /* 发起新评分 */
        <div className="card-game bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
          <h3 className="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-3xl">🎯</span> 发起展示评分
          </h3>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2">
              <span className="text-xl">👤</span> 选择被评学员
            </label>
            <select
              value={selectedStudent}
              onChange={e => {
                setSelectedStudent(e.target.value);
                setError('');
              }}
              className="w-full p-4 border-3 border-gray-200 rounded-2xl focus:border-cyan-400 focus:outline-none bg-white text-lg font-medium shadow-sm"
            >
              <option value="">请选择学员...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.avatar} {s.name}
                </option>
              ))}
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartRating}
            disabled={loading || !selectedStudent}
            className={`w-full py-4 rounded-2xl font-black text-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
              loading || !selectedStudent
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 text-white hover:shadow-xl'
            }`}
          >
            {loading ? '发起中...' : (
              <>
                <span className="text-2xl">🚀</span> 发起评分
              </>
            )}
          </motion.button>
        </div>
      )}

      {/* 历史评分记录 */}
      {historySessions.length > 0 && (
        <div className="card-game bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <h3 className="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-3xl">📚</span> 历史评分记录
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {historySessions.map(session => (
              <motion.div
                key={session.id}
                whileHover={{ scale: 1.01 }}
                className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-3xl"
                  >
                    {session.student_avatar}
                  </motion.span>
                  <div>
                    <p className="font-black text-gray-800 text-lg">{session.student_name}</p>
                    <p className="text-sm text-gray-500">
                      <span className="font-bold text-cyan-600">{session.vote_count}</span>人打分 · 
                      总分 <span className="font-bold text-teal-600">{formatScore(session.total_score)}</span> · 
                      平均 <span className="font-bold text-blue-600">{formatScore(session.avg_score)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-2 text-red-400 hover:bg-red-100 rounded-lg transition-colors"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      <AnimatePresence>
        {editingVote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setEditingVote(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-800 mb-4">编辑打分</h3>
              <p className="text-gray-600 mb-3">
                打分者：<span className="font-medium">{editingVote.voter_name}</span>
              </p>
              <div className="mb-4">
                <label className="block text-gray-600 mb-2">分数 (0-10)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={editScore}
                  onChange={e => setEditScore(parseInt(e.target.value) || 0)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-cyan-400 focus:outline-none text-center text-2xl font-bold"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingVote(null)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleEditVote}
                  className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium"
                >
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
