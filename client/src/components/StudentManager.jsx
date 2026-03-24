import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { soundManager } from '../utils/sounds';
import { AVATARS, getRank } from '../utils/ranks';
import { formatScore } from '../utils/score';
import ScoreModifier from './ScoreModifier';
import PetArtwork from './PetArtwork';
import { getStudentPetJourney } from '../utils/petJourney';

export default function StudentManager() {
  const { currentClass, students, teams, createStudent, deleteStudent, updateStudent } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('🎮');
  const [newTeamId, setNewTeamId] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [scoreModifyStudent, setScoreModifyStudent] = useState(null);

  const handleCreate = async () => {
    if (!newName.trim() || !currentClass) return;
    await createStudent(newName.trim(), currentClass.id, newTeamId ? parseInt(newTeamId) : null, newAvatar);
    soundManager.playScoreUp();
    setNewName('');
    setNewAvatar('🎮');
    setNewTeamId('');
    setShowCreate(false);
  };

  const handleDelete = async (id) => {
    if (confirm('确定要删除这个学员吗？')) {
      await deleteStudent(id);
    }
  };

  const handleUpdate = async () => {
    if (!editingStudent) return;
    await updateStudent(editingStudent.id, {
      name: editingStudent.name,
      team_id: editingStudent.team_id,
      avatar: editingStudent.avatar,
    });
    soundManager.playClick();
    setEditingStudent(null);
  };

  const groupedStudents = teams.map(team => ({
    team,
    students: students.filter(s => s.team_id === team.id),
  }));
  const unassigned = students.filter(s => !s.team_id);

  return (
    <div className="space-y-6">
      <div className="card-game">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">👥 学员管理</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(!showCreate)}
            className="btn-game btn-primary text-sm py-2"
          >
            {showCreate ? '取消' : '➕ 添加学员'}
          </motion.button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-gray-50 rounded-xl"
            >
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="学员姓名"
                  className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-pink-400 outline-none"
                />
                <select
                  value={newTeamId}
                  onChange={(e) => setNewTeamId(e.target.value)}
                  className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-pink-400 outline-none"
                >
                  <option value="">选择战队（可选）</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-6 py-2 rounded-xl font-bold text-white bg-pink-500 disabled:opacity-50"
                >
                  添加
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    onClick={() => setNewAvatar(avatar)}
                    className={`w-10 h-10 rounded-lg text-2xl transition-all ${
                      newAvatar === avatar ? 'bg-pink-500 scale-110 shadow-lg' : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 学员列表 */}
        <div className="space-y-4">
          {groupedStudents.map(({ team, students: teamStudents }) => (
            teamStudents.length > 0 && (
              <div key={team.id}>
                <div className="flex items-center gap-2 mb-2 px-2" style={{ color: team.color }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="font-bold">{team.name}</span>
                  <span className="text-sm text-gray-500">({teamStudents.length}人)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {teamStudents.map((student) => (
                    <StudentItem
                      key={student.id}
                      student={student}
                      onEdit={() => setEditingStudent({ ...student })}
                      onDelete={() => handleDelete(student.id)}
                      onModifyScore={() => setScoreModifyStudent(student)}
                    />
                  ))}
                </div>
              </div>
            )
          ))}

          {unassigned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-2 text-gray-500">
                <span className="font-bold">未分配战队</span>
                <span className="text-sm">({unassigned.length}人)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {unassigned.map((student) => (
                  <StudentItem
                    key={student.id}
                    student={student}
                    onEdit={() => setEditingStudent({ ...student })}
                    onDelete={() => handleDelete(student.id)}
                    onModifyScore={() => setScoreModifyStudent(student)}
                  />
                ))}
              </div>
            </div>
          )}

          {students.length === 0 && (
            <p className="text-center text-gray-400 py-8">还没有学员，点击上方按钮添加</p>
          )}
        </div>
      </div>

      {/* 编辑弹窗 */}
      <AnimatePresence>
        {editingStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setEditingStudent(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">编辑学员</h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-pink-400 outline-none"
                />
                
                <select
                  value={editingStudent.team_id || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, team_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-pink-400 outline-none"
                >
                  <option value="">无战队</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => setEditingStudent({ ...editingStudent, avatar })}
                      className={`w-10 h-10 rounded-lg text-2xl transition-all ${
                        editingStudent.avatar === avatar ? 'bg-pink-500 scale-110' : 'bg-gray-100'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 py-2 rounded-xl font-bold text-gray-600 bg-gray-100"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 py-2 rounded-xl font-bold text-white bg-pink-500"
                >
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 积分修改弹窗 */}
      <AnimatePresence>
        {scoreModifyStudent && (
          <ScoreModifier student={scoreModifyStudent} onClose={() => setScoreModifyStudent(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function StudentItem({ student, onEdit, onDelete, onModifyScore }) {
  const rank = getRank(student.score);
  const petJourney = getStudentPetJourney(student);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100"
    >
      <span className="text-3xl">{student.avatar}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-800 truncate">{student.name}</div>
        <div className="flex items-center gap-1 text-sm">
          <span>{rank.icon}</span>
          <span style={{ color: rank.color }}>{rank.name}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <PetArtwork
            pet={student.pet}
            journey={petJourney}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-50"
            imageClassName="h-4 w-4 object-contain"
            fallbackClassName="text-xs"
          />
          <span className="truncate">{petJourney.name}</span>
          <span
            className="rounded-full px-2 py-0.5 font-bold"
            style={{ backgroundColor: `${petJourney.accent}18`, color: petJourney.accent }}
          >
            {petJourney.stage_name}
          </span>
        </div>
      </div>
      <div className="text-xl font-bold" style={{ color: rank.color }}>
        {formatScore(student.score)}
      </div>
      <div className="flex gap-1">
        <button
          onClick={onModifyScore}
          className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 font-bold"
          title="修改积分"
        >
          ±
        </button>
        <button
          onClick={onEdit}
          className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
          title="编辑"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
          title="删除"
        >
          🗑️
        </button>
      </div>
    </motion.div>
  );
}
