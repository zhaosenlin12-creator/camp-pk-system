import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { formatScore } from '../utils/score';
import PetArtwork from './PetArtwork';
import { getStudentPetJourney } from '../utils/petJourney';

export default function TeamCard({ team, rank, showMembers = false }) {
  const { students } = useStore();
  const teamMembers = students.filter((student) => student.team_id === team.id);
  const claimedPets = teamMembers.filter((member) => member.pet_id).length;
  const evolvedPets = teamMembers.filter(
    (member) => getStudentPetJourney(member).slot_state === 'evolved'
  ).length;

  const getRankStyle = (currentRank) => {
    switch (currentRank) {
      case 1:
        return { icon: '🥇', bg: 'from-yellow-100 to-orange-100', border: '#FFD700' };
      case 2:
        return { icon: '🥈', bg: 'from-gray-100 to-slate-100', border: '#C0C0C0' };
      case 3:
        return { icon: '🥉', bg: 'from-orange-100 to-amber-100', border: '#CD7F32' };
      default:
        return { icon: `#${currentRank}`, bg: 'from-white to-gray-50', border: '#E5E7EB' };
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
      <div
        className="absolute top-0 right-0 h-24 w-24 rounded-full opacity-20 -translate-y-1/2 translate-x-1/2"
        style={{ backgroundColor: team.color }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{style.icon}</span>
            <div>
              <h3 className="text-xl font-bold" style={{ color: team.color }}>
                {team.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span>{teamMembers.length} 名成员</span>
                <span>·</span>
                <span>{claimedPets}/{teamMembers.length || 0} 已领宠物</span>
                <span>·</span>
                <span>{evolvedPets} 只已进化</span>
              </div>
            </div>
          </div>

          <motion.div
            key={team.score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-right"
          >
            <div className="text-4xl font-black" style={{ color: team.color }}>
              {formatScore(team.score)}
            </div>
            <div className="text-sm text-gray-500">积分</div>
          </motion.div>
        </div>

        {showMembers && teamMembers.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex flex-wrap gap-2">
              {teamMembers.map((member) => {
                const journey = getStudentPetJourney(member);

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm shadow-sm"
                  >
                    <span>{member.avatar}</span>
                    <span className="font-medium">{member.name}</span>
                    <div
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold"
                      style={{
                        backgroundColor: `${journey.accent}18`,
                        color: journey.accent
                      }}
                    >
                      <PetArtwork
                        pet={member.pet}
                        journey={journey}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/70"
                        imageClassName="h-4 w-4 object-contain"
                        fallbackClassName="text-xs"
                      />
                      <span>{journey.name}</span>
                    </div>
                    <span className="text-gray-400">({formatScore(member.score)})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
