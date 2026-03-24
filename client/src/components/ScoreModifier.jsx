import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useStore } from '../store/useStore';
import { soundManager } from '../utils/sounds';
import { formatScore } from '../utils/score';

const SCORE_OPTIONS = [
  { value: 1, label: '+1', color: '#6BCB77' },
  { value: 5, label: '+5', color: '#4ECDC4' },
  { value: 10, label: '+10', color: '#45B7D1' },
  { value: -1, label: '-1', color: '#FF9F43' },
  { value: -5, label: '-5', color: '#FF6B6B' },
  { value: -10, label: '-10', color: '#EE5A5A' },
];

const REASONS = [
  { emoji: '✋', text: '积极举手' },
  { emoji: '💡', text: '回答正确' },
  { emoji: '🎯', text: '完成任务' },
  { emoji: '🤝', text: '团队协作' },
  { emoji: '⏰', text: '准时出勤' },
  { emoji: '🌟', text: '表现优秀' },
  { emoji: '📝', text: '作业完成' },
  { emoji: '🎨', text: '创意加分' },
  { emoji: '😴', text: '上课走神' },
  { emoji: '📱', text: '玩手机' },
  { emoji: '🗣️', text: '随意讲话' },
  { emoji: '⏰', text: '迟到' },
];

export default function ScoreModifier({ student, onClose }) {
  const { updateStudentScore } = useStore();
  const [selectedScore, setSelectedScore] = useState(null);
  const [customScore, setCustomScore] = useState('');
  const [selectedReason, setSelectedReason] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationData, setAnimationData] = useState(null);

  const handleConfirm = async () => {
    const finalScore = customScore ? parseInt(customScore) : selectedScore?.value;
    
    if (!finalScore || !selectedReason) return;
    if (isNaN(finalScore)) return;

    setAnimationData({
      score: finalScore,
      reason: selectedReason.text,
      studentName: student.name,
    });
    setShowAnimation(true);

    if (finalScore > 0) {
      soundManager.playScoreUp();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#6BCB77'],
      });
    } else {
      soundManager.playScoreDown();
    }

    await updateStudentScore(student.id, finalScore, selectedReason.text);

    setTimeout(() => {
      setShowAnimation(false);
      onClose();
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 积分变化动画 */}
        <AnimatePresence>
          {showAnimation && animationData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center bg-white/95 rounded-3xl z-10"
            >
              <div className="text-center">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: animationData.score > 0 ? [0, 10, -10, 0] : [0, -5, 5, 0],
                  }}
                  transition={{ duration: 0.5 }}
                  className={`text-8xl font-black ${
                    animationData.score > 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {animationData.score > 0 ? '+' : ''}{animationData.score}
                </motion.div>
                <div className="text-2xl font-bold text-gray-700 mt-4">
                  {animationData.studentName}
                </div>
                <div className="text-lg text-gray-500 mt-2">
                  {animationData.reason}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 学生信息 */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b">
          <span className="text-5xl">{student.avatar}</span>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{student.name}</h3>
            <p className="text-gray-500">当前积分: {formatScore(student.score)}</p>
          </div>
        </div>

        {/* 积分选择 */}
        <div className="mb-6">
          <h4 className="text-lg font-bold text-gray-700 mb-3">选择积分变化</h4>
          <div className="grid grid-cols-3 gap-3">
            {SCORE_OPTIONS.map((option) => (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedScore(option);
                  setCustomScore('');
                  soundManager.playClick();
                }}
                className={`py-4 rounded-xl font-bold text-xl text-white transition-all ${
                  selectedScore?.value === option.value && !customScore ? 'ring-4 ring-yellow-400 ring-offset-2' : ''
                }`}
                style={{ backgroundColor: option.color }}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
          
          {/* 自定义分数输入 */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">或自定义分数：</label>
            <input
              type="number"
              value={customScore}
              onChange={(e) => {
                setCustomScore(e.target.value);
                setSelectedScore(null);
              }}
              placeholder="输入任意分数（可为负数）"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none text-center text-xl font-bold"
            />
          </div>
        </div>

        {/* 原因选择 */}
        <div className="mb-6">
          <h4 className="text-lg font-bold text-gray-700 mb-3">选择原因</h4>
          <div className="grid grid-cols-3 gap-2">
            {REASONS.map((reason) => (
              <motion.button
                key={reason.text}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedReason(reason);
                  soundManager.playClick();
                }}
                className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                  selectedReason?.text === reason.text
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {reason.emoji} {reason.text}
              </motion.button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
          >
            取消
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            disabled={(!selectedScore && !customScore) || !selectedReason}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
              (selectedScore || customScore) && selectedReason
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 shadow-lg'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            确认修改
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
