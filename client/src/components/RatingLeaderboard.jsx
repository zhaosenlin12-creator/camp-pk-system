import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { formatScore } from '../utils/score';

export default function RatingLeaderboard() {
  const { currentClass, ratingLeaderboard, fetchRatingLeaderboard } = useStore();

  useEffect(() => {
    if (currentClass) {
      fetchRatingLeaderboard(currentClass.id);
    }
  }, [currentClass]);

  // 定时刷新
  useEffect(() => {
    if (currentClass) {
      const interval = setInterval(() => {
        fetchRatingLeaderboard(currentClass.id);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [currentClass]);

  if (ratingLeaderboard.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-6xl mb-4">🏆</div>
        <p className="text-xl text-white font-bold">还没有评分记录</p>
        <p className="text-white/70 mt-2">完成展示评分后，排名将在这里显示</p>
      </div>
    );
  }

  // 排名样式
  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-gradient-to-r from-yellow-400 to-orange-400',
          text: 'text-white',
          icon: '🥇',
          scale: 'scale-105'
        };
      case 2:
        return {
          bg: 'bg-gradient-to-r from-gray-300 to-gray-400',
          text: 'text-white',
          icon: '🥈',
          scale: 'scale-102'
        };
      case 3:
        return {
          bg: 'bg-gradient-to-r from-amber-600 to-amber-700',
          text: 'text-white',
          icon: '🥉',
          scale: ''
        };
      default:
        return {
          bg: 'bg-white',
          text: 'text-gray-800',
          icon: '',
          scale: ''
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className="text-3xl font-black text-white drop-shadow-lg">
          🏆 展示评分排行榜
        </h2>
        <p className="text-white/80 mt-1">按平均分排名</p>
      </motion.div>

      {/* 排行榜列表 */}
      <div className="space-y-3">
        {ratingLeaderboard.map((item, index) => {
          const rank = index + 1;
          const style = getRankStyle(rank);
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${style.bg} ${style.scale} rounded-2xl p-4 shadow-lg`}
            >
              <div className="flex items-center gap-4">
                {/* 排名 */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  rank <= 3 ? 'bg-white/30' : 'bg-gray-100'
                }`}>
                  {style.icon ? (
                    <span className="text-2xl">{style.icon}</span>
                  ) : (
                    <span className={`text-xl font-bold ${style.text}`}>{rank}</span>
                  )}
                </div>

                {/* 头像和名字 */}
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">{item.student_avatar}</span>
                  <div>
                    <p className={`text-xl font-bold ${style.text}`}>{item.student_name}</p>
                    <p className={`text-sm ${rank <= 3 ? 'text-white/70' : 'text-gray-500'}`}>
                      {item.vote_count} 人打分
                    </p>
                  </div>
                </div>

                {/* 分数 */}
                <div className="text-right">
                  <div className={`text-3xl font-black ${rank <= 3 ? 'text-white' : 'text-cyan-600'}`}>
                    {formatScore(item.avg_score)}
                  </div>
                  <div className={`text-xs ${rank <= 3 ? 'text-white/70' : 'text-gray-400'}`}>
                    平均分
                  </div>
                </div>

                {/* 总分 */}
                <div className={`text-right px-3 py-1 rounded-lg ${
                  rank <= 3 ? 'bg-white/20' : 'bg-orange-100'
                }`}>
                  <div className={`text-lg font-bold ${rank <= 3 ? 'text-white' : 'text-orange-600'}`}>
                    {formatScore(item.total_score)}
                  </div>
                  <div className={`text-xs ${rank <= 3 ? 'text-white/70' : 'text-cyan-500'}`}>
                    总分
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 统计信息 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-center text-white/60 text-sm"
      >
        共 {ratingLeaderboard.length} 位学员参与展示评分
      </motion.div>
    </div>
  );
}
