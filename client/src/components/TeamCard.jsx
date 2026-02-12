import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function TeamCard({ team, rank, showMembers = false }) {
  const { students } = useStore();
  const teamMembers = students.filter(s => s.team_id === team.id);

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1: return { icon: '🥇', bg: 'from-yellow-100 to-orange-100', border: '#FFD700' };
      case 2: return { icon: '🥈', bg: 'from-gray-100 to-slate-100', border: '#C0C0C0' };
      case 3: return { icon: '🥉', bg: 'from-orange-100 to-amber-100', border: '#CD7F32' };
      default: return { icon: `#${rank}`, bg: 'from-white to-gray-50', border: '#E5E7EB' };
    }
  };

  const style = getRankStyle(rank);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={`card-game bg-gradient-to-r ${style.bg} relative overflow-hidden`}
      style={{ borderColor: style.border }}
    >
      {/* 装饰 */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 -translate-y-1/2 translate-x-1/2"
        style={{ backgroundColor: team.color }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{style.icon}</span>
            <div>
              <h3 className="text-xl font-bold" style={{ color: team.color }}>
                {team.name}
              </h3>
              <p className="text-sm text-gray-500">{teamMembers.length} 名成员</p>
            </div>
          </div>
          
          <motion.div
            key={team.score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-right"
          >
            <div className="text-4xl font-black" style={{ color: team.color }}>
              {team.score}
            </div>
            <div className="text-sm text-gray-500">积分</div>
          </motion.div>
        </div>

        {showMembers && teamMembers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm shadow-sm"
                >
                  <span>{member.avatar}</span>
                  <span className="font-medium">{member.name}</span>
                  <span className="text-gray-400">({member.score})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
