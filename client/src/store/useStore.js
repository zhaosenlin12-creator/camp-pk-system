import { create } from 'zustand';

const API_BASE = '/api';

// 统一的请求处理函数
const request = async (url, options = {}) => {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: '请求失败' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (err) {
    console.error('API请求错误:', err);
    throw err;
  }
};

export const useStore = create((set, get) => ({
  // 状态
  classes: [],
  currentClass: null,
  teams: [],
  students: [],
  rewards: [],
  punishments: [],
  isAdmin: false,
  loading: false,
  error: null,

  // 清除错误
  clearError: () => set({ error: null }),

  // 设置管理员状态
  setAdmin: (isAdmin) => set({ isAdmin }),

  // 获取所有班级
  fetchClasses: async () => {
    try {
      const classes = await request(`${API_BASE}/classes`);
      set({ classes: classes || [], error: null });
      return classes;
    } catch (err) {
      set({ error: '获取班级列表失败' });
      return [];
    }
  },


  // 创建班级
  createClass: async (name) => {
    try {
      const newClass = await request(`${API_BASE}/classes`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      set(state => ({ classes: [newClass, ...state.classes], error: null }));
      return newClass;
    } catch (err) {
      set({ error: '创建班级失败' });
      return null;
    }
  },

  // 删除班级
  deleteClass: async (id) => {
    try {
      await request(`${API_BASE}/classes/${id}`, { method: 'DELETE' });
      set(state => ({
        classes: state.classes.filter(c => c.id !== id),
        currentClass: state.currentClass?.id === id ? null : state.currentClass,
        error: null
      }));
      return true;
    } catch (err) {
      set({ error: '删除班级失败' });
      return false;
    }
  },

  // 设置当前班级
  setCurrentClass: async (classItem) => {
    set({ currentClass: classItem, loading: true, error: null });
    if (classItem) {
      try {
        await Promise.all([
          get().fetchTeams(classItem.id),
          get().fetchStudents(classItem.id)
        ]);
      } catch (err) {
        set({ error: '加载班级数据失败' });
      }
    } else {
      set({ teams: [], students: [] });
    }
    set({ loading: false });
  },

  // 获取战队
  fetchTeams: async (classId) => {
    try {
      const teams = await request(`${API_BASE}/classes/${classId}/teams`);
      set({ teams: teams || [] });
      return teams;
    } catch (err) {
      set({ teams: [] });
      return [];
    }
  },

  // 创建战队
  createTeam: async (name, classId, color) => {
    try {
      const newTeam = await request(`${API_BASE}/teams`, {
        method: 'POST',
        body: JSON.stringify({ name, class_id: classId, color })
      });
      set(state => ({ teams: [...state.teams, newTeam], error: null }));
      return newTeam;
    } catch (err) {
      set({ error: '创建战队失败' });
      return null;
    }
  },

  // 删除战队
  deleteTeam: async (id) => {
    try {
      await request(`${API_BASE}/teams/${id}`, { method: 'DELETE' });
      set(state => ({ teams: state.teams.filter(t => t.id !== id), error: null }));
      const currentClass = get().currentClass;
      if (currentClass) {
        get().fetchStudents(currentClass.id);
      }
      return true;
    } catch (err) {
      set({ error: '删除战队失败' });
      return false;
    }
  },

  // 更新战队积分
  updateTeamScore: async (teamId, delta, reason) => {
    try {
      const updatedTeam = await request(`${API_BASE}/teams/${teamId}/score`, {
        method: 'PATCH',
        body: JSON.stringify({ delta, reason })
      });
      set(state => ({
        teams: state.teams.map(t => t.id === teamId ? { ...t, score: updatedTeam.score } : t),
        error: null
      }));
      return updatedTeam;
    } catch (err) {
      set({ error: '更新积分失败' });
      return null;
    }
  },


  // 获取学员
  fetchStudents: async (classId) => {
    try {
      const students = await request(`${API_BASE}/classes/${classId}/students`);
      set({ students: students || [] });
      return students;
    } catch (err) {
      set({ students: [] });
      return [];
    }
  },

  // 创建学员
  createStudent: async (name, classId, teamId, avatar) => {
    try {
      const newStudent = await request(`${API_BASE}/students`, {
        method: 'POST',
        body: JSON.stringify({ name, class_id: classId, team_id: teamId, avatar })
      });
      set(state => ({ students: [...state.students, newStudent], error: null }));
      return newStudent;
    } catch (err) {
      set({ error: '添加学员失败' });
      return null;
    }
  },

  // 更新学员
  updateStudent: async (id, data) => {
    try {
      await request(`${API_BASE}/students/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      const currentClass = get().currentClass;
      if (currentClass) {
        await get().fetchStudents(currentClass.id);
        await get().fetchTeams(currentClass.id);
      }
      set({ error: null });
      return true;
    } catch (err) {
      set({ error: '更新学员失败' });
      return false;
    }
  },

  // 更新学员积分
  updateStudentScore: async (studentId, delta, reason) => {
    try {
      const updatedStudent = await request(`${API_BASE}/students/${studentId}/score`, {
        method: 'PATCH',
        body: JSON.stringify({ delta, reason })
      });
      const currentClass = get().currentClass;
      if (currentClass) {
        await get().fetchStudents(currentClass.id);
        await get().fetchTeams(currentClass.id);
      }
      set({ error: null });
      return updatedStudent;
    } catch (err) {
      set({ error: '更新积分失败' });
      return null;
    }
  },

  // 删除学员
  deleteStudent: async (id) => {
    try {
      await request(`${API_BASE}/students/${id}`, { method: 'DELETE' });
      set(state => ({ students: state.students.filter(s => s.id !== id), error: null }));
      return true;
    } catch (err) {
      set({ error: '删除学员失败' });
      return false;
    }
  },

  // 获取奖励列表
  fetchRewards: async () => {
    try {
      const rewards = await request(`${API_BASE}/rewards`);
      set({ rewards: rewards || [] });
      return rewards;
    } catch (err) {
      set({ rewards: [] });
      return [];
    }
  },

  // 获取惩罚列表
  fetchPunishments: async () => {
    try {
      const punishments = await request(`${API_BASE}/punishments`);
      set({ punishments: punishments || [] });
      return punishments;
    } catch (err) {
      set({ punishments: [] });
      return [];
    }
  },

  // 验证管理员
  verifyAdmin: async (pin) => {
    try {
      const { success } = await request(`${API_BASE}/admin/verify`, {
        method: 'POST',
        body: JSON.stringify({ pin })
      });
      set({ isAdmin: success, error: null });
      return success;
    } catch (err) {
      set({ isAdmin: false, error: '验证失败，请稍后再试' });
      return false;
    }
  },

  // ============ 抽奖记录 ============
  lotteryLogs: [],

  fetchLotteryLogs: async (classId, date = '', type = 'all') => {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (type && type !== 'all') params.append('type', type);
      const logs = await request(`${API_BASE}/classes/${classId}/lottery-logs?${params}`);
      set({ lotteryLogs: logs || [] });
      return logs;
    } catch (err) {
      set({ lotteryLogs: [] });
      return [];
    }
  },

  addLotteryLog: async (classId, teamId, teamName, type, itemName, itemIcon) => {
    try {
      const newLog = await request(`${API_BASE}/lottery-logs`, {
        method: 'POST',
        body: JSON.stringify({
          class_id: classId,
          team_id: teamId,
          team_name: teamName,
          type,
          item_name: itemName,
          item_icon: itemIcon
        })
      });
      set(state => ({ lotteryLogs: [newLog, ...state.lotteryLogs] }));
      return newLog;
    } catch (err) {
      return null;
    }
  },

  clearLotteryLogs: async (classId) => {
    try {
      await request(`${API_BASE}/classes/${classId}/lottery-logs`, { method: 'DELETE' });
      set({ lotteryLogs: [] });
      return true;
    } catch (err) {
      return false;
    }
  }
}));