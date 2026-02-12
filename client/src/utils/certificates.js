// 奖状模板配置 - 乐启享机器人 2025寒假创赛营

// 机构信息
export const ORG_INFO = {
  name: '乐启享机器人',
  campName: '2025寒假创赛营',
  slogan: '让每个孩子都能创造未来',
  // 备案信息
  icp: '鄂ICP备2025149404号-1',
  icpUrl: 'https://beian.miit.gov.cn/',
};

// 奖状类型
export const CERTIFICATE_TYPES = {
  FIRST_PRIZE: 'first_prize',
  SECOND_PRIZE: 'second_prize', 
  THIRD_PRIZE: 'third_prize',
  EXCELLENCE: 'excellence',
  POPULARITY_STAR: 'popularity_star',
  CREATIVITY_STAR: 'creativity_star',
  ART_STAR: 'art_star',
  RANK_CERTIFICATE: 'rank_certificate',
  BEST_TEAM: 'best_team',
};

// 奖状模板配置
export const CERTIFICATE_TEMPLATES = {
  [CERTIFICATE_TYPES.FIRST_PRIZE]: {
    id: CERTIFICATE_TYPES.FIRST_PRIZE,
    name: '一等奖',
    icon: '🥇',
    title: '一等奖',
    subtitle: '荣誉证书',
    description: '在2025寒假创赛营中表现卓越，以优异的成绩和出色的创造力荣获',
    bgGradient: 'from-amber-200 via-yellow-100 to-amber-200',
    borderColor: '#D4AF37',
    accentColor: '#8B6914',
    textColor: '#5C4813',
    decoration: '🏆',
    pattern: 'gold',
  },
  [CERTIFICATE_TYPES.SECOND_PRIZE]: {
    id: CERTIFICATE_TYPES.SECOND_PRIZE,
    name: '二等奖',
    icon: '🥈',
    title: '二等奖',
    subtitle: '荣誉证书',
    description: '在2025寒假创赛营中表现优秀，凭借扎实的技能和积极的态度荣获',
    bgGradient: 'from-slate-200 via-gray-100 to-slate-200',
    borderColor: '#A8A8A8',
    accentColor: '#5A5A5A',
    textColor: '#3D3D3D',
    decoration: '🎖️',
    pattern: 'silver',
  },
  [CERTIFICATE_TYPES.THIRD_PRIZE]: {
    id: CERTIFICATE_TYPES.THIRD_PRIZE,
    name: '三等奖',
    icon: '🥉',
    title: '三等奖',
    subtitle: '荣誉证书',
    description: '在2025寒假创赛营中表现良好，展现出积极进取的学习精神荣获',
    bgGradient: 'from-orange-200 via-amber-100 to-orange-200',
    borderColor: '#CD7F32',
    accentColor: '#8B5A2B',
    textColor: '#5D3A1A',
    decoration: '🎗️',
    pattern: 'bronze',
  },
  [CERTIFICATE_TYPES.EXCELLENCE]: {
    id: CERTIFICATE_TYPES.EXCELLENCE,
    name: '优秀奖',
    icon: '⭐',
    title: '优秀学员',
    subtitle: '荣誉证书',
    description: '在2025寒假创赛营中认真学习、积极参与，展现出良好的学习态度荣获',
    bgGradient: 'from-sky-200 via-blue-100 to-sky-200',
    borderColor: '#4A90D9',
    accentColor: '#2563EB',
    textColor: '#1E40AF',
    decoration: '✨',
    pattern: 'blue',
  },
  [CERTIFICATE_TYPES.POPULARITY_STAR]: {
    id: CERTIFICATE_TYPES.POPULARITY_STAR,
    name: '人气之星',
    icon: '💖',
    title: '人气之星',
    subtitle: '特别荣誉',
    description: '在2025寒假创赛营中深受同学们喜爱，以阳光开朗的性格感染身边每一个人荣获',
    bgGradient: 'from-pink-200 via-rose-100 to-pink-200',
    borderColor: '#EC4899',
    accentColor: '#DB2777',
    textColor: '#9D174D',
    decoration: '💫',
    pattern: 'pink',
  },
  [CERTIFICATE_TYPES.CREATIVITY_STAR]: {
    id: CERTIFICATE_TYPES.CREATIVITY_STAR,
    name: '创意之星',
    icon: '💡',
    title: '创意之星',
    subtitle: '特别荣誉',
    description: '在2025寒假创赛营中展现出非凡的创造力和独特的思维方式荣获',
    bgGradient: 'from-violet-200 via-purple-100 to-violet-200',
    borderColor: '#8B5CF6',
    accentColor: '#7C3AED',
    textColor: '#5B21B6',
    decoration: '🚀',
    pattern: 'purple',
  },
  [CERTIFICATE_TYPES.ART_STAR]: {
    id: CERTIFICATE_TYPES.ART_STAR,
    name: '艺术之星',
    icon: '🎨',
    title: '艺术之星',
    subtitle: '特别荣誉',
    description: '在2025寒假创赛营中展现出卓越的艺术天赋和审美能力荣获',
    bgGradient: 'from-emerald-200 via-teal-100 to-emerald-200',
    borderColor: '#10B981',
    accentColor: '#059669',
    textColor: '#047857',
    decoration: '🌈',
    pattern: 'green',
  },
  [CERTIFICATE_TYPES.RANK_CERTIFICATE]: {
    id: CERTIFICATE_TYPES.RANK_CERTIFICATE,
    name: '段位认证',
    icon: '🎮',
    title: '段位认证',
    subtitle: '成长证书',
    description: '在2025寒假创赛营中通过不懈努力，成功达成段位目标荣获',
    bgGradient: 'from-indigo-200 via-blue-100 to-indigo-200',
    borderColor: '#6366F1',
    accentColor: '#4F46E5',
    textColor: '#3730A3',
    decoration: '🎯',
    pattern: 'indigo',
    dynamic: true,
  },
  [CERTIFICATE_TYPES.BEST_TEAM]: {
    id: CERTIFICATE_TYPES.BEST_TEAM,
    name: '最强战队',
    icon: '⚔️',
    title: '最强战队',
    subtitle: '团队荣誉',
    description: '在2025寒假创赛营中团结协作、奋勇拼搏，以优异的团队成绩荣获',
    bgGradient: 'from-red-200 via-orange-100 to-red-200',
    borderColor: '#EF4444',
    accentColor: '#DC2626',
    textColor: '#991B1B',
    decoration: '🔥',
    pattern: 'red',
    isTeam: true,
  },
};

// 获取所有学员奖状类型
export const getStudentCertificateTypes = () => {
  return Object.values(CERTIFICATE_TEMPLATES).filter(t => !t.isTeam);
};

// 获取所有战队奖状类型
export const getTeamCertificateTypes = () => {
  return Object.values(CERTIFICATE_TEMPLATES).filter(t => t.isTeam);
};

// 根据段位获取对应的奖状样式
export const getRankCertificateStyle = (rank) => {
  const rankStyles = {
    '萌新小白': { bgGradient: 'from-gray-200 via-slate-100 to-gray-200', borderColor: '#9CA3AF', accentColor: '#6B7280', textColor: '#374151' },
    '青铜学徒': { bgGradient: 'from-orange-200 via-amber-100 to-orange-200', borderColor: '#CD7F32', accentColor: '#92400E', textColor: '#78350F' },
    '白银战士': { bgGradient: 'from-slate-200 via-gray-100 to-slate-200', borderColor: '#C0C0C0', accentColor: '#6B7280', textColor: '#374151' },
    '黄金勇者': { bgGradient: 'from-amber-200 via-yellow-100 to-amber-200', borderColor: '#FFD700', accentColor: '#B45309', textColor: '#78350F' },
    '铂金精英': { bgGradient: 'from-cyan-200 via-teal-100 to-cyan-200', borderColor: '#00CED1', accentColor: '#0891B2', textColor: '#155E75' },
    '钻石大师': { bgGradient: 'from-blue-200 via-sky-100 to-blue-200', borderColor: '#00BFFF', accentColor: '#2563EB', textColor: '#1E40AF' },
    '星耀传说': { bgGradient: 'from-purple-200 via-violet-100 to-purple-200', borderColor: '#9B59B6', accentColor: '#7C3AED', textColor: '#5B21B6' },
    '王者荣耀': { bgGradient: 'from-red-200 via-rose-100 to-red-200', borderColor: '#FF6B6B', accentColor: '#DC2626', textColor: '#991B1B' },
    '最强王者': { bgGradient: 'from-amber-200 via-yellow-100 to-amber-200', borderColor: '#FFD700', accentColor: '#D97706', textColor: '#92400E' },
    '无敌战神': { bgGradient: 'from-pink-200 via-rose-100 to-pink-200', borderColor: '#FF1493', accentColor: '#DB2777', textColor: '#9D174D' },
  };
  return rankStyles[rank?.name] || rankStyles['萌新小白'];
};

// AI寄语 - 学生表现选项
export const STUDENT_TRAITS = {
  learning: {
    label: '学习态度',
    options: [
      { value: 'excellent', label: '非常认真', desc: '上课专注，积极思考' },
      { value: 'good', label: '态度端正', desc: '认真听讲，按时完成任务' },
      { value: 'improving', label: '进步明显', desc: '从不太专注到越来越认真' },
    ]
  },
  teamwork: {
    label: '团队协作',
    options: [
      { value: 'leader', label: '团队领袖', desc: '善于组织协调，带领团队' },
      { value: 'helper', label: '乐于助人', desc: '主动帮助同学，分享知识' },
      { value: 'cooperative', label: '配合默契', desc: '积极配合团队，完成任务' },
    ]
  },
  creativity: {
    label: '创造力',
    options: [
      { value: 'innovative', label: '创意十足', desc: '想法新颖，作品独特' },
      { value: 'curious', label: '好奇心强', desc: '爱提问，喜欢探索' },
      { value: 'practical', label: '动手能力强', desc: '善于实践，解决问题' },
    ]
  },
  personality: {
    label: '性格特点',
    options: [
      { value: 'cheerful', label: '开朗活泼', desc: '阳光自信，感染力强' },
      { value: 'calm', label: '沉稳内敛', desc: '冷静思考，稳扎稳打' },
      { value: 'persistent', label: '坚持不懈', desc: '遇到困难不放弃' },
    ]
  },
};

// 报告有效期（天）
export const REPORT_EXPIRE_DAYS = 30;
