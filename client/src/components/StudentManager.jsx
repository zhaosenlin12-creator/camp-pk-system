import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { soundManager } from '../utils/sounds';
import { AVATARS, getRank } from '../utils/ranks';
import { formatScore } from '../utils/score';
import ScoreModifier from './ScoreModifier';
import PetArtwork from './PetArtwork';
import DangerConfirmModal from './DangerConfirmModal';
import { getStudentPetJourney } from '../utils/petJourney';

export default function StudentManager() {
  const { currentClass, students, teams, createStudent, deleteStudent, updateStudent } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('🎃');
  const [newTeamId, setNewTeamId] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [scoreModifyStudent, setScoreModifyStudent] = useState(null);
  const [pendingDeleteStudent, setPendingDeleteStudent] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleCreate = async () => {
    if (!newName.trim() || !currentClass) return;

    await createStudent(newName.trim(), currentClass.id, newTeamId ? parseInt(newTeamId, 10) : null, newAvatar);
    soundManager.playScoreUp();
    setNewName('');
    setNewAvatar('🎃');
    setNewTeamId('');
    setShowCreate(false);
  };

  const handleDeleteRequest = (student) => {
    soundManager.playClick();
    setDeleteError('');
    setPendingDeleteStudent(student);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteStudent) return;

    setDeleteBusy(true);
    const success = await deleteStudent(pendingDeleteStudent.id);
    setDeleteBusy(false);

    if (success) {
      setPendingDeleteStudent(null);
      setDeleteError('');
      return;
    }

    setDeleteError('删除未完成。如果该学员正在评分，请先结束评分后再试。');
  };

  const handleUpdate = async () => {
    if (!editingStudent) return;

    await updateStudent(editingStudent.id, {
      name: editingStudent.name,
      team_id: editingStudent.team_id,
      avatar: editingStudent.avatar
    });
    soundManager.playClick();
    setEditingStudent(null);
  };

  const groupedStudents = teams.map((team) => ({
    team,
    students: students.filter((student) => student.team_id === team.id)
  }));
  const unassignedStudents = students.filter((student) => !student.team_id);

  return (
    <div className="space-y-6">
      <div className="card-game">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">👥 学员管理</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(!showCreate)}
            className="btn-game btn-primary py-2 text-sm"
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
              className="mb-4 rounded-xl bg-gray-50 p-4"
            >
              <div className="mb-3 flex gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="学员姓名"
                  className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-2 outline-none focus:border-pink-400"
                />
                <select
                  value={newTeamId}
                  onChange={(event) => setNewTeamId(event.target.value)}
                  className="rounded-xl border-2 border-gray-200 px-4 py-2 outline-none focus:border-pink-400"
                >
                  <option value="">选择战队（可选）</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="rounded-xl bg-pink-500 px-6 py-2 font-bold text-white disabled:opacity-50"
                >
                  添加
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    onClick={() => setNewAvatar(avatar)}
                    className={`h-10 w-10 rounded-lg text-2xl transition-all ${
                      newAvatar === avatar ? 'scale-110 bg-pink-500 shadow-lg' : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {groupedStudents.map(({ team, students: teamStudents }) =>
            teamStudents.length > 0 ? (
              <div key={team.id}>
                <div className="mb-2 flex items-center gap-2 px-2" style={{ color: team.color }}>
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="font-bold">{team.name}</span>
                  <span className="text-sm text-gray-500">({teamStudents.length}人)</span>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {teamStudents.map((student) => (
                    <StudentItem
                      key={student.id}
                      student={student}
                      onEdit={() => setEditingStudent({ ...student })}
                      onDelete={() => handleDeleteRequest(student)}
                      onModifyScore={() => setScoreModifyStudent(student)}
                    />
                  ))}
                </div>
              </div>
            ) : null
          )}

          {unassignedStudents.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 px-2 text-gray-500">
                <span className="font-bold">未分配战队</span>
                <span className="text-sm">({unassignedStudents.length}人)</span>
              </div>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {unassignedStudents.map((student) => (
                  <StudentItem
                    key={student.id}
                    student={student}
                    onEdit={() => setEditingStudent({ ...student })}
                    onDelete={() => handleDeleteRequest(student)}
                    onModifyScore={() => setScoreModifyStudent(student)}
                  />
                ))}
              </div>
            </div>
          )}

          {students.length === 0 && (
            <p className="py-8 text-center text-gray-400">还没有学员，点击上方按钮添加</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editingStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setEditingStudent(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-md rounded-2xl bg-white p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="mb-4 text-xl font-bold">编辑学员</h3>

              <div className="space-y-4">
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(event) => setEditingStudent({ ...editingStudent, name: event.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2 outline-none focus:border-pink-400"
                />

                <select
                  value={editingStudent.team_id || ''}
                  onChange={(event) =>
                    setEditingStudent({
                      ...editingStudent,
                      team_id: event.target.value ? parseInt(event.target.value, 10) : null
                    })
                  }
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2 outline-none focus:border-pink-400"
                >
                  <option value="">无战队</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => setEditingStudent({ ...editingStudent, avatar })}
                      className={`h-10 w-10 rounded-lg text-2xl transition-all ${
                        editingStudent.avatar === avatar ? 'scale-110 bg-pink-500' : 'bg-gray-100'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 rounded-xl bg-gray-100 py-2 font-bold text-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 rounded-xl bg-pink-500 py-2 font-bold text-white"
                >
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scoreModifyStudent && (
          <ScoreModifier student={scoreModifyStudent} onClose={() => setScoreModifyStudent(null)} />
        )}
      </AnimatePresence>

      <DangerConfirmModal
        open={Boolean(pendingDeleteStudent)}
        title="删除学员档案？"
        description="这个学员会从当前班级中移除，系统会同步清理他的宠物成长、积分记录、评分会话、结营报告与奖状数据。"
        subjectLabel={pendingDeleteStudent ? `${pendingDeleteStudent.avatar} ${pendingDeleteStudent.name}` : ''}
        impacts={[
          '学员会立即从管理页和展示页中消失。',
          '该学员对应的宠物、积分日志、评分会话、结营报告和奖状会一起删除。',
          '这是不可撤回的操作，请确认不是误点。'
        ]}
        errorMessage={deleteError}
        busy={deleteBusy}
        confirmLabel="确认删除学员"
        cancelLabel="先保留"
        testId="danger-confirm-student"
        onCancel={() => {
          if (deleteBusy) return;
          setPendingDeleteStudent(null);
          setDeleteError('');
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

function StudentItem({ student, onEdit, onDelete, onModifyScore }) {
  const rank = getRank(student.score);
  const petJourney = getStudentPetJourney(student);

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="flex items-start gap-4 rounded-[26px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.96)_100%)] p-4 shadow-[0_18px_40px_rgba(35,49,79,0.1)]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-white text-3xl shadow-sm">
        {student.avatar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold text-gray-800">{student.name}</div>
        <div className="flex items-center gap-1 text-sm">
          <span>{rank.icon}</span>
          <span style={{ color: rank.color }}>{rank.name}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <PetArtwork
            pet={student.pet}
            journey={petJourney}
            className="pet-hero-frame pet-hero-frame-active flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/92"
            imageClassName="h-10 w-10 object-contain"
            fallbackClassName="text-xl"
            idleMotion="soft"
          />
          <span className="truncate font-black text-slate-700">{petJourney.name}</span>
          <span
            className="rounded-full px-2.5 py-1 font-bold shadow-sm"
            style={{ backgroundColor: `${petJourney.accent}18`, color: petJourney.accent }}
          >
            {petJourney.stage_name}
          </span>
        </div>
      </div>
      <div className="shrink-0 rounded-[18px] border border-white/80 bg-white/92 px-4 py-3 text-right text-xl font-black shadow-sm" style={{ color: rank.color }}>
        {formatScore(student.score)}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onModifyScore}
          data-testid={`student-score-${student.id}`}
          className="rounded-[14px] bg-emerald-100 p-2.5 font-bold text-emerald-700 transition hover:bg-emerald-200"
          title="修改积分"
        >
          卤
        </button>
        <button
          onClick={onEdit}
          data-testid={`student-edit-${student.id}`}
          className="rounded-[14px] bg-sky-100 p-2.5 text-sky-700 transition hover:bg-sky-200"
          title="编辑"
        >
          ✍️
        </button>
        <button
          onClick={onDelete}
          data-testid={`student-delete-${student.id}`}
          className="rounded-[14px] bg-rose-100 p-2.5 text-rose-700 transition hover:bg-rose-200"
          title="删除"
        >
          🗑️
        </button>
      </div>
    </motion.div>
  );
}
