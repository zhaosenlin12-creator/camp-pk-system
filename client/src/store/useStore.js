import { create } from 'zustand';

const API_BASE = '/api';
const ADMIN_TOKEN_KEY = 'camp-pk-admin-token';
export const ADMIN_AUTH_EXPIRED_EVENT = 'camp-pk-admin-auth-expired';
export const CURRENT_CLASS_STORAGE_KEY = 'camp-pk-current-class-id';

const getStoredAdminToken = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || '';
};

const persistAdminToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
};

const clearStoredAdminToken = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent(ADMIN_AUTH_EXPIRED_EVENT));
};

const readStoredCurrentClassId = () => {
  if (typeof window === 'undefined') return null;
  const rawValue = window.localStorage.getItem(CURRENT_CLASS_STORAGE_KEY);
  if (!rawValue) return null;

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const persistCurrentClassId = (classId) => {
  if (typeof window === 'undefined') return;

  if (classId) {
    window.localStorage.setItem(CURRENT_CLASS_STORAGE_KEY, String(classId));
  } else {
    window.localStorage.removeItem(CURRENT_CLASS_STORAGE_KEY);
  }
};

const findClassById = (classes, classId) => (
  (classes || []).find((item) => Number(item?.id) === Number(classId)) || null
);

export const getAdminAuthHeaders = () => {
  const token = getStoredAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 统一的请求处理函数
const request = async (url, options = {}, requestOptions = {}) => {
  try {
    const isFormData = options.body instanceof FormData;
    const method = String(options.method || 'GET').toUpperCase();
    const token = requestOptions.skipAuth ? '' : getStoredAdminToken();
    const res = await fetch(url, {
      ...options,
      method,
      cache: requestOptions.cache || 'no-store',
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
    
    if (!res.ok) {
      if (res.status === 401 && (token || requestOptions.expectAdmin)) {
        clearStoredAdminToken();
      }
      const error = await res.json().catch(() => ({ error: '请求失败' }));
      const requestError = new Error(error.error || `HTTP ${res.status}`);
      requestError.status = res.status;
      throw requestError;
    }
    
    if (res.status === 204) {
      return null;
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
  pets: [],
  rewards: [],
  punishments: [],
  isAdmin: false,
  loading: false,
  error: null,

  // 清除错误
  clearError: () => set({ error: null }),

  // 设置管理员状态
  setAdmin: (isAdmin) => {
    if (!isAdmin) {
      persistAdminToken('');
    }
    set({ isAdmin });
  },

  restoreAdminSession: async () => {
    const token = getStoredAdminToken();
    if (!token) {
      set({ isAdmin: false });
      return false;
    }

    try {
      const session = await request(`${API_BASE}/admin/session`, {}, { expectAdmin: true });
      const isAdmin = Boolean(session?.success);
      set({ isAdmin, error: null });
      return isAdmin;
    } catch (err) {
      clearStoredAdminToken();
      set({ isAdmin: false });
      return false;
    }
  },

  logoutAdmin: () => {
    clearStoredAdminToken();
    set({ isAdmin: false });
  },

  // 获取所有班级
  fetchClasses: async () => {
    try {
      const classes = await request(`${API_BASE}/classes`);
      const nextClasses = classes || [];
      const selectedId = get().currentClass?.id || readStoredCurrentClassId();
      const matchedClass = selectedId ? findClassById(nextClasses, selectedId) : null;

      set((state) => ({
        classes: nextClasses,
        currentClass: matchedClass || (selectedId ? null : state.currentClass),
        error: null
      }));

      if (selectedId && matchedClass) {
        await get().setCurrentClass(matchedClass, { persistSelection: false });
      } else if (selectedId && !matchedClass) {
        persistCurrentClassId(null);
        set({ currentClass: null, teams: [], students: [] });
      }

      return nextClasses;
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
      await get().setCurrentClass(newClass);
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
      set(state => {
        const nextClasses = state.classes.filter(c => c.id !== id);
        const nextCurrentClass = state.currentClass?.id === id ? null : state.currentClass;

        if (!nextCurrentClass) {
          persistCurrentClassId(null);
        }

        return {
          classes: nextClasses,
          currentClass: nextCurrentClass,
          teams: nextCurrentClass ? state.teams : [],
          students: nextCurrentClass ? state.students : [],
          error: null
        };
      });
      return true;
    } catch (err) {
      set({ error: '删除班级失败' });
      return false;
    }
  },

  // 设置当前班级
  setCurrentClass: async (classItem, options = {}) => {
    const { persistSelection = true } = options;

    if (persistSelection) {
      persistCurrentClassId(classItem?.id || null);
    }

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

  syncCurrentClassFromStorage: async () => {
    const storedClassId = readStoredCurrentClassId();
    const currentClass = get().currentClass;

    if (!storedClassId) {
      if (currentClass) {
        await get().setCurrentClass(null, { persistSelection: false });
      }
      return null;
    }

    if (currentClass && Number(currentClass.id) === Number(storedClassId)) {
      return currentClass;
    }

    const classes = get().classes.length ? get().classes : await get().fetchClasses();
    const matchedClass = findClassById(classes, storedClassId);

    if (!matchedClass) {
      persistCurrentClassId(null);
      await get().setCurrentClass(null, { persistSelection: false });
      return null;
    }

    await get().setCurrentClass(matchedClass, { persistSelection: false });
    return matchedClass;
  },

  refreshCurrentClassSnapshot: async (options = {}) => {
    const {
      includeStudents = true,
      includeTeams = false,
      includeRatings = false,
      includeActiveSession = includeRatings,
      includeLeaderboard = includeRatings
    } = options;
    const currentClass = get().currentClass;

    if (!currentClass?.id) {
      return [];
    }

    const tasks = [];

    if (includeStudents) {
      tasks.push(get().fetchStudents(currentClass.id));
    }

    if (includeTeams) {
      tasks.push(get().fetchTeams(currentClass.id));
    }

    if (includeRatings) {
      tasks.push(get().fetchRatingSessions(currentClass.id));
    }

    if (includeActiveSession) {
      tasks.push(get().fetchActiveSession(currentClass.id));
    }

    if (includeLeaderboard) {
      tasks.push(get().fetchRatingLeaderboard(currentClass.id));
    }

    return Promise.allSettled(tasks);
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
  fetchPets: async () => {
    try {
      const pets = await request(`${API_BASE}/pets`);
      set({ pets: pets || [] });
      return pets || [];
    } catch (err) {
      set({ pets: [] });
      return [];
    }
  },

  claimStudentPet: async (studentId, petId, overwrite = false) => {
    try {
      const updatedStudent = await request(`${API_BASE}/students/${studentId}/claim-pet`, {
        method: 'POST',
        body: JSON.stringify({ pet_id: petId, overwrite })
      });
      set((state) => ({
        students: state.students.map((student) =>
          student.id === studentId ? updatedStudent : student
        ),
        error: null
      }));
      await get().refreshCurrentClassSnapshot({ includeTeams: false });
      return get().students.find((student) => student.id === studentId) || updatedStudent;
    } catch (err) {
      set({ error: err.message || '领取宠物失败' });
      throw err;
    }
  },

  activateStudentPetSlot: async (studentId, slotId) => {
    try {
      const updatedStudent = await request(`${API_BASE}/students/${studentId}/pet-slots/${slotId}/activate`, {
        method: 'POST'
      });
      set((state) => ({
        students: state.students.map((student) =>
          student.id === studentId ? updatedStudent : student
        ),
        error: null
      }));
      await get().refreshCurrentClassSnapshot({ includeTeams: false });
      return get().students.find((student) => student.id === studentId) || updatedStudent;
    } catch (err) {
      set({ error: err.message || '切换宠物失败' });
      throw err;
    }
  },

  runStudentPetAction: async (studentId, action) => {
    try {
      const updatedStudent = await request(`${API_BASE}/students/${studentId}/pet/${action}`, {
        method: 'POST'
      });
      set((state) => ({
        students: state.students.map((student) =>
          student.id === studentId ? updatedStudent : student
        ),
        error: null
      }));
      await get().refreshCurrentClassSnapshot({
        includeStudents: true,
        includeTeams: Boolean(updatedStudent?.team_id)
      });
      return get().students.find((student) => student.id === studentId) || updatedStudent;
    } catch (err) {
      set({ error: err.message || '宠物操作失败' });
      throw err;
    }
  },

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
      const { success, token } = await request(
        `${API_BASE}/admin/verify`,
        {
          method: 'POST',
          body: JSON.stringify({ pin })
        },
        { skipAuth: true }
      );
      if (success && token) {
        persistAdminToken(token);
      } else {
        persistAdminToken('');
      }
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

  executeLotteryDraw: async ({ classId, targetType, targetId, type, itemId }) => {
    try {
      const result = await request(`${API_BASE}/lottery/execute`, {
        method: 'POST',
        body: JSON.stringify({
          class_id: classId,
          target_type: targetType,
          target_id: targetId,
          type,
          item_id: itemId
        })
      });

      if (classId) {
        await Promise.all([
          get().fetchStudents(classId),
          get().fetchTeams(classId)
        ]);
      }

      if (result?.log) {
        set((state) => ({
          lotteryLogs: [result.log, ...state.lotteryLogs],
          error: null
        }));
      } else {
        set({ error: null });
      }

      return result;
    } catch (err) {
      set({ error: err.message || '抽奖结算失败' });
      throw err;
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
  },

  // ============ 展示评分 ============
  activeSession: null,
  ratingSessions: [],
  ratingLeaderboard: [],

  // 获取当前进行中的评分会话
  fetchActiveSession: async (classId) => {
    try {
      const session = await request(`${API_BASE}/classes/${classId}/active-session`);
      set({ activeSession: session });
      return session;
    } catch (err) {
      set({ activeSession: null });
      return null;
    }
  },

  // 获取所有评分会话
  fetchRatingSessions: async (classId) => {
    try {
      const sessions = await request(`${API_BASE}/classes/${classId}/rating-sessions`);
      set({ ratingSessions: sessions || [] });
      return sessions;
    } catch (err) {
      set({ ratingSessions: [] });
      return [];
    }
  },

  // 获取会话详情（管理员用）
  fetchSessionDetail: async (sessionId) => {
    try {
      return await request(`${API_BASE}/rating-sessions/${sessionId}`);
    } catch (err) {
      return null;
    }
  },

  // 创建评分会话
  createRatingSession: async (classId, studentId) => {
    try {
      const session = await request(`${API_BASE}/rating-sessions`, {
        method: 'POST',
        body: JSON.stringify({ class_id: classId, student_id: studentId })
      });
      set({ activeSession: session });
      if (get().currentClass?.id === classId) {
        await get().fetchRatingSessions(classId);
      }
      return session;
    } catch (err) {
      throw err;
    }
  },

  // 提交打分
  submitVote: async (sessionId, voterName, score) => {
    try {
      const result = await request(`${API_BASE}/rating-sessions/${sessionId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ voter_name: voterName, score })
      });
      return result;
    } catch (err) {
      throw err;
    }
  },

  // 检查是否已打分
  checkVoted: async (sessionId, voterName) => {
    try {
      return await request(`${API_BASE}/rating-sessions/${sessionId}/check-voted?voter_name=${encodeURIComponent(voterName)}`);
    } catch (err) {
      return { voted: false, your_score: null };
    }
  },

  // 结束评分会话
  closeRatingSession: async (sessionId) => {
    try {
      const result = await request(`${API_BASE}/rating-sessions/${sessionId}/close`, {
        method: 'PATCH'
      });
      set({ activeSession: null });
      await get().refreshCurrentClassSnapshot({
        includeStudents: true,
        includeTeams: true,
        includeRatings: true
      });
      return result;
    } catch (err) {
      throw err;
    }
  },

  // 取消评分会话（不计分）
  cancelRatingSession: async (sessionId) => {
    try {
      await request(`${API_BASE}/rating-sessions/${sessionId}/cancel`, {
        method: 'PATCH'
      });
      set({ activeSession: null });
      await get().refreshCurrentClassSnapshot({
        includeStudents: false,
        includeTeams: false,
        includeRatings: true
      });
      return true;
    } catch (err) {
      throw err;
    }
  },

  // 删除打分记录
  deleteVote: async (voteId) => {
    try {
      await request(`${API_BASE}/rating-votes/${voteId}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      throw err;
    }
  },

  // 编辑打分记录
  editVote: async (voteId, score) => {
    try {
      await request(`${API_BASE}/rating-votes/${voteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ score })
      });
      return true;
    } catch (err) {
      throw err;
    }
  },

  // 删除评分会话
  deleteRatingSession: async (sessionId) => {
    try {
      await request(`${API_BASE}/rating-sessions/${sessionId}`, { method: 'DELETE' });
      await get().refreshCurrentClassSnapshot({
        includeStudents: false,
        includeTeams: false,
        includeRatings: true
      });
      return true;
    } catch (err) {
      throw err;
    }
  },

  // 获取评分排行榜
  fetchRatingLeaderboard: async (classId) => {
    try {
      const leaderboard = await request(`${API_BASE}/classes/${classId}/rating-leaderboard`);
      set({ ratingLeaderboard: leaderboard || [] });
      return leaderboard;
    } catch (err) {
      set({ ratingLeaderboard: [] });
      return [];
    }
  },

  // ============ 结营报告 ============
  reports: [],

  fetchStudentScoreLogs: async (studentId) => {
    try {
      return await request(`${API_BASE}/students/${studentId}/score-logs`)
    } catch (err) {
      return []
    }
  },

  uploadReportPhotos: async (files) => {
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('photos', file))
      return await request(`${API_BASE}/reports/upload`, {
        method: 'POST',
        body: formData
      })
    } catch (err) {
      throw err
    }
  },

  generateAiComment: async ({ studentInfo, customPrompt = '' }) => {
    try {
      return await request(`${API_BASE}/ai/generate-comment`, {
        method: 'POST',
        body: JSON.stringify({ studentInfo, customPrompt })
      })
    } catch (err) {
      throw err
    }
  },

  createReport: async (payload) => {
    try {
      return await request(`${API_BASE}/reports`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    } catch (err) {
      throw err
    }
  },

  fetchClassReports: async (classId) => {
    try {
      const reports = await request(`${API_BASE}/classes/${classId}/reports`)
      set({ reports: reports || [] })
      return reports || []
    } catch (err) {
      set({ reports: [] })
      return []
    }
  },

  getReportByShortId: async (shortId) => {
    try {
      return await request(`${API_BASE}/reports/${shortId}`)
    } catch (err) {
      throw err
    }
  },

  // ============ 奖状 ============
  certificates: [],

  createCertificate: async (payload) => {
    try {
      return await request(`${API_BASE}/certificates`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    } catch (err) {
      throw err
    }
  },

  fetchClassCertificates: async (classId) => {
    try {
      const certificates = await request(`${API_BASE}/classes/${classId}/certificates`)
      set({ certificates: certificates || [] })
      return certificates || []
    } catch (err) {
      set({ certificates: [] })
      return []
    }
  },

  getCertificateByShortId: async (shortId) => {
    try {
      return await request(`${API_BASE}/certificates/${shortId}`)
    } catch (err) {
      throw err
    }
  }
}));
