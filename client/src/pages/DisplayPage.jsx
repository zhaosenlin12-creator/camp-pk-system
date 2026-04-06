import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import BrandMark from '../components/BrandMark';
import ClassSelector from '../components/ClassSelector';
import TeamCard from '../components/TeamCard';
import StudentCard from '../components/StudentCard';
import PetArtwork from '../components/PetArtwork';
import LotteryWheel from '../components/LotteryWheel';
import PunishmentDisplay from '../components/PunishmentDisplay';
import RatingModal from '../components/RatingModal';
import RatingLeaderboard from '../components/RatingLeaderboard';
import RandomStudentPickerModal from '../components/RandomStudentPickerModal';
import { formatScore } from '../utils/score';
import {
  getClassPetSummary,
  getPetPowerTone,
  getStudentPetCapacity,
  getStudentPetCollection,
  getStudentPetJourney
} from '../utils/petJourney';
import { soundManager } from '../utils/sounds';

const TAB_PANE_TRANSITION = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1]
};

const DISPLAY_TABS = [
  { key: 'teams', label: '⚔️ 战队榜' },
  { key: 'students', label: '🧑 宠物卡' },
  { key: 'pets', label: '🐾 主角秀台' },
  { key: 'rating', label: '🌟 评分榜' }
];

function OverviewStatCard({ label, value, accentClassName, hint }) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/94 px-4 py-3 shadow-sm">
      <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-black ${accentClassName}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</div>}
    </div>
  );
}

export default function DisplayPage() {
  const store = useStore();
  const { currentClass, teams, students, rewards, punishments, loading, fetchStudents } = store;
  const [activeTab, setActiveTab] = useState('pets');
  const [showRewardWheel, setShowRewardWheel] = useState(false);
  const [showPunishmentWheel, setShowPunishmentWheel] = useState(false);
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  const sortedTeams = [...teams].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const sortedStudents = [...students].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const leadNumRaw = sortedTeams.length >= 2
    ? Number(sortedTeams[0].score || 0) - Number(sortedTeams[1].score || 0)
    : 0;
  const leadNum = Math.round(leadNumRaw * 10) / 10;
  const isLeadTie = Math.abs(leadNum) < 0.05;
  const petSummary = getClassPetSummary(sortedStudents);
  const hatchedCount = sortedStudents.filter((student) => getStudentPetJourney(student).visual_state === 'pet').length;
  const evolvedCount = sortedStudents.filter((student) => getStudentPetJourney(student).slot_state === 'evolved').length;
  const petLeaderboard = useMemo(
    () => sortedStudents
      .map((student) => ({
        student,
        journey: getStudentPetJourney(student),
        collection: getStudentPetCollection(student),
        petCapacity: getStudentPetCapacity(student)
      }))
      .sort((left, right) => {
        if (right.journey.power_score !== left.journey.power_score) {
          return right.journey.power_score - left.journey.power_score;
        }

        return Number(right.student.score || 0) - Number(left.student.score || 0);
      })
      .slice(0, 5),
    [sortedStudents]
  );
  const multiPetOwners = useMemo(
    () => sortedStudents.filter((student) => getStudentPetCollection(student).length > 1).length,
    [sortedStudents]
  );
  const collectionLeaderboard = useMemo(
    () => sortedStudents
      .map((student) => ({
        student,
        journey: getStudentPetJourney(student),
        collection: getStudentPetCollection(student),
        petCapacity: getStudentPetCapacity(student)
      }))
      .filter((entry) => entry.collection.length > 1)
      .sort((left, right) => {
        if (right.collection.length !== left.collection.length) {
          return right.collection.length - left.collection.length;
        }

        if (right.journey.power_score !== left.journey.power_score) {
          return right.journey.power_score - left.journey.power_score;
        }

        return Number(right.student.score || 0) - Number(left.student.score || 0);
      })
      .slice(0, 3),
    [sortedStudents]
  );
  const spotlightPet = petLeaderboard[0] || null;
  const rankingHighlightSignature = useMemo(
    () => petLeaderboard
      .map((entry) => `${entry.student.id}:${entry.journey.power_score}:${Number(entry.student.score || 0)}`)
      .join('|'),
    [petLeaderboard]
  );
  const previousRankingHighlightRef = useRef('');
  const rankingHighlightReadyRef = useRef(false);

  useEffect(() => {
    if (currentClass) {
      useStore.getState().fetchActiveSession(currentClass.id).then((session) => {
        setActiveSession(session);
      });
    } else {
      setActiveSession(null);
    }
  }, [currentClass]);

  useEffect(() => {
    if (!currentClass) return;

    const interval = setInterval(() => {
      if (document.hidden) return;
      useStore.getState().fetchTeams(currentClass.id);
      useStore.getState().fetchStudents(currentClass.id);
      useStore.getState().fetchActiveSession(currentClass.id).then((session) => {
        setActiveSession(session);
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [currentClass]);

  useEffect(() => {
    if (activeTab !== 'pets' || !rankingHighlightSignature) return;

    if (!rankingHighlightReadyRef.current) {
      rankingHighlightReadyRef.current = true;
      previousRankingHighlightRef.current = rankingHighlightSignature;
      return;
    }

    if (!document.hidden && previousRankingHighlightRef.current && previousRankingHighlightRef.current !== rankingHighlightSignature) {
      soundManager.playRankingHighlight();
    }

    previousRankingHighlightRef.current = rankingHighlightSignature;
  }, [activeTab, rankingHighlightSignature]);

  const handleRewardResult = () => {};
  const openRandomPicker = async () => {
    if (!currentClass?.id) return;
    await fetchStudents(currentClass.id);
    setShowRandomPicker(true);
  };
  const dashboardStats = [
    { label: '已领伙伴', value: petSummary.claimed, accentClassName: 'text-cyan-500', hint: '已经有专属宠物' },
    { label: '宠物蛋', value: petSummary.eggs, accentClassName: 'text-amber-500', hint: '正在等破壳' },
    { label: '已出生', value: hatchedCount, accentClassName: 'text-emerald-500', hint: '已经陪着上课' },
    { label: '已进化', value: evolvedCount, accentClassName: 'text-fuchsia-500', hint: '班级里的高光主角' }
  ];

  return (
    <div className="min-h-screen p-4 md:p-6">
      <header className="mx-auto mb-6 max-w-[1480px] text-center">
        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block">
          <BrandMark
            className="justify-center text-left"
            imageClassName="h-16 w-16 md:h-20 md:w-20"
            imageWrapperClassName="bg-white/92 ring-4 ring-white/30"
            title="乐享宠物"
            titleClassName="text-3xl font-black text-white md:text-4xl"
            titleStyle={{ textShadow: '3px 3px 0 #FF6B6B, 6px 6px 0 rgba(0,0,0,0.1)' }}
            subtitle="谁更认真，谁的宠物就会在这里更闪亮。"
            subtitleClassName="mt-2 max-w-xl text-sm text-white/85 md:text-base"
          />
        </motion.div>

        <div className="mt-5 flex justify-center">
          <ClassSelector />
        </div>
      </header>

      {!currentClass ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-20 text-center"
        >
          <div className="mb-4 text-8xl animate-bounce">🧭</div>
          <p className="text-2xl font-bold text-white drop-shadow">请先选择一个班级，开始展示课堂数据。</p>
        </motion.div>
      ) : loading ? (
        <div className="mt-20 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="inline-block text-8xl"
          >
            ⏳
          </motion.div>
          <p className="mt-4 text-2xl font-bold text-white">正在加载班级数据...</p>
        </div>
      ) : (
        <>
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-6 max-w-[1480px] rounded-[34px] border border-white/35 bg-white/14 p-3 shadow-[0_26px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl"
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_520px]">
                <div className="rounded-[28px] border border-white/60 bg-white/90 px-5 py-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-black text-white shadow-sm">
                      {currentClass.name}
                    </span>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white shadow-sm">
                      宠物大屏
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-black text-slate-800">先看谁的宠物最亮眼。</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    名字、状态、成长和主角卡都会放在最前面，一眼就能看懂。
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {dashboardStats.map((item) => (
                    <OverviewStatCard
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      accentClassName={item.accentClassName}
                      hint={item.hint}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={openRandomPicker}
                  data-testid="display-random-picker-open"
                  className="btn-game btn-secondary px-4 py-3 text-sm"
                >
                  🎯 点名
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowRewardWheel(true)}
                  className="btn-game btn-warning px-4 py-3 text-sm"
                >
                  🎁 抽奖励
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPunishmentWheel(true)}
                  className="btn-game btn-purple px-4 py-3 text-sm"
                >
                  😈 抽挑战
                </motion.button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pets')}
                  className="rounded-full bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                >
                  去看主角
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {DISPLAY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-pressed={activeTab === tab.key}
                  className={`rounded-full px-5 py-2.5 text-sm font-black transition-all ${
                    activeTab === tab.key
                      ? 'bg-white text-orange-500 shadow-lg'
                      : 'bg-white/18 text-white hover:bg-white/28'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.section>

          <>
            {activeTab === 'teams' && (
              <motion.div
                key="teams"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={TAB_PANE_TRANSITION}
                className="mx-auto max-w-[1480px]"
              >
                {sortedTeams.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="mb-4 text-6xl">🏁</div>
                    <p className="text-xl font-bold text-white">当前还没有战队，先去后台创建吧。</p>
                  </div>
                ) : (
                  <>
                    {sortedTeams.length >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card-game mb-6 bg-gradient-to-r from-orange-50 to-yellow-50"
                      >
                        <h3 className="mb-6 text-center text-2xl font-black text-slate-800">今日 PK 战况</h3>
                        <div className="flex items-center justify-center gap-8">
                          <div className="text-center">
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="mb-2 text-6xl"
                            >
                              🏆
                            </motion.div>
                            <div className="text-2xl font-bold" style={{ color: sortedTeams[0].color }}>
                              {sortedTeams[0].name}
                            </div>
                            <div className="text-5xl font-black text-yellow-500">
                              {formatScore(sortedTeams[0].score)}
                            </div>
                          </div>

                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-5xl font-black text-red-500"
                          >
                            VS
                          </motion.div>

                          <div className="text-center">
                            <div className="mb-2 text-6xl">🚀</div>
                            <div className="text-2xl font-bold" style={{ color: sortedTeams[1].color }}>
                              {sortedTeams[1].name}
                            </div>
                            <div className="text-5xl font-black text-slate-500">
                              {formatScore(sortedTeams[1].score)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 text-center text-slate-600">
                          {isLeadTie ? (
                            <span className="text-xl font-bold">双方暂时持平，继续冲刺。</span>
                          ) : (
                            <span className="text-xl">
                              当前领先 <span className="text-3xl font-black text-emerald-500">{formatScore(leadNum)}</span> 分
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}

                    <div className="grid gap-4">
                      {sortedTeams.map((team, index) => (
                        <TeamCard key={team.id} team={team} rank={index + 1} showMembers />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'students' && (
              <motion.div
                key="students"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={TAB_PANE_TRANSITION}
                className="mx-auto max-w-[1480px]"
              >
                {sortedStudents.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="mb-4 text-6xl">🧑</div>
                    <p className="text-xl font-bold text-white">当前班级还没有学生，先去后台添加吧。</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 rounded-[30px] border border-white/60 bg-white/86 px-5 py-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-black tracking-[0.18em] text-cyan-500">全班宠物卡片</div>
                          <h3 className="mt-2 text-2xl font-black text-slate-800">找找自己的宠物卡。</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            每张卡片只保留最重要的状态，点开再看完整成长档案。
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-cyan-100 px-3 py-2 text-xs font-black text-cyan-700 shadow-sm">
                            已领宠物 {petSummary.claimed}
                          </span>
                          <span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-700 shadow-sm">
                            蛋态 {petSummary.eggs}
                          </span>
                          <span className="rounded-full bg-fuchsia-100 px-3 py-2 text-xs font-black text-fuchsia-700 shadow-sm">
                            已进化 {evolvedCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('pets')}
                            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-sm"
                          >
                            去主角秀台
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {sortedStudents.map((student, index) => (
                        <StudentCard key={student.id} student={student} rank={index + 1} compact />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'pets' && (
              <motion.div
                key="pets"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={TAB_PANE_TRANSITION}
                className="mx-auto max-w-[1480px]"
              >
                <div className="mb-4 rounded-[30px] border border-white/60 bg-white/86 px-5 py-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-black tracking-[0.18em] text-violet-500">宠物聚焦</div>
                      <h3 className="mt-2 text-2xl font-black text-slate-800">先看今日主角，再看全班宠物卡。</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        这里只保留主角、排行和宠物卡，不再塞进多余说明。
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-100 px-3 py-2 text-xs font-black text-violet-700 shadow-sm">
                        已收藏 {petSummary.collectedPets}
                      </span>
                      <span className="rounded-full bg-sky-100 px-3 py-2 text-xs font-black text-sky-700 shadow-sm">
                        多宠物 {multiPetOwners}
                      </span>
                      <span className="rounded-full bg-fuchsia-100 px-3 py-2 text-xs font-black text-fuchsia-700 shadow-sm">
                        可进化 {petSummary.readyToEvolve}
                      </span>
                      <span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-700 shadow-sm">
                        可孵化 {petSummary.readyToHatch}
                      </span>
                    </div>
                  </div>

                  {collectionLeaderboard.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {collectionLeaderboard.map((entry) => (
                        <div
                          key={entry.student.id}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm"
                        >
                          <span>{entry.student.name}</span>
                          <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] text-violet-700">
                            收藏 {entry.collection.length}/{entry.petCapacity}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
                            培养力 {entry.journey.power_score}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {spotlightPet && (
                  <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_360px]">
                    <div className="card-game border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50">
                      <div className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-sm">
                        <span>✨</span>
                        今日主角
                      </div>
                      <div className="mt-5 grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-center">
                        <div className="relative mx-auto lg:mx-0">
                          <div className="absolute inset-4 rounded-full bg-amber-200/50 blur-3xl" aria-hidden="true" />
                          <div className="pet-hero-frame pet-hero-frame-active relative flex h-[240px] w-[240px] items-center justify-center rounded-[40px]">
                            <div className="absolute left-4 top-4 rounded-full bg-white/86 px-3 py-1 text-[11px] font-black text-amber-700 shadow-sm">
                              {spotlightPet.journey.stage_name}
                            </div>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/86 px-3 py-1 text-[11px] font-black text-slate-600 shadow-sm">
                              {spotlightPet.journey.status_label}
                            </div>
                            <PetArtwork
                              pet={spotlightPet.student.pet}
                              journey={spotlightPet.journey}
                              className="flex h-[196px] w-[196px] items-center justify-center"
                              imageClassName="h-[176px] w-[176px]"
                              fallbackClassName="text-7xl"
                              priority
                              idleMotion="float"
                            />
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-3xl font-black text-slate-800">{spotlightPet.student.name}</h3>
                            {spotlightPet.student.team_name && (
                              <span
                                className="rounded-full px-3 py-1 text-xs font-black text-white shadow-sm"
                                style={{ backgroundColor: spotlightPet.student.team_color || '#64748b' }}
                              >
                                {spotlightPet.student.team_name}
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-lg font-black text-slate-700">
                            {spotlightPet.journey.name}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            它现在冲在最前面，成长、照料和课堂积分都会实时变化。
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="pet-score-chip bg-amber-100 text-amber-700">
                              培养力 {spotlightPet.journey.power_score}
                            </span>
                            <span className="pet-score-chip bg-cyan-100 text-cyan-700">
                              {spotlightPet.journey.power_label}
                            </span>
                            <span className="pet-score-chip bg-violet-100 text-violet-700">
                              收藏 {spotlightPet.collection.length}/{spotlightPet.petCapacity}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-[24px] bg-white/90 px-4 py-4 shadow-sm">
                              <div className="text-[11px] font-black text-slate-400">成长</div>
                              <div className="mt-1 text-2xl font-black text-amber-600">{spotlightPet.journey.growth_value}</div>
                            </div>
                            <div className="rounded-[24px] bg-white/90 px-4 py-4 shadow-sm">
                              <div className="text-[11px] font-black text-slate-400">照料</div>
                              <div className="mt-1 text-2xl font-black text-emerald-600">{spotlightPet.journey.care_score}</div>
                            </div>
                            <div className="rounded-[24px] bg-white/90 px-4 py-4 shadow-sm">
                              <div className="text-[11px] font-black text-slate-400">课堂积分</div>
                              <div className="mt-1 text-2xl font-black text-cyan-600">{formatScore(spotlightPet.student.score)}</div>
                            </div>
                            <div className="rounded-[24px] bg-white/90 px-4 py-4 shadow-sm">
                              <div className="text-[11px] font-black text-slate-400">下一步</div>
                              <div className="mt-1 text-sm font-black text-slate-700">{spotlightPet.journey.next_target}</div>
                            </div>
                          </div>

                          <div className="mt-4 text-xs font-bold text-slate-500">
                            点下方宠物卡，可继续看完整成长档案。
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card-game self-start border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 xl:sticky xl:top-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black text-slate-800">培养力排行榜</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-500">顺位会跟着课堂表现和照料状态实时变化。</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-600 shadow-sm">
                          TOP {petLeaderboard.length}
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        {petLeaderboard.map((entry, index) => {
                          const tone = getPetPowerTone(entry.journey.power_score);

                          return (
                            <div key={entry.student.id} className="rounded-[22px] bg-white/85 px-3 py-3 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                                  #{index + 1}
                                </div>
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                                  <PetArtwork
                                    pet={entry.student.pet}
                                    journey={entry.journey}
                                    className="flex h-12 w-12 items-center justify-center"
                                    imageClassName="h-10 w-10"
                                    fallbackClassName="text-2xl"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-black text-slate-800">{entry.student.name}</div>
                                  <div className="mt-1 truncate text-xs text-slate-500">
                                    {entry.journey.name} · {entry.journey.stage_name}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`pet-score-chip ${tone.bg} ${tone.text}`}>培养力 {entry.journey.power_score}</div>
                                  <div className="mt-2 text-[11px] font-bold text-slate-400">{entry.journey.power_label}</div>
                                  <div className="mt-1 text-[11px] font-bold text-violet-500">
                                    收藏 {entry.collection.length}/{entry.petCapacity}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sortedStudents.map((student, index) => (
                    <StudentCard key={student.id} student={student} rank={index + 1} compact />
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'rating' && (
              <motion.div
                key="rating"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={TAB_PANE_TRANSITION}
              >
                <RatingLeaderboard />
              </motion.div>
            )}
          </>

          {activeSession && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowRatingModal(true)}
              className="fixed bottom-8 right-8 flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-cyan-500 text-white shadow-2xl"
              style={{ zIndex: 9999, boxShadow: '0 10px 30px rgba(34, 211, 238, 0.4)' }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-4xl"
              >
                🌟
              </motion.div>
              <span className="text-sm font-black">评分</span>
            </motion.button>
          )}
        </>
      )}

      <AnimatePresence>
        {showRewardWheel && (
          <LotteryWheel
            items={rewards}
            type="reward"
            onClose={() => setShowRewardWheel(false)}
            onResult={handleRewardResult}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPunishmentWheel && (
          <LotteryWheel
            items={punishments}
            type="punishment"
            onClose={() => setShowPunishmentWheel(false)}
            onStartPunishment={(punishment) => {
              setShowPunishmentWheel(false);
              setSelectedPunishment(punishment);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPunishment && (
          <PunishmentDisplay punishment={selectedPunishment} onClose={() => setSelectedPunishment(null)} />
        )}
      </AnimatePresence>

      <RandomStudentPickerModal
        open={showRandomPicker}
        onClose={() => setShowRandomPicker(false)}
        students={students}
        currentClassName={currentClass?.name || ''}
        onRefresh={() => (currentClass?.id ? fetchStudents(currentClass.id) : Promise.resolve(students))}
      />

      <AnimatePresence>
        {showRatingModal && activeSession && (
          <RatingModal session={activeSession} onClose={() => setShowRatingModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
