import { useState } from 'react';
import { motion } from 'framer-motion';
import { getRank, getProgressToNextRank, getNextRank } from '../utils/ranks';
import { formatScore } from '../utils/score';
import PetArtwork from './PetArtwork';
import PetProfileModal from './PetProfileModal';
import { getPetCareItems, getPetPowerTone, getPetStatusTone, getStudentPetCapacity, getStudentPetCollection, getStudentPetJourney } from '../utils/petJourney';
import { getPetVisualMeta } from '../utils/petVisuals';

function getRankStyle(rank) {
  switch (rank) {
    case 1:
      return { icon: '🥇', bg: 'from-yellow-50 via-white to-orange-50', border: '#FACC15' };
    case 2:
      return { icon: '🥈', bg: 'from-slate-50 via-white to-gray-50', border: '#CBD5E1' };
    case 3:
      return { icon: '🥉', bg: 'from-orange-50 via-white to-amber-50', border: '#FB923C' };
    default:
      return { icon: null, bg: 'from-white via-white to-slate-50', border: '#E2E8F0' };
  }
}

function getRitualHint(journey, visualMeta) {
  if (!journey.claimed) return '等待领取';
  if (journey.can_evolve) return '可举办进化仪式';
  if (journey.can_hatch) return '可举办孵化仪式';
  if (journey.visual_state === 'egg') {
    return journey.selected_species ? `目标：${journey.selected_species}` : '蛋态培养中';
  }
  return visualMeta?.badge || '课堂伙伴';
}

function getStudentStory(studentName, journey) {
  if (!journey.claimed) {
    return '还没有绑定专属宠物，当前会先以宠物蛋的形式等待认领。领取后，课堂积分和照料行为才会真正开始累积。';
  }

  if (journey.visual_state === 'egg') {
    return `${studentName} 已经拿到了专属宠物蛋，继续通过课堂积分与照料动作，把期待感正式兑换成“我的宠物出生了”。`;
  }

  if (journey.can_evolve) {
    return `${journey.name} 已满足进化条件，只差一次公开的高光仪式，就能把“我真的养大了它”的感觉拉满。`;
  }

  if (journey.can_hatch) {
    return `${journey.name} 已达到孵化门槛，现在很适合在课堂里安排一次公开孵化，让学生立刻感知奖励兑现。`;
  }

  if (journey.slot_state === 'evolved') {
    return `${journey.name} 已经进入高级形态，当前重点不再只是升级，而是维持状态、稳定发挥和持续制造展示时刻。`;
  }

  return `${journey.name} 正处在 ${journey.stage_name} 阶段，课堂表现、照料次数与状态条会一起决定它接下来变成什么样。`;
}

function getPassportNarrative(journey, visualMeta) {
  if (!journey.claimed) {
    return '先去宠物中心为学生绑定一只课堂伙伴，宠物档案才会正式点亮。';
  }

  if (journey.visual_state === 'egg') {
    if (journey.selected_species) {
      return `目标宠物是 ${journey.selected_species}，只要继续积累成长值和照料次数，就会迎来正式破壳。`;
    }
    return '当前仍是宠物蛋状态，优先补课堂积分和基础照料动作。';
  }

  return visualMeta?.vibe || journey.stage_description;
}

function getNextUnlockCopy(journey) {
  if (!journey.claimed) return '领取宠物后，课堂成长才会正式开始。';
  if (journey.can_evolve) return '现在就可以举办进化仪式，解锁更高阶形态。';
  if (journey.can_hatch) return '已满足孵化条件，适合安排一次公开孵化。';
  if (journey.visual_state === 'egg') return '继续增加课堂积分和照料动作，解锁正式形态。';
  if (journey.slot_state === 'evolved') return '终阶形态已解锁，后续重点是维持状态和打造个人展示感。';
  return `继续提升成长值和照料评分，冲击下一阶段 Lv.${Math.min((journey.stage_level || 1) + 1, 5)}。`;
}

function CareBar({ label, value, color }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function InfoPill({ label, value, toneClassName = 'bg-white/88 text-slate-600' }) {
  return (
    <div className={`rounded-[20px] px-3 py-3 text-center shadow-sm ${toneClassName}`}>
      <div className="text-[11px] font-black uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-1 text-base font-black">{value}</div>
    </div>
  );
}

function PetPanel({ student, onPreview }) {
  const journey = getStudentPetJourney(student);
  const visualMeta = getPetVisualMeta(student.pet);
  const tone = getPetStatusTone(journey);
  const careItems = getPetCareItems(journey);
  const powerTone = getPetPowerTone(journey.power_score);
  const ritualChip = getRitualHint(journey, visualMeta);
  const panelCopy = getPassportNarrative(journey, visualMeta);
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPreview();
    }
  };

  return (
    <div
      className="pet-passport-card relative overflow-hidden rounded-[30px] border border-white/70 px-4 py-4 shadow-sm"
      style={{
        background: `linear-gradient(180deg, ${journey.theme || '#FFF7ED'} 0%, rgba(255,255,255,0.98) 100%)`
      }}
      data-testid={`student-pet-passport-${student.id}`}
      role="button"
      tabIndex={0}
      onClick={onPreview}
      onKeyDown={handleKeyDown}
      aria-label={`查看 ${student.name} 的宠物成长档案`}
    >
      <div className="absolute -right-8 top-4 h-24 w-24 rounded-full bg-white/45 blur-2xl" aria-hidden="true" />
      <div
        className="absolute bottom-0 left-0 h-20 w-24 rounded-full blur-2xl"
        style={{ backgroundColor: `${journey.accent || '#F59E0B'}1f` }}
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-500 shadow-sm">
              <span>宠物成长档案</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="truncate text-xl font-black text-slate-800">{journey.name}</div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${tone.bg} ${tone.text}`}>
                {journey.status_label}
              </span>
              <span className="rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                {ritualChip}
              </span>
            </div>
            <div className="mt-2 text-xs font-bold text-slate-500">
              {journey.visual_state === 'egg' ? '蛋态培养阶段' : `Lv.${journey.stage_level} · ${journey.stage_name}`}
            </div>
          </div>

          <span className={`rounded-full px-3 py-1.5 text-xs font-black shadow-sm ${powerTone.bg} ${powerTone.text}`}>
            培养力 {journey.power_score}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[108px_minmax(0,1fr)]">
          <div className="pet-hero-frame flex h-[108px] w-[108px] items-center justify-center rounded-[30px] bg-white/92">
            <PetArtwork
              pet={student.pet}
              journey={journey}
              className="flex h-[92px] w-[92px] items-center justify-center"
              imageClassName="h-[78px] w-[78px] object-contain"
              fallbackClassName="text-4xl"
            />
          </div>

          <div className="min-w-0">
            <p className="text-sm leading-6 text-slate-600">{panelCopy}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <InfoPill label="成长值" value={journey.growth_value} />
              <InfoPill label="照料评分" value={journey.care_score} />
              <InfoPill label="照料次数" value={journey.total_care_actions || 0} toneClassName={`${powerTone.bg} ${powerTone.text}`} />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {careItems.map((item) => (
            <CareBar key={item.key} label={item.label} value={item.value} color={item.color} />
          ))}
        </div>

        <div className="mt-4 rounded-[24px] bg-white/84 px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">下一次惊喜</div>
            <span className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[10px] font-black text-slate-500">
              {journey.slot_state === 'evolved' ? '终阶已解锁' : '持续培养'}
            </span>
          </div>
          <p className="mt-2 text-sm font-black leading-6 text-slate-800">{journey.next_target}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{getNextUnlockCopy(journey)}</p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs font-black text-slate-500">
          <span>点击查看完整成长档案与阶段预览</span>
          <span className="rounded-full bg-slate-900 px-3 py-1.5 text-white">立即查看</span>
        </div>
      </div>
    </div>
  );
}

export default function StudentCard({ student, rank, compact = false }) {
  const [showPetProfile, setShowPetProfile] = useState(false);
  const studentRank = getRank(student.score);
  const progress = getProgressToNextRank(student.score);
  const nextRank = getNextRank(student.score);
  const style = getRankStyle(rank);
  const journey = getStudentPetJourney(student);
  const petCollection = getStudentPetCollection(student);
  const petCapacity = getStudentPetCapacity(student);
  const visualMeta = getPetVisualMeta(student.pet);
  const powerTone = getPetPowerTone(journey.power_score);
  const ritualHint = getRitualHint(journey, visualMeta);
  const story = getStudentStory(student.name, journey);
  const openPetProfile = () => setShowPetProfile(true);
  const closePetProfile = () => setShowPetProfile(false);
  const handleCardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPetProfile();
    }
  };

  if (compact) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="pet-passport-card flex items-center gap-3 rounded-[24px] border border-white/70 bg-white/92 p-3 shadow-sm"
          role="button"
          tabIndex={0}
          onClick={openPetProfile}
          onKeyDown={handleCardKeyDown}
          aria-label={`查看 ${student.name} 的宠物成长档案`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-50 text-2xl shadow-sm">
            {student.avatar}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-black text-slate-800">{student.name}</span>
              <span className="text-sm">{studentRank.icon}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <PetArtwork
                pet={student.pet}
                journey={journey}
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50"
                imageClassName="h-5 w-5 object-contain"
                fallbackClassName="text-sm"
              />
              <span className="truncate">{journey.name}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">{journey.stage_name}</span>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 font-bold text-violet-700">
                收藏 {petCollection.length}/{petCapacity}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className={`rounded-full px-3 py-1 text-[11px] font-black ${powerTone.bg} ${powerTone.text}`}>
              {journey.power_score}
            </div>
            <div className="mt-1 text-lg font-black" style={{ color: studentRank.color }}>
              {formatScore(student.score)}
            </div>
          </div>
        </motion.div>

        <PetProfileModal
          open={showPetProfile}
          studentName={student.name}
          pet={student.pet}
          journey={student.pet_journey}
          collection={petCollection}
          petCapacity={petCapacity}
          collectionSlotId={student.active_pet_slot_id}
          onClose={closePetProfile}
        />
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.008 }}
        className={`pet-passport-card card-game relative overflow-hidden bg-gradient-to-br ${style.bg}`}
        style={{ borderColor: style.border }}
        role="button"
        tabIndex={0}
        onClick={openPetProfile}
        onKeyDown={handleCardKeyDown}
        aria-label={`查看 ${student.name} 的宠物成长档案`}
      >
        <div className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-white/40 blur-3xl" aria-hidden="true" />
        <div
          className="absolute bottom-0 left-0 h-28 w-32 rounded-full blur-3xl"
          style={{ backgroundColor: `${journey.accent || '#F59E0B'}15` }}
          aria-hidden="true"
        />
        {rank <= 3 && <div className="absolute left-4 top-3 text-4xl">{style.icon}</div>}

        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start gap-4">
              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, 4, -4, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                  className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/70 bg-white/80 text-5xl shadow-sm"
                >
                  {student.avatar}
                </motion.div>

                {rank > 3 && (
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-black text-white shadow-sm">
                    {rank}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-2xl font-black text-slate-800">{student.name}</h3>
                      {student.team_name && (
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-black text-white shadow-sm"
                          style={{ backgroundColor: student.team_color || '#888' }}
                        >
                          {student.team_name}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className="rank-badge text-white shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${studentRank.color}, ${studentRank.color}dd)`
                        }}
                      >
                        {studentRank.icon} {studentRank.name}
                      </span>
                      <span className={`pet-score-chip ${powerTone.bg} ${powerTone.text}`}>培养力 {journey.power_score}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
                        {ritualHint}
                      </span>
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
                        收藏 {petCollection.length}/{petCapacity}
                      </span>
                    </div>
                  </div>

                  <motion.div
                    key={student.score}
                    initial={{ scale: 1.12 }}
                    animate={{ scale: 1 }}
                    className="rounded-[24px] bg-white/86 px-4 py-3 text-right shadow-sm"
                  >
                    <div className="text-4xl font-black" style={{ color: studentRank.color }}>
                      {formatScore(student.score)}
                    </div>
                    <div className="text-sm font-bold text-slate-500">课堂积分</div>
                  </motion.div>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black shadow-sm" style={{ backgroundColor: `${journey.accent}16`, color: journey.accent }}>
                  <PetArtwork
                    pet={student.pet}
                    journey={journey}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/75"
                    imageClassName="h-5 w-5 object-contain"
                    fallbackClassName="text-sm"
                  />
                  <span>{journey.name}</span>
                  <span>Lv.{Math.max(journey.stage_level || 0, journey.claimed ? 1 : 0)}</span>
                </div>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{story}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <InfoPill label="宠物阶段" value={journey.stage_name} />
                  <InfoPill label="照料次数" value={journey.total_care_actions || 0} />
                  <InfoPill label="成长值" value={journey.growth_value} toneClassName={`${powerTone.bg} ${powerTone.text}`} />
                </div>

                {petCollection.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {petCollection.map((slot) => (
                      <span
                        key={slot.slot_id || slot.pet_id}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black shadow-sm ${
                          slot.is_active ? 'bg-cyan-100 text-cyan-700' : 'bg-white text-slate-500'
                        }`}
                      >
                        <PetArtwork
                          pet={slot.pet}
                          journey={slot.journey}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80"
                          imageClassName="h-4 w-4 object-contain"
                          fallbackClassName="text-xs"
                        />
                        <span>{slot.journey.name}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-5 rounded-[24px] bg-white/78 px-4 py-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black text-slate-700">课堂段位进度</div>
                    <div className="text-xs font-bold text-slate-500">
                      {nextRank ? `${studentRank.name} → ${nextRank.name}` : '当前已是最高段位'}
                    </div>
                  </div>

                  <div className="mt-3 h-3 rounded-full bg-slate-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${nextRank ? progress : 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: studentRank.color }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500">
                    <span>{nextRank ? `距离下一段位还差一点课堂表现。` : '段位已满，继续维持状态。'}</span>
                    <span className="rounded-full bg-slate-900 px-3 py-1.5 text-white">点击整张卡片查看宠物档案</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <PetPanel student={student} onPreview={openPetProfile} />
        </div>
      </motion.div>

      <PetProfileModal
        open={showPetProfile}
        studentName={student.name}
        pet={student.pet}
        journey={student.pet_journey}
        collection={petCollection}
        petCapacity={petCapacity}
        collectionSlotId={student.active_pet_slot_id}
        onClose={closePetProfile}
      />
    </>
  );
}
