import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import ClassSelector from '../components/ClassSelector';
import TeamCard from '../components/TeamCard';
import StudentCard from '../components/StudentCard';
import PetArtwork from '../components/PetArtwork';
import LotteryWheel from '../components/LotteryWheel';
import PunishmentDisplay from '../components/PunishmentDisplay';
import RatingModal from '../components/RatingModal';
import RatingLeaderboard from '../components/RatingLeaderboard';
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

export default function DisplayPage() {
  const store = useStore();
  const { currentClass, teams, students, rewards, punishments, loading } = store;
  const [activeTab, setActiveTab] = useState('pets');
  const [showRewardWheel, setShowRewardWheel] = useState(false);
  const [showPunishmentWheel, setShowPunishmentWheel] = useState(false);
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

  return (
    <div className="min-h-screen p-6">
      <header className="mb-8 text-center">
        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block">
          <h1
            className="mb-2 text-5xl font-black text-white drop-shadow-lg"
            style={{ textShadow: '3px 3px 0 #FF6B6B, 6px 6px 0 rgba(0,0,0,0.1)' }}
          >
            乐启享班级大作战
          </h1>
          <p className="text-lg text-white/80">团队 PK、个人成长、宠物养成和展示评分都在同一个大屏里。</p>
        </motion.div>

        <div className="mt-6 flex justify-center">
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
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-6 max-w-5xl"
          >
            <div className="card-game bg-gradient-to-r from-cyan-50 via-white to-violet-50">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2 text-sm font-black text-white shadow-sm">
                    <span>🐾</span>
                    {currentClass.name} 宠物星球入口
                  </div>
                  <h3 className="mt-4 text-2xl font-black text-slate-800">学生没领宠物时显示宠物蛋，养成后会一路孵化、升级、进化</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    这里直接对应当前班级。老师在后台绑定宠物后，学生卡片会同步显示宠物状态；没有宠物的学生默认展示宠物蛋，达到条件后再进入正式养成。
                  </p>
                </div>

                <div className="grid min-w-[300px] flex-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                    <div className="text-xs font-bold text-slate-400">已领宠物</div>
                    <div className="mt-1 text-3xl font-black text-cyan-500">{petSummary.claimed}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                    <div className="text-xs font-bold text-slate-400">宠物蛋</div>
                    <div className="mt-1 text-3xl font-black text-amber-500">{petSummary.eggs}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                    <div className="text-xs font-bold text-slate-400">已孵化</div>
                    <div className="mt-1 text-3xl font-black text-emerald-500">{hatchedCount}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                    <div className="text-xs font-bold text-slate-400">已进化</div>
                    <div className="mt-1 text-3xl font-black text-fuchsia-500">{evolvedCount}</div>
                  </div>
                </div>

                <button type="button" onClick={() => setActiveTab('pets')} className="btn-game btn-purple text-sm">
                  进入宠物星球
                </button>
              </div>
            </div>
          </motion.div>

          <div className="mb-8 flex justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRewardWheel(true)}
              className="btn-game btn-warning px-8 text-xl"
            >
              🎁 抽奖励
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPunishmentWheel(true)}
              className="btn-game btn-purple px-8 text-xl"
            >
              😈 抽惩罚
            </motion.button>
          </div>

          <div className="mb-6 flex justify-center gap-2 flex-wrap">
            {[
              { key: 'teams', label: '⚔️ 战队 PK' },
              { key: 'students', label: '🧑 个人榜' },
              { key: 'pets', label: '🐾 宠物星球' },
              { key: 'rating', label: '🌟 展示评分' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={activeTab === tab.key}
                className={`rounded-full px-8 py-3 text-lg font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-orange-500 shadow-lg'
                    : 'bg-white/30 text-white hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <>
            {activeTab === 'teams' && (
              <motion.div
                key="teams"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={TAB_PANE_TRANSITION}
                className="mx-auto max-w-5xl"
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
                className="mx-auto max-w-5xl"
              >
                {sortedStudents.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="mb-4 text-6xl">🧑</div>
                    <p className="text-xl font-bold text-white">当前班级还没有学生，先去后台添加吧。</p>
                  </div>
                ) : (
                  <>
                    <div className="card-game mb-6 bg-gradient-to-r from-cyan-50 via-white to-emerald-50">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2 text-sm font-black text-white shadow-sm">
                            <span>🐾</span>
                            班级宠物入口
                          </div>
                          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                            这里会同步展示每位学生的宠物状态。没有领取宠物的学生会显示宠物蛋，已经孵化和进化的学生会直接在卡片右侧展示。学生卡片现在支持直接点击，查看完整宠物档案和未来形态预览。
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab('pets')}
                          className="btn-game btn-orange text-sm"
                        >
                          进入宠物星球
                        </button>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                          <div className="text-xs font-bold text-slate-400">已领宠物</div>
                          <div className="mt-1 text-3xl font-black text-cyan-500">{petSummary.claimed}</div>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                          <div className="text-xs font-bold text-slate-400">蛋态学生</div>
                          <div className="mt-1 text-3xl font-black text-amber-500">{petSummary.eggs}</div>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                          <div className="text-xs font-bold text-slate-400">已进化</div>
                          <div className="mt-1 text-3xl font-black text-fuchsia-500">{evolvedCount}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
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
                className="mx-auto max-w-5xl"
              >
                <div className="card-game mb-6 bg-gradient-to-r from-violet-50 via-white to-cyan-50">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <div className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-black text-white shadow-sm">
                        <span>🐾</span>
                        宠物星球
                      </div>
                      <h3 className="mt-4 text-2xl font-black text-slate-800">班级宠物成长总览</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        课堂积分会转化成宠物成长值，照料行为会影响宠物状态。没有领取宠物的学生会保持宠物蛋，满足条件后可孵化，再进一步成长并进化。
                      </p>
                    </div>

                    <div className="grid min-w-[280px] flex-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                        <div className="text-xs font-bold text-slate-400">已收藏宠物</div>
                        <div className="mt-1 text-3xl font-black text-violet-500">{petSummary.collectedPets}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                        <div className="text-xs font-bold text-slate-400">多宠物学员</div>
                        <div className="mt-1 text-3xl font-black text-sky-500">{multiPetOwners}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                        <div className="text-xs font-bold text-slate-400">已孵化</div>
                        <div className="mt-1 text-3xl font-black text-emerald-500">{hatchedCount}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                        <div className="text-xs font-bold text-slate-400">可进化</div>
                        <div className="mt-1 text-3xl font-black text-fuchsia-500">{petSummary.readyToEvolve}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                        <div className="text-xs font-bold text-slate-400">可孵化</div>
                        <div className="mt-1 text-3xl font-black text-amber-500">{petSummary.readyToHatch}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                        <div className="text-xs font-bold text-slate-400">覆盖率</div>
                        <div className="mt-1 text-3xl font-black text-cyan-500">{petSummary.progress}%</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-white/80 px-4 py-4 shadow-sm">
                      <div className="text-sm font-black text-slate-700">1. 领取宠物蛋</div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">没领宠物的学生会显示宠物蛋，等老师在后台绑定图鉴宠物。</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 px-4 py-4 shadow-sm">
                      <div className="text-sm font-black text-slate-700">2. 孵化与照料</div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">课堂积分和照料次数会推进孵化；喂养、互动、清洁会影响照料评分。</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 px-4 py-4 shadow-sm">
                      <div className="text-sm font-black text-slate-700">3. 成长与进化</div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">高成长值加稳定状态可以触发进化，形成班级展示亮点。</p>
                    </div>
                  </div>

                  {collectionLeaderboard.length > 0 && (
                    <div className="mt-5 rounded-2xl bg-white/80 px-4 py-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-700">多宠物收藏榜</div>
                          <div className="mt-1 text-xs font-bold text-slate-500">
                            满级后继续领取新宠物的学员，会在这里形成更强的展示感。
                          </div>
                        </div>
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                          {multiPetOwners} 位已解锁多宠物
                        </span>
                      </div>

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
                    </div>
                  )}
                </div>

                {spotlightPet && (
                  <div className="mb-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="card-game border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50">
                      <div className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-sm">
                        <span>✨</span>
                        班级宠物聚光灯
                      </div>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-5">
                        <div className="max-w-md">
                          <h3 className="text-3xl font-black text-slate-800">{spotlightPet.student.name}</h3>
                          <p className="mt-2 text-sm font-bold text-slate-500">
                            {spotlightPet.journey.name} · {spotlightPet.journey.stage_name}
                          </p>
                          <p className="mt-4 text-sm leading-7 text-slate-600">当前全班培养力最高，课堂积分、照料稳定度和阶段奖励会一起影响它能否继续站在聚光灯下。</p>
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
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <div className="rounded-2xl bg-white/90 px-3 py-3 text-center shadow-sm">
                              <div className="text-[11px] font-black text-slate-400">成长</div>
                              <div className="mt-1 text-lg font-black text-amber-600">{spotlightPet.journey.growth_value}</div>
                            </div>
                            <div className="rounded-2xl bg-white/90 px-3 py-3 text-center shadow-sm">
                              <div className="text-[11px] font-black text-slate-400">照料</div>
                              <div className="mt-1 text-lg font-black text-emerald-600">{spotlightPet.journey.care_score}</div>
                            </div>
                            <div className="rounded-2xl bg-white/90 px-3 py-3 text-center shadow-sm">
                              <div className="text-[11px] font-black text-slate-400">状态</div>
                              <div className="mt-1 text-sm font-black text-slate-700">{spotlightPet.journey.status_label}</div>
                            </div>
                          </div>
                          <div className="mt-4 text-xs font-bold text-slate-500">
                            下方卡片点开后可以看完整成长档案。
                          </div>
                        </div>

                        <div className="pet-hero-frame flex h-[220px] w-[220px] items-center justify-center rounded-[36px]">
                          <PetArtwork
                            pet={spotlightPet.student.pet}
                            journey={spotlightPet.journey}
                            className="flex h-[190px] w-[190px] items-center justify-center"
                            imageClassName="h-[170px] w-[170px]"
                            fallbackClassName="text-7xl"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="card-game border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50">
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
                            <div key={entry.student.id} className="rounded-[22px] bg-white/85 px-4 py-4 shadow-sm">
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

                <div className="grid gap-4">
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

      <AnimatePresence>
        {showRatingModal && activeSession && (
          <RatingModal session={activeSession} onClose={() => setShowRatingModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
