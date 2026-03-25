import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, ADMIN_AUTH_EXPIRED_EVENT } from '../store/useStore';
import BrandMark from '../components/BrandMark';
import ClassSelector from '../components/ClassSelector';
import TeamManager from '../components/TeamManager';
import StudentManager from '../components/StudentManager';
import PetCenter from '../components/PetCenter';
import LotteryWheel from '../components/LotteryWheel';
import PunishmentDisplay from '../components/PunishmentDisplay';
import LotteryHistory from '../components/LotteryHistory';
import RatingManager from '../components/RatingManager';
import ReportGenerator from '../components/report/ReportGenerator';
import CertificateManager from '../components/report/CertificateManager';
import { soundManager } from '../utils/sounds';
import { formatScore } from '../utils/score';

const TAB_PANE_TRANSITION = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1]
};

function PinVerify({ onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const { verifyAdmin } = useStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await verifyAdmin(pin);
    if (success) {
      soundManager.playVictory();
      onSuccess?.();
    } else {
      setError(true);
      soundManager.playScoreDown();
      setTimeout(() => setError(false), 1000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card-game max-w-sm w-full text-center"
      >
        <div className="mb-6 flex justify-center">
          <BrandMark
            className="justify-center text-left"
            imageClassName="h-16 w-16"
            title="乐享宠物"
            subtitle="老师专属入口"
            titleClassName="text-3xl font-black text-slate-800"
            subtitleClassName="mt-1 text-sm text-slate-500"
          />
        </div>
        
        <form onSubmit={handleSubmit}>
          <motion.input
            animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="请输入密码"
            className={`w-full px-6 py-4 text-2xl text-center rounded-xl border-4 outline-none ${
              error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-orange-400'
            }`}
            maxLength={6}
          />
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full mt-4 btn-game btn-orange text-xl"
          >
            进入管理
          </motion.button>
        </form>

        <p className="mt-4 text-gray-400 text-sm">请输入管理密码</p>
      </motion.div>
    </div>
  );
}

export default function AdminPage() {
  const {
    isAdmin,
    currentClass,
    rewards,
    punishments,
    teams,
    students,
    fetchTeams,
    fetchStudents,
    addLotteryLog,
    restoreAdminSession,
    logoutAdmin
  } = useStore();
  const [verified, setVerified] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const [showRewardWheel, setShowRewardWheel] = useState(false);
  const [showPunishmentWheel, setShowPunishmentWheel] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [lotteryTargetType, setLotteryTargetType] = useState('team'); // 'team' 或 'student'
  const [selectedTeamForLottery, setSelectedTeamForLottery] = useState(null);
  const [selectedStudentForLottery, setSelectedStudentForLottery] = useState(null);

  useEffect(() => {
    let mounted = true;

    restoreAdminSession().finally(() => {
      if (mounted) {
        setAuthReady(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [restoreAdminSession]);

  useEffect(() => {
    if (isAdmin) setVerified(true);
    if (!isAdmin && authReady) setVerified(false);
  }, [isAdmin, authReady]);

  useEffect(() => {
    const handleAuthExpired = () => {
      logoutAdmin();
      setVerified(false);
      setAuthReady(true);
    };

    window.addEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [logoutAdmin]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentClass && !document.hidden) {
        fetchTeams(currentClass.id);
        fetchStudents(currentClass.id);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [currentClass, fetchTeams, fetchStudents]);

  const toggleSound = () => {
    const enabled = soundManager.toggle();
    setSoundEnabled(enabled);
  };

  const handlePunishmentResult = (punishment) => {
    // 不自动跳转，等用户点击
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-game max-w-sm w-full text-center"
        >
          <div className="text-5xl mb-4">馃敡</div>
          <p className="text-lg font-bold text-gray-700">姝ｅ湪楠岃瘉鑰佸笀韬唤...</p>
        </motion.div>
      </div>
    );
  }

  if (!verified) {
    return <PinVerify onSuccess={() => setVerified(true)} />;
  }

  const sortedTeams = [...teams].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const losingTeam = sortedTeams.length >= 2 ? sortedTeams[sortedTeams.length - 1] : null;
  const isPetWorkspace = activeTab === 'pets';

  return (
    <div className="min-h-screen p-6">
      {/* 头部 */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="min-w-0"
          >
            <BrandMark
              title="乐享宠物 · 管理台"
              subtitle={currentClass ? `${currentClass.name} 正在管理中` : '老师专属入口'}
              imageClassName="h-12 w-12"
              imageWrapperClassName="bg-white/92"
              titleClassName="text-2xl font-black text-white md:text-3xl"
              subtitleClassName="mt-1 text-sm text-white/80"
            />
          </motion.div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSound}
              className="px-4 py-2 rounded-xl bg-white/20 text-white hover:bg-white/30 font-bold"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-xl bg-white/20 text-white hover:bg-white/30 font-bold"
            >
              📺 展示页
            </a>
          </div>
        </div>

        <ClassSelector showCreate={true} />
      </header>

      {!currentClass ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-10"
        >
          <div className="text-6xl mb-4 animate-bounce">👆</div>
          <p className="text-xl text-white font-bold">请先选择或创建一个班级</p>
        </motion.div>
      ) : (
        <div className={`grid grid-cols-1 gap-6 ${isPetWorkspace ? '' : 'lg:grid-cols-3'}`}>
          {/* 左侧管理区 */}
          <div className={isPetWorkspace ? 'space-y-6' : 'lg:col-span-2 space-y-6'}>
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                aria-pressed={activeTab === 'students'}
                className={`px-6 py-2 rounded-full font-bold transition-all ${
                  activeTab === 'students'
                    ? 'bg-white text-cyan-600 shadow-lg'
                    : 'bg-white/30 text-white hover:bg-white/50'
                }`}
              >
                👥 学员管理
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('teams')}
                aria-pressed={activeTab === 'teams'}
                className={`px-6 py-2 rounded-full font-bold transition-all ${
                  activeTab === 'teams'
                    ? 'bg-white text-cyan-600 shadow-lg'
                    : 'bg-white/30 text-white hover:bg-white/50'
                }`}
              >
                ⚔️ 战队管理
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pets')}
                aria-pressed={activeTab === 'pets'}
                data-testid="admin-tab-pets"
                className={`px-6 py-2 rounded-full font-bold transition-all ${
                  activeTab === 'pets'
                    ? 'bg-white text-cyan-600 shadow-lg'
                    : 'bg-white/30 text-white hover:bg-white/50'
                }`}
              >
                🐾 宠物中心
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rating')}
                aria-pressed={activeTab === 'rating'}
                className={`px-6 py-2 rounded-full font-bold transition-all ${
                  activeTab === 'rating'
                    ? 'bg-white text-cyan-600 shadow-lg'
                    : 'bg-white/30 text-white hover:bg-white/50'
                }`}
              >
                🎯 展示评分
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                aria-pressed={activeTab === 'report'}
                className={`px-6 py-2 rounded-full font-bold transition-all ${
                  activeTab === 'report'
                    ? 'bg-white text-cyan-600 shadow-lg'
                    : 'bg-white/30 text-white hover:bg-white/50'
                }`}
              >
                📄 结营报告
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('certificate')}
                aria-pressed={activeTab === 'certificate'}
                className={`px-6 py-2 rounded-full font-bold transition-all ${
                  activeTab === 'certificate'
                    ? 'bg-white text-cyan-600 shadow-lg'
                    : 'bg-white/30 text-white hover:bg-white/50'
                }`}
              >
                🏅 奖状导出
              </button>
            </div>

            <>
              {activeTab === 'students' && (
                <motion.div
                  key="students"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={TAB_PANE_TRANSITION}
                >
                  <StudentManager />
                </motion.div>
              )}
              {activeTab === 'teams' && (
                <motion.div
                  key="teams"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={TAB_PANE_TRANSITION}
                >
                  <TeamManager />
                </motion.div>
              )}
              {activeTab === 'pets' && (
                <motion.div
                  key="pets"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={TAB_PANE_TRANSITION}
                >
                  <PetCenter />
                </motion.div>
              )}
              {activeTab === 'rating' && (
                <motion.div
                  key="rating"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={TAB_PANE_TRANSITION}
                >
                  <RatingManager />
                </motion.div>
              )}
              {activeTab === 'report' && (
                <motion.div
                  key="report"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={TAB_PANE_TRANSITION}
                >
                  <ReportGenerator />
                </motion.div>
              )}
              {activeTab === 'certificate' && (
                <motion.div
                  key="certificate"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={TAB_PANE_TRANSITION}
                >
                  <CertificateManager />
                </motion.div>
              )}
            </>
          </div>

          {/* 右侧快捷操作 */}
          {!isPetWorkspace && (
          <div className="space-y-4">
            {/* 战队积分 */}
            <div className="card-game">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📊 战队积分</h3>
              <div className="space-y-3">
                {sortedTeams.map((team, index) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ backgroundColor: `${team.color}20` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <span className="font-bold" style={{ color: team.color }}>
                        {team.name}
                      </span>
                    </div>
                    <span className="text-2xl font-black" style={{ color: team.color }}>
                      {formatScore(team.score)}
                    </span>
                  </div>
                ))}
                {sortedTeams.length === 0 && (
                  <p className="text-gray-400 text-center py-4">暂无战队</p>
                )}
              </div>
            </div>

            {/* 奖惩按钮 */}
            <div className="card-game">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">🎰 奖惩抽奖</h3>
                <button
                  onClick={() => setShowHistory(true)}
                  className="text-sm text-orange-500 hover:text-orange-600 font-medium"
                >
                  📋 记录
                </button>
              </div>
              
              {/* 抽奖对象类型选择 */}
              <div className="mb-3">
                <label className="text-sm text-gray-600 mb-1 block">抽奖对象：</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setLotteryTargetType('team');
                      setSelectedStudentForLottery(null);
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      lotteryTargetType === 'team'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ⚔️ 战队
                  </button>
                  <button
                    onClick={() => {
                      setLotteryTargetType('student');
                      setSelectedTeamForLottery(null);
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      lotteryTargetType === 'student'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    👤 学员
                  </button>
                </div>
              </div>
              
              {/* 战队/学员选择 */}
              <div className="mb-3">
                <label className="text-sm text-gray-600 mb-1 block">
                  {lotteryTargetType === 'team' ? '选择战队：' : '选择学员：'}
                </label>
                {lotteryTargetType === 'team' ? (
                  <select
                    value={selectedTeamForLottery?.id || ''}
                    onChange={e => {
                      const team = teams.find(t => t.id === parseInt(e.target.value));
                      setSelectedTeamForLottery(team || null);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  >
                    <option value="">-- 请选择战队 --</option>
                    {sortedTeams.map(team => (
                      <option key={team.id} value={team.id}>{team.name} ({formatScore(team.score)}分)</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedStudentForLottery?.id || ''}
                    onChange={e => {
                      const student = students.find(s => s.id === parseInt(e.target.value));
                      setSelectedStudentForLottery(student || null);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  >
                    <option value="">-- 请选择学员 --</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} {student.team_name ? `(${student.team_name})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRewardWheel(true)}
                  disabled={lotteryTargetType === 'team' ? !selectedTeamForLottery : !selectedStudentForLottery}
                  className={`w-full btn-game btn-warning ${
                    (lotteryTargetType === 'team' ? !selectedTeamForLottery : !selectedStudentForLottery) 
                      ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  🎁 抽取奖励
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowPunishmentWheel(true)}
                  disabled={lotteryTargetType === 'team' ? !selectedTeamForLottery : !selectedStudentForLottery}
                  className={`w-full btn-game btn-purple ${
                    (lotteryTargetType === 'team' ? !selectedTeamForLottery : !selectedStudentForLottery) 
                      ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  😈 抽取惩罚
                </motion.button>
              </div>

              {((lotteryTargetType === 'team' && !selectedTeamForLottery) || 
                (lotteryTargetType === 'student' && !selectedStudentForLottery)) && 
                (sortedTeams.length > 0 || students.length > 0) && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  请先选择{lotteryTargetType === 'team' ? '战队' : '学员'}再抽奖
                </p>
              )}

              {losingTeam && sortedTeams.length >= 2 && (
                <div className="mt-4 p-3 bg-red-50 rounded-xl border-2 border-red-200">
                  <div className="text-sm text-red-600 font-bold mb-1">⚠️ 当前落后战队</div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: losingTeam.color }} className="font-bold">
                      {losingTeam.name}
                    </span>
                    <span className="text-red-500 font-bold">{formatScore(losingTeam.score)}分</span>
                  </div>
                </div>
              )}
            </div>

            {/* 提示 */}
            <div className="card-game bg-gradient-to-br from-yellow-50 to-orange-50">
              <h3 className="text-lg font-bold text-gray-800 mb-3">💡 操作提示</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• 点击学员的 <span className="font-bold text-green-600">±</span> 按钮修改积分</li>
                <li>• 学员积分会自动同步到战队</li>
                <li>• 每天结束时给落后战队抽惩罚</li>
                <li>• 展示页面会自动刷新数据</li>
              </ul>
            </div>
          </div>
          )}
        </div>
      )}

      {/* 弹窗 */}
      <AnimatePresence>
        {showRewardWheel && (
          <LotteryWheel 
            items={rewards} 
            type="reward" 
            onClose={() => setShowRewardWheel(false)}
            onResult={(reward) => {
              if (currentClass) {
                const targetName = lotteryTargetType === 'team' 
                  ? selectedTeamForLottery?.name 
                  : selectedStudentForLottery?.name;
                const targetId = lotteryTargetType === 'team'
                  ? selectedTeamForLottery?.id
                  : selectedStudentForLottery?.id;
                if (targetName) {
                  addLotteryLog(
                    currentClass.id,
                    targetId,
                    `${lotteryTargetType === 'student' ? '👤 ' : ''}${targetName}`,
                    'reward',
                    reward.name,
                    reward.icon
                  );
                }
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPunishmentWheel && (
          <LotteryWheel
            items={punishments}
            type="punishment"
            onClose={() => setShowPunishmentWheel(false)}
            onResult={(punishment) => {
              if (currentClass) {
                const targetName = lotteryTargetType === 'team' 
                  ? selectedTeamForLottery?.name 
                  : selectedStudentForLottery?.name;
                const targetId = lotteryTargetType === 'team'
                  ? selectedTeamForLottery?.id
                  : selectedStudentForLottery?.id;
                if (targetName) {
                  addLotteryLog(
                    currentClass.id,
                    targetId,
                    `${lotteryTargetType === 'student' ? '👤 ' : ''}${targetName}`,
                    'punishment',
                    punishment.name,
                    punishment.icon
                  );
                }
              }
            }}
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
        {showHistory && (
          <LotteryHistory onClose={() => setShowHistory(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
