// 段位系统 - 结合小学生喜欢的元素设计
export const RANKS = [
  { name: '萌新小白', minScore: -Infinity, maxScore: 0, icon: '🥚', color: '#9CA3AF', bgColor: 'from-gray-400 to-gray-500' },
  { name: '青铜学徒', minScore: 0, maxScore: 50, icon: '🥉', color: '#CD7F32', bgColor: 'from-amber-600 to-amber-700' },
  { name: '白银战士', minScore: 50, maxScore: 100, icon: '🥈', color: '#C0C0C0', bgColor: 'from-gray-300 to-gray-400' },
  { name: '黄金勇者', minScore: 100, maxScore: 200, icon: '🥇', color: '#FFD700', bgColor: 'from-yellow-400 to-amber-500' },
  { name: '铂金精英', minScore: 200, maxScore: 350, icon: '💎', color: '#00CED1', bgColor: 'from-cyan-400 to-teal-500' },
  { name: '钻石大师', minScore: 350, maxScore: 500, icon: '💠', color: '#00BFFF', bgColor: 'from-blue-400 to-indigo-500' },
  { name: '星耀传说', minScore: 500, maxScore: 700, icon: '⭐', color: '#9B59B6', bgColor: 'from-purple-500 to-pink-500' },
  { name: '王者荣耀', minScore: 700, maxScore: 1000, icon: '👑', color: '#FF6B6B', bgColor: 'from-red-500 to-rose-600' },
  { name: '最强王者', minScore: 1000, maxScore: 1500, icon: '🏆', color: '#FFD700', bgColor: 'from-yellow-500 to-orange-500' },
  { name: '无敌战神', minScore: 1500, maxScore: Infinity, icon: '🔱', color: '#FF1493', bgColor: 'from-pink-500 to-red-500' },
];

export function getRank(score) {
  for (const rank of RANKS) {
    if (score >= rank.minScore && score < rank.maxScore) {
      return rank;
    }
  }
  return RANKS[RANKS.length - 1];
}

export function getNextRank(score) {
  const currentRank = getRank(score);
  const currentIndex = RANKS.indexOf(currentRank);
  if (currentIndex < RANKS.length - 1) {
    return RANKS[currentIndex + 1];
  }
  return null;
}

export function getProgressToNextRank(score) {
  const currentRank = getRank(score);
  const nextRank = getNextRank(score);
  
  if (!nextRank || currentRank.maxScore === Infinity) {
    return 100;
  }
  
  const rangeStart = Math.max(currentRank.minScore, 0);
  const rangeEnd = currentRank.maxScore;
  const progress = ((score - rangeStart) / (rangeEnd - rangeStart)) * 100;
  
  return Math.min(Math.max(progress, 0), 100);
}

// 头像选项
export const AVATARS = [
  '🎮', '🎯', '🚀', '⚡', '🔥', '💫', '🌟', '✨',
  '🦊', '🐱', '🐶', '🐼', '🐨', '🦁', '🐯', '🐰',
  '🦄', '🐲', '🦋', '🌈', '🎨', '🎭', '🎪', '🎢',
  '🏀', '⚽', '🎾', '🏆', '🥇', '💪', '🦸', '🦹',
  '👨‍🚀', '👨‍🔬', '👨‍💻', '👨‍🎨', '🧙', '🥷', '🤖', '👾'
];

// 战队颜色选项
export const TEAM_COLORS = [
  { name: '烈焰红', value: '#FF6B6B' },
  { name: '海洋蓝', value: '#4ECDC4' },
  { name: '阳光橙', value: '#FF9F43' },
  { name: '森林绿', value: '#2ECC71' },
  { name: '星空紫', value: '#9B59B6' },
  { name: '天空蓝', value: '#3498DB' },
  { name: '樱花粉', value: '#FD79A8' },
  { name: '柠檬黄', value: '#F1C40F' },
];
