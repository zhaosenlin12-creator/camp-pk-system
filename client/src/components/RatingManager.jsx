import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { formatScore } from '../utils/score';
import DangerConfirmModal from './DangerConfirmModal';

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
  const [showVoterNames, setShowVoterNames] = useState(false);
  const [pendingDangerAction, setPendingDangerAction] = useState(null);

  useEffect(() => {
    if (!currentClass) return;
    fetchActiveSession(currentClass.id);
    fetchRatingSessions(currentClass.id);
  }, [currentClass, fetchActiveSession, fetchRatingSessions]);

  useEffect(() => {
    if (!activeSession) {
      setSessionDetail(null);
      return;
    }

    loadSessionDetail(activeSession.id);
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) return undefined;

    const interval = setInterval(() => {
      if (!document.hidden) {
        void loadSessionDetail(activeSession.id);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeSession, currentClass]);

  const loadSessionDetail = async (sessionId) => {
    const detail = await fetchSessionDetail(sessionId);
    if (!detail) {
      setSessionDetail(null);
      if (currentClass) {
        await Promise.all([
          fetchActiveSession(currentClass.id),
          fetchRatingSessions(currentClass.id)
        ]);
      }
      return null;
    }

    setSessionDetail(detail);
    return detail;
  };

  const openDangerAction = (config) => {
    setError('');
    setPendingDangerAction(config);
  };

  const closeDangerAction = () => {
    if (loading) return;
    setPendingDangerAction(null);
  };

  const runDangerAction = async () => {
    if (!pendingDangerAction?.run) return;

    setLoading(true);
    setError('');

    try {
      await pendingDangerAction.run();
      setPendingDangerAction(null);
    } catch (err) {
      setError(err.message || pendingDangerAction.failureMessage || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRating = async () => {
    if (!selectedStudent) {
      setError('请先选择要评分的学员');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createRatingSession(currentClass.id, parseInt(selectedStudent, 10));
      setSelectedStudent('');
    } catch (err) {
      setError(err.message || '发起评分失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRating = () => {
    if (!activeSession) return;

    openDangerAction({
      title: '结束本轮评分？',
      description: '结束后系统会立刻计算平均分，并把结果累计到学员与战队积分中。',
      subjectLabel: activeSession.student_name,
      impacts: [
        '当前已提交的评分会立即生效。',
        '平均分会同步写入学员和战队积分。',
        '结束后的评分会进入历史记录，不能再继续投票。'
      ],
      confirmLabel: '确认结束评分',
      cancelLabel: '再等一下',
      failureMessage: '结束评分失败',
      run: async () => {
        await closeRatingSession(activeSession.id);
      }
    });
  };

  const handleCancelRating = () => {
    if (!sessionDetail) return;

    openDangerAction({
      title: '取消本次评分？',
      description: '取消后，这轮评分的全部投票记录会被清空，并且不会计入学员积分。',
      subjectLabel: sessionDetail.student_name,
      impacts: [
        '本轮投票会全部删除。',
        '本次评分不会计入学员和战队积分。',
        '此操作不可撤回，需要重新发起评分才会恢复。'
      ],
      confirmLabel: '确认取消评分',
      cancelLabel: '继续评分',
      failureMessage: '取消评分失败',
      run: async () => {
        await cancelRatingSession(sessionDetail.id);
        setSessionDetail(null);
      }
    });
  };

  const handleDeleteVote = (vote) => {
    openDangerAction({
      title: '删除这条评分？',
      description: '删除后，这位同学提交的评分会从当前评分会话中移除。',
      subjectLabel: vote?.voter_name || '评分记录',
      impacts: [
        '评分明细会立即更新。',
        '本轮平均分会按剩余有效投票重新计算。',
        '删除后不可恢复，除非学生重新提交评分。'
      ],
      confirmLabel: '确认删除评分',
      cancelLabel: '先保留',
      failureMessage: '删除评分失败',
      run: async () => {
        await deleteVote(vote.id);
        await loadSessionDetail(activeSession.id);
      }
    });
  };

  const handleDeleteSession = (session) => {
    openDangerAction({
      title: '删除这条历史评分？',
      description: '删除后，这次评分的分数结果和投票明细都不会再保留。',
      subjectLabel: session?.student_name || '历史评分',
      impacts: [
        '历史评分列表会立即更新。',
        '这次评分的明细记录会一起删除。',
        '此操作不可撤回，请确认不是误点。'
      ],
      confirmLabel: '确认删除记录',
      cancelLabel: '先保留',
      failureMessage: '删除历史记录失败',
      run: async () => {
        await deleteRatingSession(session.id);
      }
    });
  };

  const handleEditVote = async () => {
    if (!editingVote) return;

    try {
      await editVote(editingVote.id, editScore);
      setEditingVote(null);
      await loadSessionDetail(activeSession.id);
    } catch (err) {
      setError(err.message || '修改评分失败');
    }
  };

  const historySessions = ratingSessions.filter((session) => session.status === 'closed');
  const totalTargetVotes = Math.max(1, (sessionDetail?.total_students || 1) - 1);
  const voteProgress = Math.min(100, ((sessionDetail?.vote_count || 0) / totalTargetVotes) * 100);

  return (
    <div className="space-y-6">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl border-2 border-orange-200 bg-gradient-to-r from-yellow-100 to-orange-100 p-4 font-bold text-orange-700"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            className="text-xl font-bold text-orange-400 transition hover:text-orange-600"
          >
            ×
          </button>
        </motion.div>
      )}

      {activeSession && sessionDetail ? (
        <div className="card-game bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-2xl"
              >
                🔴
              </motion.span>
              评分进行中
            </h3>
            <span className="rounded-full bg-white px-3 py-1 text-sm text-gray-500">
              {new Date(sessionDetail.created_at).toLocaleTimeString()}
            </span>
          </div>

          <div className="mb-4 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-white to-orange-50 p-4 shadow-sm">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className="text-5xl"
            >
              {sessionDetail.student_avatar}
            </motion.div>
            <div>
              <p className="text-2xl font-black text-gray-800">{sessionDetail.student_name}</p>
              <p className="mt-1 text-sm text-gray-500">正在接受全班展示评分</p>
            </div>
          </div>

          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold text-gray-600">评分进度</span>
              <span className="text-2xl font-black text-cyan-600">
                {sessionDetail.vote_count} / {totalTargetVotes}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-gray-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${voteProgress}%` }}
                transition={{ duration: 0.5 }}
                className="h-4 rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500"
              />
            </div>
          </div>

          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="font-bold text-gray-700">评分明细</h4>
              <button
                onClick={() => setShowVoterNames((value) => !value)}
                className="rounded-full bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:from-gray-200 hover:to-gray-300"
              >
                {showVoterNames ? '隐藏姓名' : '显示姓名'}
              </button>
            </div>

            {sessionDetail.votes?.length > 0 ? (
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {sessionDetail.votes.map((vote, index) => (
                  <motion.div
                    key={vote.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-50 to-pink-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 font-bold text-gray-400">#{index + 1}</span>
                      <span className="font-bold text-gray-700">
                        {showVoterNames ? vote.voter_name : '***'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black text-cyan-600">{vote.score}</span>
                      <button
                        onClick={() => {
                          setEditingVote(vote);
                          setEditScore(vote.score);
                        }}
                        className="rounded-lg p-2 text-blue-500 transition hover:bg-blue-100"
                        title="编辑评分"
                      >
                        ✍️
                      </button>
                      <button
                        onClick={() => handleDeleteVote(vote)}
                        className="rounded-lg p-2 text-red-500 transition hover:bg-red-100"
                        title="删除评分"
                      >
                        🗑️
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-gray-400">当前还没有人提交评分</p>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCloseRating}
            disabled={loading || sessionDetail.vote_count === 0}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xl font-black shadow-lg transition-all ${
              loading || sessionDetail.vote_count === 0
                ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                : 'bg-gradient-to-r from-green-400 via-teal-400 to-cyan-400 text-white hover:shadow-xl'
            }`}
          >
            {loading ? '处理中...' : '✅ 结束评分并结算'}
          </motion.button>

          <button
            onClick={handleCancelRating}
            disabled={loading}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-bold transition-all ${
              loading
                ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 hover:from-red-100 hover:to-red-200 hover:text-red-600'
            }`}
          >
            ⛔ 取消评分
          </button>
        </div>
      ) : (
        <div className="card-game bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
          <h3 className="mb-4 flex items-center gap-2 text-2xl font-black text-gray-800">
            <span className="text-3xl">🎯</span>
            发起展示评分
          </h3>

          <div className="mb-4">
            <label className="mb-2 block font-bold text-gray-700">选择被评分学员</label>
            <select
              value={selectedStudent}
              onChange={(event) => {
                setSelectedStudent(event.target.value);
                setError('');
              }}
              className="w-full rounded-2xl border-2 border-gray-200 bg-white p-4 text-lg font-medium outline-none focus:border-cyan-400"
            >
              <option value="">请选择学员...</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.avatar} {student.name}
                </option>
              ))}
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartRating}
            disabled={loading || !selectedStudent}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xl font-black shadow-lg transition-all ${
              loading || !selectedStudent
                ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 text-white hover:shadow-xl'
            }`}
          >
            {loading ? '发起中...' : '🚀 发起评分'}
          </motion.button>
        </div>
      )}

      {historySessions.length > 0 && (
        <div className="card-game bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <h3 className="mb-4 flex items-center gap-2 text-2xl font-black text-gray-800">
            <span className="text-3xl">📚</span>
            历史评分记录
          </h3>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {historySessions.map((session) => (
              <motion.div
                key={session.id}
                whileHover={{ scale: 1.01 }}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <motion.span
                    animate={{ rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                    className="text-3xl"
                  >
                    {session.student_avatar}
                  </motion.span>
                  <div>
                    <p className="text-lg font-black text-gray-800">{session.student_name}</p>
                    <p className="text-sm text-gray-500">
                      <span className="font-bold text-cyan-600">{session.vote_count}</span>人评分
                      {' · '}总分 <span className="font-bold text-teal-600">{formatScore(session.total_score)}</span>
                      {' · '}平均 <span className="font-bold text-blue-600">{formatScore(session.avg_score)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-400">
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDeleteSession(session)}
                    className="rounded-lg p-2 text-red-400 transition hover:bg-red-100"
                    title="删除历史记录"
                  >
                    🗑️
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

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
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="mb-4 text-lg font-bold text-gray-800">编辑评分</h3>
              <p className="mb-3 text-gray-600">
                打分同学：<span className="font-medium">{editingVote.voter_name}</span>
              </p>
              <div className="mb-4">
                <label className="mb-2 block text-gray-600">分数（0 - 10）</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={editScore}
                  onChange={(event) => setEditScore(parseInt(event.target.value, 10) || 0)}
                  className="w-full rounded-xl border-2 border-gray-200 p-3 text-center text-2xl font-bold outline-none focus:border-cyan-400"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingVote(null)}
                  className="flex-1 rounded-xl bg-gray-100 py-2 font-medium transition hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleEditVote}
                  className="flex-1 rounded-xl bg-cyan-500 py-2 font-medium text-white transition hover:bg-cyan-600"
                >
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DangerConfirmModal
        open={Boolean(pendingDangerAction)}
        title={pendingDangerAction?.title || '确认继续？'}
        description={pendingDangerAction?.description || ''}
        subjectLabel={pendingDangerAction?.subjectLabel || ''}
        impacts={pendingDangerAction?.impacts || []}
        errorMessage={error}
        busy={loading}
        confirmLabel={pendingDangerAction?.confirmLabel || '确认'}
        cancelLabel={pendingDangerAction?.cancelLabel || '取消'}
        testId="danger-confirm-rating"
        onCancel={closeDangerAction}
        onConfirm={runDangerAction}
      />
    </div>
  );
}
