import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { soundManager } from '../utils/sounds';
import { TEAM_COLORS } from '../utils/ranks';
import { formatScore } from '../utils/score';
import DangerConfirmModal from './DangerConfirmModal';

export default function TeamManager() {
  const { currentClass, teams, createTeam, deleteTeam, students, updateStudent } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0].value);
  const [pendingDeleteTeam, setPendingDeleteTeam] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleCreate = async () => {
    if (!newTeamName.trim() || !currentClass) return;

    await createTeam(newTeamName.trim(), currentClass.id, newTeamColor);
    soundManager.playScoreUp();
    setNewTeamName('');
    setShowCreate(false);
  };

  const handleDeleteRequest = (team) => {
    soundManager.playClick();
    setDeleteError('');
    setPendingDeleteTeam(team);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteTeam) return;

    setDeleteBusy(true);
    const success = await deleteTeam(pendingDeleteTeam.id);
    setDeleteBusy(false);

    if (success) {
      setPendingDeleteTeam(null);
      setDeleteError('');
      return;
    }

    setDeleteError('删除战队未完成，请稍后重试。');
  };

  const handleMoveStudent = async (studentId, newTeamId) => {
    const student = students.find((item) => item.id === studentId);
    if (!student) return;

    await updateStudent(studentId, {
      name: student.name,
      team_id: newTeamId,
      avatar: student.avatar
    });
    soundManager.playClick();
  };

  const unassignedStudents = students.filter((student) => !student.team_id);

  return (
    <div className="space-y-6">
      <div className="card-game">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">🛡️ 战队管理</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(!showCreate)}
            className="btn-game btn-success py-2 text-sm"
          >
            {showCreate ? '取消' : '➕ 新建战队'}
          </motion.button>
        </div>

        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 rounded-xl bg-gray-50 p-4"
          >
            <div className="mb-3 flex gap-3">
              <input
                type="text"
                value={newTeamName}
                onChange={(event) => setNewTeamName(event.target.value)}
                placeholder="战队名称"
                className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-2 outline-none focus:border-orange-400"
              />
              <button
                onClick={handleCreate}
                disabled={!newTeamName.trim()}
                className="rounded-xl bg-orange-500 px-6 py-2 font-bold text-white disabled:opacity-50"
              >
                创建
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEAM_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setNewTeamColor(color.value)}
                  className={`h-10 w-10 rounded-full transition-all ${
                    newTeamColor === color.value ? 'scale-110 ring-4 ring-gray-400 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          {teams.map((team) => {
            const teamMembers = students.filter((student) => student.team_id === team.id);

            return (
              <div
                key={team.id}
                className="rounded-xl border-2 p-4"
                style={{ borderColor: team.color, backgroundColor: `${team.color}10` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: team.color }} />
                    <span className="text-lg font-bold">{team.name}</span>
                    <span className="text-sm text-gray-500">({teamMembers.length}人)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold" style={{ color: team.color }}>
                      {formatScore(team.score)}分
                    </span>
                    <button
                      onClick={() => handleDeleteRequest(team)}
                      data-testid={`team-delete-${team.id}`}
                      className="rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-red-500 shadow-sm transition hover:bg-red-50 hover:text-red-600"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm shadow-sm"
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
                      onChange={(event) => {
                        if (event.target.value) {
                          handleMoveStudent(parseInt(event.target.value, 10), team.id);
                          event.target.value = '';
                        }
                      }}
                      className="cursor-pointer rounded-full border border-dashed border-gray-300 bg-white px-3 py-1 text-sm"
                    >
                      <option value="">+ 添加成员</option>
                      {unassignedStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.avatar} {student.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}

          {teams.length === 0 && (
            <p className="py-8 text-center text-gray-400">还没有战队，点击上方按钮创建</p>
          )}
        </div>

        {unassignedStudents.length > 0 && (
          <div className="mt-4 rounded-xl bg-gray-100 p-4">
            <h4 className="mb-2 font-bold text-gray-600">未分配战队的学员</h4>
            <div className="flex flex-wrap gap-2">
              {unassignedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"
                >
                  <span>{student.avatar}</span>
                  <span>{student.name}</span>
                  <select
                    onChange={(event) => {
                      if (event.target.value) {
                        handleMoveStudent(student.id, parseInt(event.target.value, 10));
                      }
                    }}
                    className="cursor-pointer border-none bg-transparent text-sm text-orange-500"
                  >
                    <option value="">分配到...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <DangerConfirmModal
        open={Boolean(pendingDeleteTeam)}
        title="删除战队？"
        description="删除战队后，这个队伍会从当前班级中移除，现有成员会自动变成“未分配战队”状态。"
        subjectLabel={pendingDeleteTeam ? pendingDeleteTeam.name : ''}
        impacts={[
          '战队入口、战队排行和队伍标识会立即消失。',
          '战队成员不会被删除，但会全部恢复为未分配状态。',
          '这是不可撤回的操作，请确认不是误点。'
        ]}
        errorMessage={deleteError}
        busy={deleteBusy}
        confirmLabel="确认删除战队"
        cancelLabel="先保留"
        testId="danger-confirm-team"
        onCancel={() => {
          if (deleteBusy) return;
          setPendingDeleteTeam(null);
          setDeleteError('');
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
