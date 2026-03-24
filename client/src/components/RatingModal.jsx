import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function RatingModal({ session, onClose }) {
  const { students, submitVote, checkVoted, fetchActiveSession, currentClass } = useStore();
  const [selectedName, setSelectedName] = useState('');
  const [selectedScore, setSelectedScore] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [myScore, setMyScore] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 获取可选的学员列表（排除被评学生）
  const voterOptions = students.filter(s => s.name !== session?.student_name);

  // 检查是否已打分
  useEffect(() => {
    if (selectedName && session) {
      checkVoted(session.id, selectedName).then(result => {
        setHasVoted(result.voted);
        setMyScore(result.your_score);
      });
    }
  }, [selectedName, session]);

  // 处理提交打分
  const handleSubmit = async () => {
    if (!selectedName) {
      setError('请先选择你的姓名');
      return;
    }
    if (selectedScore === null) {
      setError('请选择分数');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await submitVote(session.id, selectedName, selectedScore);
      setSuccess(true);
      setHasVoted(true);
      setMyScore(selectedScore);
      // 刷新会话数据
      if (currentClass) {
        fetchActiveSession(currentClass.id);
      }
    } catch (err) {
      setError(err.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 分数按钮
  const scoreButtons = Array.from({ length: 11 }, (_, i) => i);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="bg-gradient-to-r from-cyan-300/60 via-teal-300/60 to-blue-300/60 backdrop-blur-sm p-8 text-center text-white relative overflow-hidden">
            {/* 装饰星星 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-2xl"
                  initial={{ 
                    x: Math.random() * 100 + '%',
                    y: Math.random() * 100 + '%',
                    scale: 0,
                    rotate: 0
                  }}
                  animate={{ 
                    scale: [0, 1, 0],
                    rotate: 360,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                >
                  ⭐
                </motion.div>
              ))}
            </div>
            
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-3"
            >
              🎯
            </motion.div>
            <h2 className="text-2xl font-black drop-shadow-lg">为 {session?.student_name} 打分</h2>
            <p className="text-white/90 mt-1 font-medium">展示评分</p>
          </div>

          {/* 内容 */}
          <div className="p-6">
            {/* 已打分状态 */}
            {hasVoted ? (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="text-8xl mb-4"
                >
                  ✅
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-black text-gray-800 mb-3"
                >
                  {success ? '打分成功！🎉' : '你已经打过分了'}
                </motion.p>
                <div className="bg-gradient-to-r from-cyan-50/50 to-teal-50/50 rounded-2xl p-4 mb-6">
                  <p className="text-gray-600 mb-2">你给</p>
                  <p className="text-xl font-bold text-cyan-600 mb-2">{session?.student_name}</p>
                  <p className="text-gray-600 mb-2">打了</p>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                    className="text-6xl font-black bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent"
                  >
                    {myScore}
                  </motion.div>
                  <p className="text-gray-600 mt-2">分</p>
                </div>
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-full font-bold text-gray-700 transition-all shadow-md"
                >
                  关闭
                </button>
              </div>
            ) : (
              <>
                {/* 选择姓名 */}
                <div className="mb-6">
                  <label className="block text-gray-700 font-bold mb-3 flex items-center gap-2">
                    <span className="text-2xl">👤</span> 你的姓名
                  </label>
                  <select
                    value={selectedName}
                    onChange={e => {
                      setSelectedName(e.target.value);
                      setError('');
                    }}
                    className="w-full p-4 border-3 border-gray-200 rounded-2xl text-lg focus:border-cyan-300 focus:outline-none bg-gradient-to-r from-cyan-50/50 to-teal-50/50 font-medium"
                  >
                    <option value="">请选择...</option>
                    {voterOptions.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 选择分数 */}
                <div className="mb-6">
                  <label className="block text-gray-700 font-bold mb-3 flex items-center gap-2">
                    <span className="text-2xl">⭐</span> 打分 (0-10分)
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {scoreButtons.map(score => (
                      <motion.button
                        key={score}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setSelectedScore(score);
                          setError('');
                        }}
                        className={`aspect-square rounded-2xl font-black text-xl transition-all ${
                          selectedScore === score
                            ? 'bg-gradient-to-br from-cyan-300 to-teal-400 text-white shadow-lg scale-110'
                            : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 hover:from-cyan-50 hover:to-teal-50'
                        }`}
                      >
                        {score}
                      </motion.button>
                    ))}
                  </div>
                  {selectedScore !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 text-center bg-gradient-to-r from-cyan-50/50 to-teal-50/50 rounded-2xl p-4"
                    >
                      <span className="text-gray-600">你选择了 </span>
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5 }}
                        className="text-4xl font-black bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent"
                      >
                        {selectedScore}
                      </motion.span>
                      <span className="text-gray-600"> 分</span>
                    </motion.div>
                  )}
                </div>

                {/* 错误提示 */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 rounded-2xl text-center font-bold flex items-center justify-center gap-2 border-2 border-orange-200"
                  >
                    <span className="text-2xl">⚠️</span>
                    {error}
                  </motion.div>
                )}

                {/* 按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-2xl font-bold text-gray-700 transition-all shadow-md"
                  >
                    取消
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={submitting || !selectedName || selectedScore === null}
                    className={`flex-1 py-4 rounded-2xl font-black text-lg transition-all shadow-lg ${
                      submitting || !selectedName || selectedScore === null
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 text-white hover:shadow-xl'
                    }`}
                  >
                    {submitting ? '提交中...' : '✨ 确认打分'}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
