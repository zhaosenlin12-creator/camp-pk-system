import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import ClassSelector from '../components/ClassSelector';
import TeamCard from '../components/TeamCard';
import StudentCard from '../components/StudentCard';
import LotteryWheel from '../components/LotteryWheel';
import PunishmentDisplay from '../components/PunishmentDisplay';
import Footer from '../components/Footer';

export default function DisplayPage() {
  const { currentClass, teams, students, rewards, punishments, loading } = useStore();
  const [activeTab, setActiveTab] = useState('teams');
  const [showRewardWheel, setShowRewardWheel] = useState(false);
  const [showPunishmentWheel, setShowPunishmentWheel] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState(null);

  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const sortedStudents = [...students].sort((a, b) => b.score - a.score);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentClass) {
        useStore.getState().fetchTeams(currentClass.id);
        useStore.getState().fetchStudents(currentClass.id);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentClass]);

  // 惩罚抽奖结果处理 - 不自动跳转，等用户点击
  const handlePunishmentResult = (punishment) => {
    // 保存结果，等用户点击"开始惩罚表演"按钮
    // 不做任何自动跳转
  };

  // 奖励抽奖结果处理
  const handleRewardResult = (reward) => {
    // 奖励只需要展示结果，不需要额外页面
    console.log('获得奖励:', reward);
  };

  return (
    <div className="min-h-screen p-6">
      {/* 头部标题 */}
      <header className="text-center mb-8">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-block"
        >
          <h1 className="text-5xl font-black text-white drop-shadow-lg mb-2"
              style={{ textShadow: '3px 3px 0 #FF6B6B, 6px 6px 0 rgba(0,0,0,0.1)' }}>
            🏆 创赛营大作战 🎮
          </h1>
          <p className="text-white/80 text-lg">谁是今日最强王者？</p>
        </motion.div>
        
        <div className="flex justify-center mt-6">
          <ClassSelector />
        </div>
      </header>

      {!currentClass ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mt-20"
        >
          <div className="text-8xl mb-4 animate-bounce">👆</div>
          <p className="text-2xl text-white font-bold drop-shadow">请先选择一个班级开始冒险！</p>
        </motion.div>
      ) : loading ? (
        <div className="text-center mt-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="text-8xl inline-block"
          >
            ⚡
          </motion.div>
          <p className="text-2xl text-white font-bold mt-4">加载中...</p>
        </div>
      ) : (
        <>
          {/* 功能按钮 */}
          <div className="flex justify-center gap-4 mb-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRewardWheel(true)}
              className="btn-game btn-warning text-xl px-8"
            >
              🎁 抽奖励
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPunishmentWheel(true)}
              className="btn-game btn-purple text-xl px-8"
            >
              😈 抽惩罚
            </motion.button>
          </div>

          {/* 标签切换 */}
          <div className="flex justify-center gap-2 mb-6">
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-8 py-3 rounded-full font-bold text-lg transition-all ${
                activeTab === 'teams'
                  ? 'bg-white text-orange-500 shadow-lg'
                  : 'bg-white/30 text-white hover:bg-white/50'
              }`}
            >
              ⚔️ 战队PK
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-8 py-3 rounded-full font-bold text-lg transition-all ${
                activeTab === 'students'
                  ? 'bg-white text-orange-500 shadow-lg'
                  : 'bg-white/30 text-white hover:bg-white/50'
              }`}
            >
              👤 个人榜
            </button>
          </div>

          {/* 内容区域 */}
          <AnimatePresence mode="wait">
            {activeTab === 'teams' ? (
              <motion.div
                key="teams"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="max-w-4xl mx-auto"
              >
                {sortedTeams.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-6xl mb-4">🏗️</div>
                    <p className="text-xl text-white font-bold">还没有战队，去管理后台创建吧！</p>
                  </div>
                ) : (
                  <>
                    {/* 战队PK对比 */}
                    {sortedTeams.length >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card-game mb-6 bg-gradient-to-r from-orange-50 to-yellow-50"
                      >
                        <h3 className="text-2xl font-black text-center text-gray-800 mb-6">
                          ⚔️ 今日PK战况 ⚔️
                        </h3>
                        <div className="flex items-center justify-center gap-8">
                          <div className="text-center">
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="text-6xl mb-2"
                            >
                              👑
                            </motion.div>
                            <div className="text-2xl font-bold" style={{ color: sortedTeams[0].color }}>
                              {sortedTeams[0].name}
                            </div>
                            <div className="text-5xl font-black text-yellow-500">
                              {sortedTeams[0].score}
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
                            <div className="text-6xl mb-2">🥈</div>
                            <div className="text-2xl font-bold" style={{ color: sortedTeams[1].color }}>
                              {sortedTeams[1].name}
                            </div>
                            <div className="text-5xl font-black text-gray-500">
                              {sortedTeams[1].score}
                            </div>
                          </div>
                        </div>

                        <div className="text-center mt-4 text-gray-600">
                          {sortedTeams[0].score === sortedTeams[1].score ? (
                            <span className="text-xl font-bold">🔥 势均力敌！继续加油！</span>
                          ) : (
                            <span className="text-xl">
                              领先 <span className="text-3xl font-black text-green-500">
                                {sortedTeams[0].score - sortedTeams[1].score}
                              </span> 分
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}

                    <div className="grid gap-4">
                      {sortedTeams.map((team, index) => (
                        <TeamCard key={team.id} team={team} rank={index + 1} showMembers={true} />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="students"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto"
              >
                {sortedStudents.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-xl text-white font-bold">还没有学员，去管理后台添加吧！</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {sortedStudents.map((student, index) => (
                      <StudentCard key={student.id} student={student} rank={index + 1} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* 奖励抽奖 - 全屏 */}
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

      {/* 惩罚抽奖 - 全屏 */}
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

      {/* 惩罚展示 - 全屏 */}
      <AnimatePresence>
        {selectedPunishment && (
          <PunishmentDisplay 
            punishment={selectedPunishment} 
            onClose={() => setSelectedPunishment(null)} 
          />
        )}
      </AnimatePresence>

      {/* 备案信息 */}
      <Footer className="mt-8" />
    </div>
  );
}
