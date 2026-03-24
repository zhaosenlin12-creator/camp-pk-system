import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { soundManager } from '../utils/sounds';
import { TEAM_COLORS } from '../utils/ranks';
import { formatScore } from '../utils/score';

export default function TeamManager() {
  const { currentClass, teams, createTeam, deleteTeam, students, updateStudent } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0].value);

  const handleCreate = async () => {
    if (!newTeamName.trim() || !currentClass) return;
    await createTeam(newTeamName.trim(), currentClass.id, newTeamColor);
    soundManager.playScoreUp();
    setNewTeamName('');
    setShowCreate(false);
  };

  const handleDelete = async (teamId) => {
    if (confirm('确定要删除这个战队吗？成员将变为无队伍状态。')) {
      await deleteTeam(teamId);
    }
  };

  const handleMoveStudent = async (studentId, newTeamId) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      await updateStudent(studentId, {
        name: student.name,
        team_id: newTeamId,
        avatar: student.avatar,
      });
      soundManager.playClick();
    }
  };

  const unassignedStudents = students.filter(s => !s.team_id);

  return (
    <div className="space-y-6">
      <div className="card-game">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">⚔️ 战队管理</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(!showCreate)}
            className="btn-game btn-success text-sm py-2"
          >
            {showCreate ? '取消' : '➕ 新建战队'}
          </motion.button>
        </div>

        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-4 bg-gray-50 rounded-xl"
          >
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="战队名称"
                className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-orange-400 outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={!newTeamName.trim()}
                className="px-6 py-2 rounded-xl font-bold text-white bg-orange-500 disabled:opacity-50"
              >
                创建
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {TEAM_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setNewTeamColor(color.value)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    newTeamColor === color.value ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* 战队列表 */}
        <div className="space-y-4">
          {teams.map((team) => {
            const teamMembers = students.filter(s => s.team_id === team.id);
            return (
              <div
                key={team.id}
                className="p-4 rounded-xl border-2"
                style={{ borderColor: team.color, backgroundColor: `${team.color}10` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                    <span className="font-bold text-lg">{team.name}</span>
                    <span className="text-sm text-gray-500">({teamMembers.length}人)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xl" style={{ color: team.color }}>
                      {formatScore(team.score)}分
                    </span>
                    <button
                      onClick={() => handleDelete(team.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm shadow-sm"
                    >
                      <span>{member.avatar}</span>
                      <span>{member.name}</span>
                      <button
                        onClick={() => handleMoveStudent(member.id, null)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                        title="移出战队"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  {unassignedStudents.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleMoveStudent(parseInt(e.target.value), team.id);
                          e.target.value = '';
                        }
                      }}
                      className="px-3 py-1 rounded-full text-sm bg-white border border-dashed border-gray-300 cursor-pointer"
                    >
                      <option value="">+ 添加成员</option>
                      {unassignedStudents.map((s) => (
                        <option key={s.id} value={s.id}>{s.avatar} {s.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}

          {teams.length === 0 && (
            <p className="text-center text-gray-400 py-8">还没有战队，点击上方按钮创建</p>
          )}
        </div>

        {/* 未分配学员 */}
        {unassignedStudents.length > 0 && (
          <div className="mt-4 p-4 bg-gray-100 rounded-xl">
            <h4 className="font-bold text-gray-600 mb-2">未分配战队的学员</h4>
            <div className="flex flex-wrap gap-2">
              {unassignedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-sm"
                >
                  <span>{student.avatar}</span>
                  <span>{student.name}</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleMoveStudent(student.id, parseInt(e.target.value));
                    }}
                    className="text-sm bg-transparent border-none cursor-pointer text-orange-500"
                  >
                    <option value="">分配到...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
