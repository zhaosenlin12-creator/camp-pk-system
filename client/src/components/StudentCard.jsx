import { motion } from 'framer-motion';
import { getRank, getProgressToNextRank, getNextRank } from '../utils/ranks';

export default function StudentCard({ student, rank, compact = false }) {
  const studentRank = getRank(student.score);
  const progress = getProgressToNextRank(student.score);
  const nextRank = getNextRank(student.score);

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1: return { icon: '🥇', bg: 'from-yellow-50 to-orange-50', border: '#FFD700' };
      case 2: return { icon: '🥈', bg: 'from-gray-50 to-slate-50', border: '#C0C0C0' };
      case 3: return { icon: '🥉', bg: 'from-orange-50 to-amber-50', border: '#CD7F32' };
      default: return { icon: null, bg: 'from-white to-gray-50', border: '#E5E7EB' };
    }
  };

  const style = getRankStyle(rank);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm"
      >
        <span className="text-2xl">{student.avatar}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold">{student.name}</span>
            <span className="text-sm">{studentRank.icon}</span>
          </div>
        </div>
        <div className="text-xl font-bold" style={{ color: studentRank.color }}>
          {student.score}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={`card-game bg-gradient-to-r ${style.bg} relative overflow-hidden`}
      style={{ borderColor: style.border }}
    >
      {/* 排名徽章 */}
      {rank <= 3 && (
        <div className="absolute -top-1 -left-1 text-4xl">{style.icon}</div>
      )}

      <div className="flex items-center gap-4">
        {/* 头像 */}
        <div className="relative">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl"
          >
            {student.avatar}
          </motion.div>
          {rank > 3 && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
              {rank}
            </div>
          )}
        </div>

        {/* 信息 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-800">{student.name}</h3>
            {student.team_name && (
              <span
                className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                style={{ backgroundColor: student.team_color || '#888' }}
              >
                {student.team_name}
              </span>
            )}
          </div>

          {/* 段位 */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="rank-badge text-white"
              style={{ background: `linear-gradient(135deg, ${studentRank.color}, ${studentRank.color}dd)` }}
            >
              {studentRank.icon} {studentRank.name}
            </span>
          </div>

          {/* 进度条 */}
          {nextRank && (
            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: studentRank.color }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{studentRank.name}</span>
                <span>→ {nextRank.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* 积分 */}
        <motion.div
          key={student.score}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          className="text-right"
        >
          <div className="text-4xl font-black" style={{ color: studentRank.color }}>
            {student.score}
          </div>
          <div className="text-sm text-gray-500">积分</div>
        </motion.div>
      </div>
    </motion.div>
  );
}
