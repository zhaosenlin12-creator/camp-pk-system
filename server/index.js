const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// 导入安全模块
const security = require('./security');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ============ 安全配置加载 ============
// 从加密文件加载敏感配置（绑定机器指纹，防止配置文件被盗用）
const secureConfig = security.loadSecureConfig();
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || secureConfig.DEEPSEEK_API_KEY;

// 启动时显示安全状态
console.log('🔐 安全模块已加载');
console.log(`   - 配置加密: AES-256-GCM`);
console.log(`   - 密码哈希: scrypt (N=16384)`);
console.log(`   - 机器绑定: ${security.getMachineFingerprint().slice(0, 16)}...`);

// 数据文件路径
const dbPath = path.join(__dirname, '../database/data.json');

// 确保数据库目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '../uploads/photos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `photo_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件 (jpg, png, gif, webp)'));
    }
  }
});

// 初始化数据
let db = {
  classes: [],
  teams: [],
  students: [],
  scoreLogs: [],
  lotteryLogs: [],
  rewards: [],
  punishments: [],
  reports: [],
  photos: [],
  certificates: [],
  nextId: { classes: 1, teams: 1, students: 1, scoreLogs: 1, lotteryLogs: 1, reports: 1, photos: 1, certificates: 1 }
};

// 加载数据
function loadDb() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      const loaded = JSON.parse(data);
      // 合并加载的数据，确保新字段存在
      db = {
        ...db,
        ...loaded,
        lotteryLogs: loaded.lotteryLogs || [],
        reports: loaded.reports || [],
        photos: loaded.photos || [],
        certificates: loaded.certificates || [],
        nextId: {
          ...db.nextId,
          ...loaded.nextId,
          lotteryLogs: loaded.nextId?.lotteryLogs || 1,
          reports: loaded.nextId?.reports || 1,
          photos: loaded.nextId?.photos || 1,
          certificates: loaded.nextId?.certificates || 1
        }
      };
    } else {
      // 初始化默认数据
      initDefaultData();
      saveDb();
    }
  } catch (err) {
    console.error('加载数据失败:', err);
    initDefaultData();
  }
}

// 保存数据（带防抖，避免高并发写入冲突）
let saveTimeout = null;
let pendingSave = false;

function saveDb() {
  pendingSave = true;
  
  // 防抖：100ms内的多次保存合并为一次
  if (saveTimeout) {
    return;
  }
  
  saveTimeout = setTimeout(() => {
    if (pendingSave) {
      try {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
      } catch (err) {
        console.error('保存数据失败:', err);
      }
      pendingSave = false;
    }
    saveTimeout = null;
  }, 100);
}

// 立即保存（用于关闭时）
function saveDbSync() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
    pendingSave = false;
  } catch (err) {
    console.error('保存数据失败:', err);
  }
}

// 初始化默认数据
function initDefaultData() {
  db.rewards = [
    { id: 1, name: '免作业神券', description: '可免除一次课后作业', icon: '📜', rarity: 'legendary', is_active: true },
    { id: 2, name: '老师小助手', description: '下节课担任老师小助手', icon: '🤝', rarity: 'epic', is_active: true },
    { id: 3, name: '座位自选权', description: '下节课可以选择任意座位', icon: '🪑', rarity: 'rare', is_active: true },
    { id: 4, name: '零食大礼包', description: '获得神秘零食一份', icon: '🍬', rarity: 'epic', is_active: true },
    { id: 5, name: '队长光环', description: '下节课担任战队临时队长', icon: '👑', rarity: 'rare', is_active: true },
    { id: 6, name: '提前下课券', description: '可提前5分钟下课', icon: '🏃', rarity: 'legendary', is_active: true },
    { id: 7, name: '点歌特权', description: '课间休息时可以点一首歌', icon: '🎵', rarity: 'common', is_active: true },
    { id: 8, name: '神秘盲盒', description: '获得一个神秘小礼物', icon: '📦', rarity: 'epic', is_active: true },
    { id: 9, name: '老师合影', description: '和老师拍一张搞怪合影', icon: '📸', rarity: 'rare', is_active: true },
    { id: 10, name: '荣誉勋章', description: '获得今天荣誉勋章贴纸', icon: '🏅', rarity: 'common', is_active: true },
    { id: 11, name: '优先展示权', description: '作品优先在班级展示，有加分', icon: '🌟', rarity: 'rare', is_active: true },
    { id: 12, name: '加分护盾', description: '下次扣分时可抵消', icon: '🛡️', rarity: 'legendary', is_active: true },
    { id: 13, name: '双倍积分卡', description: '下次加分时积分翻倍', icon: '✨', rarity: 'legendary', is_active: true },
    { id: 14, name: '指定惩罚权', description: '可指定输的队伍的惩罚内容', icon: '😎', rarity: 'epic', is_active: true },
    { id: 15, name: '课堂DJ', description: '负责控制课间音乐播放', icon: '🎧', rarity: 'rare', is_active: true }
  ];

  db.punishments = [
    { id: 1, name: '企鹅摇', description: '模仿可爱企鹅摇摆10秒', type: 'dance', icon: '🐧', animation_type: 'penguin', is_active: true },
    { id: 2, name: '科目三', description: '来一段魔性科目三舞蹈', type: 'dance', icon: '💃', animation_type: 'kemu3', is_active: true },
    { id: 3, name: '甩头舞', description: '跟着节奏甩起来', type: 'dance', icon: '🙆', animation_type: 'headshake', is_active: true },
    { id: 4, name: '机器人舞', description: '模仿机器人僵硬移动', type: 'dance', icon: '🤖', animation_type: 'robot', is_active: true },
    { id: 5, name: '海草舞', description: '像海草一样摇摆', type: 'dance', icon: '🌿', animation_type: 'seaweed', is_active: true },
    { id: 6, name: '真心话-偶像', description: '说出你最喜欢的偶像是谁，为什么', type: 'truth', icon: '💭', is_active: true },
    { id: 7, name: '真心话-糗事', description: '分享一件你觉得搞笑的糗事', type: 'truth', icon: '😅', is_active: true },
    { id: 8, name: '真心话-梦想', description: '说出你长大后想做什么', type: 'truth', icon: '🌈', is_active: true },
    { id: 9, name: '真心话-夸夸', description: '真诚地夸一夸旁边的同学', type: 'truth', icon: '💖', is_active: true },
    { id: 10, name: '真心话-老师', description: '说出你觉得老师最有趣的一点', type: 'truth', icon: '👨‍🏫', is_active: true },
    { id: 11, name: '大冒险-表情包', description: '模仿3个不同的表情包', type: 'dare', icon: '🤪', is_active: true },
    { id: 12, name: '大冒险-动物叫', description: '模仿3种动物的叫声', type: 'dare', icon: '🐱', is_active: true },
    { id: 13, name: '大冒险-绕口令', description: '快速说一段绕口令', type: 'dare', icon: '👅', is_active: true },
    { id: 14, name: '大冒险-才艺', description: '表演一个你的小才艺', type: 'dare', icon: '🎭', is_active: true },
    { id: 15, name: '大冒险-广告', description: '用夸张的方式推销你的铅笔', type: 'dare', icon: '📢', is_active: true },
    { id: 16, name: '大冒险-配音', description: '给老师指定的画面配音', type: 'dare', icon: '🎬', is_active: true },
    { id: 17, name: '定格挑战', description: '保持一个搞笑姿势10秒不动', type: 'challenge', icon: '🗿', is_active: true },
    { id: 18, name: '憋笑挑战', description: '全班逗你笑，坚持15秒', type: 'challenge', icon: '😐', is_active: true },
    { id: 19, name: '反应挑战', description: '老师说相反的动作你要做对', type: 'challenge', icon: '🔄', is_active: true },
    { id: 20, name: '单脚站立', description: '单脚站立背诵一首古诗', type: 'challenge', icon: '🦩', is_active: true },
    { id: 21, name: '慢动作', description: '用超级慢动作跑步', type: 'challenge', icon: '🐌', is_active: true },
    { id: 22, name: '成语表演', description: '用肢体语言表演一个成语让大家猜', type: 'challenge', icon: '🎭', is_active: true }
  ];
}

// 加载数据
loadDb();

// ============ 安全中间件 ============

// 基础安全头（生产环境使用完整配置，开发环境简化）
if (isProduction) {
  app.use(helmet(security.getHelmetConfig()));
} else {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
}

// API 请求频率限制（更严格的配置）
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: isProduction ? 60 : 100, // 生产环境更严格
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  // 跳过静态资源
  skip: (req) => req.path.startsWith('/assets') || req.path.startsWith('/videos'),
  // 使用IP + User-Agent作为标识（更准确）
  keyGenerator: (req) => {
    return req.ip + ':' + (req.headers['user-agent'] || 'unknown').slice(0, 50);
  }
});

// 管理员验证频率限制（防暴力破解 - 更严格）
const adminLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30分钟
  max: 5, // 最多5次尝试
  message: { error: '密码尝试次数过多，请30分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功的请求不计入限制
});

// AI API 频率限制（防止滥用）
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 10, // 每分钟最多10次AI请求
  message: { error: 'AI请求过于频繁，请稍后再试' },
});

// CORS配置（使用安全模块的配置）
app.use(cors(security.getCorsConfig(isProduction)));

app.use(express.json({ limit: '1mb' })); // 限制请求体大小
app.use('/api', apiLimiter); // API请求限制

// 静态文件缓存
const staticOptions = {
  maxAge: isProduction ? '1d' : 0,
  etag: true
};
app.use(express.static(path.join(__dirname, '../client/dist'), staticOptions));
app.use('/videos', express.static(path.join(__dirname, '../public/videos'), { maxAge: '7d' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '7d' }));

// ============ 输入验证辅助函数 ============
const sanitizeString = (str, maxLength = 50) => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength).replace(/[<>]/g, '');
};

const validateId = (id) => {
  const parsed = parseInt(id);
  return !isNaN(parsed) && parsed > 0 ? parsed : null;
};

// ============ 班级管理 API ============

app.get('/api/classes', (req, res) => {
  res.json(db.classes);
});

app.post('/api/classes', (req, res) => {
  const name = sanitizeString(req.body.name, 30);
  if (!name) {
    return res.status(400).json({ error: '班级名称不能为空' });
  }
  const newClass = {
    id: db.nextId.classes++,
    name,
    created_at: new Date().toISOString()
  };
  db.classes.unshift(newClass);
  saveDb();
  res.json(newClass);
});

app.delete('/api/classes/:id', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的班级ID' });
  
  db.students = db.students.filter(s => s.class_id !== id);
  db.teams = db.teams.filter(t => t.class_id !== id);
  db.lotteryLogs = db.lotteryLogs.filter(l => l.class_id !== id);
  db.classes = db.classes.filter(c => c.id !== id);
  saveDb();
  res.json({ success: true });
});

// ============ 战队管理 API ============

app.get('/api/classes/:classId/teams', (req, res) => {
  const classId = validateId(req.params.classId);
  if (!classId) return res.status(400).json({ error: '无效的班级ID' });
  
  const teams = db.teams.filter(t => t.class_id === classId);
  res.json(teams);
});

app.post('/api/teams', (req, res) => {
  const name = sanitizeString(req.body.name, 20);
  const class_id = validateId(req.body.class_id);
  const color = sanitizeString(req.body.color, 20) || '#FF6B6B';
  
  if (!name || !class_id) {
    return res.status(400).json({ error: '战队名称和班级ID不能为空' });
  }
  
  const newTeam = {
    id: db.nextId.teams++,
    name,
    class_id,
    color,
    score: 0,
    created_at: new Date().toISOString()
  };
  db.teams.push(newTeam);
  saveDb();
  res.json(newTeam);
});

app.patch('/api/teams/:id/score', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的战队ID' });
  
  const delta = parseInt(req.body.delta);
  if (isNaN(delta) || delta < -1000 || delta > 1000) {
    return res.status(400).json({ error: '积分变化值无效' });
  }
  const reason = sanitizeString(req.body.reason, 100);
  
  const team = db.teams.find(t => t.id === id);
  if (team) {
    team.score += delta;
    db.scoreLogs.push({
      id: db.nextId.scoreLogs++,
      team_id: id,
      delta,
      reason,
      type: 'team',
      created_at: new Date().toISOString()
    });
    saveDb();
    res.json(team);
  } else {
    res.status(404).json({ error: 'Team not found' });
  }
});

app.delete('/api/teams/:id', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的战队ID' });
  
  db.students.forEach(s => {
    if (s.team_id === id) s.team_id = null;
  });
  db.teams = db.teams.filter(t => t.id !== id);
  saveDb();
  res.json({ success: true });
});

// ============ 学员管理 API ============

app.get('/api/classes/:classId/students', (req, res) => {
  const classId = validateId(req.params.classId);
  if (!classId) return res.status(400).json({ error: '无效的班级ID' });
  
  const students = db.students
    .filter(s => s.class_id === classId)
    .map(s => {
      const team = db.teams.find(t => t.id === s.team_id);
      return {
        ...s,
        team_name: team?.name || null,
        team_color: team?.color || null
      };
    })
    .sort((a, b) => b.score - a.score);
  res.json(students);
});

app.post('/api/students', (req, res) => {
  const name = sanitizeString(req.body.name, 20);
  const class_id = validateId(req.body.class_id);
  const team_id = req.body.team_id ? validateId(req.body.team_id) : null;
  const avatar = sanitizeString(req.body.avatar, 10) || '🎮';
  
  if (!name || !class_id) {
    return res.status(400).json({ error: '学员名称和班级ID不能为空' });
  }
  
  const newStudent = {
    id: db.nextId.students++,
    name,
    class_id,
    team_id,
    score: 0,
    avatar,
    created_at: new Date().toISOString()
  };
  db.students.push(newStudent);
  saveDb();
  res.json(newStudent);
});

app.patch('/api/students/:id', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的学员ID' });
  
  const name = sanitizeString(req.body.name, 20);
  const team_id = req.body.team_id ? validateId(req.body.team_id) : null;
  const avatar = sanitizeString(req.body.avatar, 10);
  
  const student = db.students.find(s => s.id === id);
  if (student) {
    if (name) student.name = name;
    student.team_id = team_id;
    if (avatar) student.avatar = avatar;
    saveDb();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Student not found' });
  }
});

app.patch('/api/students/:id/score', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的学员ID' });
  
  const delta = parseInt(req.body.delta);
  if (isNaN(delta) || delta < -1000 || delta > 1000) {
    return res.status(400).json({ error: '积分变化值无效（范围：-1000到1000）' });
  }
  const reason = sanitizeString(req.body.reason, 100);
  
  const student = db.students.find(s => s.id === id);
  if (student) {
    student.score += delta;
    
    db.scoreLogs.push({
      id: db.nextId.scoreLogs++,
      student_id: id,
      delta,
      reason,
      type: 'student',
      created_at: new Date().toISOString()
    });
    
    // 同步更新战队积分
    if (student.team_id) {
      const team = db.teams.find(t => t.id === student.team_id);
      if (team) {
        team.score += delta;
      }
    }
    
    saveDb();
    res.json(student);
  } else {
    res.status(404).json({ error: 'Student not found' });
  }
});

app.delete('/api/students/:id', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的学员ID' });
  
  db.students = db.students.filter(s => s.id !== id);
  saveDb();
  res.json({ success: true });
});

// ============ 排行榜 API ============

app.get('/api/classes/:classId/leaderboard/students', (req, res) => {
  const classId = parseInt(req.params.classId);
  const students = db.students
    .filter(s => s.class_id === classId)
    .map(s => {
      const team = db.teams.find(t => t.id === s.team_id);
      return {
        ...s,
        team_name: team?.name || null,
        team_color: team?.color || null
      };
    })
    .sort((a, b) => b.score - a.score);
  res.json(students);
});

app.get('/api/classes/:classId/leaderboard/teams', (req, res) => {
  const classId = parseInt(req.params.classId);
  const teams = db.teams
    .filter(t => t.class_id === classId)
    .map(t => ({
      ...t,
      member_count: db.students.filter(s => s.team_id === t.id).length
    }))
    .sort((a, b) => b.score - a.score);
  res.json(teams);
});

// ============ 奖惩配置 API ============

app.get('/api/rewards', (req, res) => {
  res.json(db.rewards.filter(r => r.is_active));
});

app.get('/api/punishments', (req, res) => {
  res.json(db.punishments.filter(p => p.is_active));
});

// ============ 抽奖记录 API ============

// 获取抽奖记录
app.get('/api/classes/:classId/lottery-logs', (req, res) => {
  const classId = parseInt(req.params.classId);
  const { date, type } = req.query;
  
  let logs = db.lotteryLogs.filter(l => l.class_id === classId);
  
  // 按日期筛选
  if (date) {
    logs = logs.filter(l => l.created_at.startsWith(date));
  }
  
  // 按类型筛选
  if (type && type !== 'all') {
    logs = logs.filter(l => l.type === type);
  }
  
  // 按时间倒序
  logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json(logs);
});

// 添加抽奖记录
app.post('/api/lottery-logs', (req, res) => {
  const { class_id, team_id, team_name, type, item_name, item_icon } = req.body;
  
  const newLog = {
    id: db.nextId.lotteryLogs++,
    class_id,
    team_id: team_id || null,
    team_name: team_name || '未指定战队',
    type, // 'reward' 或 'punishment'
    item_name,
    item_icon,
    created_at: new Date().toISOString()
  };
  
  db.lotteryLogs.push(newLog);
  saveDb();
  res.json(newLog);
});

// 清空班级抽奖记录
app.delete('/api/classes/:classId/lottery-logs', (req, res) => {
  const classId = parseInt(req.params.classId);
  db.lotteryLogs = db.lotteryLogs.filter(l => l.class_id !== classId);
  saveDb();
  res.json({ success: true });
});

// ============ 管理员验证 ============

// 验证管理员密码（使用安全哈希比较）
app.post('/api/admin/verify', adminLimiter, (req, res) => {
  const pin = sanitizeString(req.body.pin, 20);
  
  // 使用哈希验证（防止时序攻击）
  let isValid = false;
  
  if (secureConfig.ADMIN_PIN_HASH) {
    // 使用哈希验证
    isValid = security.verifyPassword(pin, secureConfig.ADMIN_PIN_HASH);
  } else {
    // 兼容旧配置：直接比较后升级为哈希
    const plainPin = process.env.ADMIN_PIN || secureConfig.ADMIN_PIN || '980116';
    isValid = pin === plainPin;
    
    // 首次验证成功后，升级为哈希存储
    if (isValid && !secureConfig.ADMIN_PIN_HASH) {
      secureConfig.ADMIN_PIN_HASH = security.hashPassword(plainPin);
      security.saveSecureConfig(secureConfig);
      console.log('✅ 管理员密码已升级为安全哈希存储');
    }
  }
  
  // 添加随机延迟（50-150ms），进一步防止时序攻击
  const delay = 50 + Math.random() * 100;
  setTimeout(() => {
    res.json({ success: isValid });
  }, delay);
});

// 修改管理员密码
app.post('/api/admin/change-password', adminLimiter, (req, res) => {
  const { currentPin, newPin } = req.body;
  const current = sanitizeString(currentPin, 20);
  const newPassword = sanitizeString(newPin, 20);
  
  if (!current || !newPassword) {
    return res.status(400).json({ error: '请提供当前密码和新密码' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少6位' });
  }
  
  // 验证当前密码
  let isValid = false;
  if (secureConfig.ADMIN_PIN_HASH) {
    isValid = security.verifyPassword(current, secureConfig.ADMIN_PIN_HASH);
  } else {
    isValid = current === (secureConfig.ADMIN_PIN || '980116');
  }
  
  if (!isValid) {
    return res.status(401).json({ error: '当前密码错误' });
  }
  
  // 更新密码
  secureConfig.ADMIN_PIN_HASH = security.hashPassword(newPassword);
  secureConfig.ADMIN_PIN = null; // 清除明文密码
  
  if (security.saveSecureConfig(secureConfig)) {
    console.log('✅ 管理员密码已更新');
    res.json({ success: true, message: '密码修改成功' });
  } else {
    res.status(500).json({ error: '保存失败，请重试' });
  }
});

// ============ 结营报告相关 API ============

// 获取学员积分记录
app.get('/api/students/:id/score-logs', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的学员ID' });
  
  const logs = db.scoreLogs
    .filter(log => log.student_id === id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json(logs);
});

// AI生成老师寄语（添加频率限制）
app.post('/api/ai/generate-comment', aiLimiter, async (req, res) => {
  const { studentInfo, customPrompt } = req.body;
  
  if (!studentInfo || !studentInfo.name) {
    return res.status(400).json({ error: '缺少学员信息' });
  }

  try {
    // 构建提示词
    const systemPrompt = `你是一位温暖、有爱心的编程营老师。请根据学员的表现数据，生成一段个性化的结营寄语。
要求：
1. 语气温暖、鼓励、积极向上
2. 适合小学生阅读，用词简单易懂
3. 字数控制在100-150字
4. 可以适当使用emoji表情
5. 要针对学员的具体表现进行点评`;

    const userPrompt = `学员信息：
- 姓名：${studentInfo.name}
- 最终积分：${studentInfo.score}分
- 段位：${studentInfo.rank?.name || '未知'}
- 所属战队：${studentInfo.teamName || '无'}
- 积分记录摘要：获得${studentInfo.scoreLogs?.filter(l => l.delta > 0).length || 0}次奖励，${studentInfo.scoreLogs?.filter(l => l.delta < 0).length || 0}次扣分

${customPrompt ? `老师的额外要求：${customPrompt}` : ''}

请生成老师寄语：`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('DeepSeek API错误:', error);
      return res.status(500).json({ error: 'AI服务暂时不可用，请稍后重试' });
    }

    const data = await response.json();
    const comment = data.choices?.[0]?.message?.content?.trim();
    
    if (!comment) {
      return res.status(500).json({ error: 'AI生成失败，请重试' });
    }

    res.json({ comment });
  } catch (err) {
    console.error('AI生成错误:', err);
    res.status(500).json({ error: 'AI服务出错，请稍后重试' });
  }
});

// ============ 结营报告 API ============

// 生成短ID
function generateShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 保存报告
app.post('/api/reports', (req, res) => {
  const { student_id, class_id, photos, ai_comment, traits, teacher_name } = req.body;
  
  if (!student_id || !class_id) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const student = db.students.find(s => s.id === student_id);
  if (!student) {
    return res.status(404).json({ error: '学员不存在' });
  }

  const shortId = generateShortId();
  const newReport = {
    id: db.nextId.reports++,
    short_id: shortId,
    student_id,
    class_id,
    student_name: student.name,
    student_avatar: student.avatar,
    student_score: student.score,
    team_id: student.team_id,
    team_name: student.team_name,
    photos: photos || [],
    ai_comment: ai_comment || '',
    teacher_name: teacher_name || '老师',
    traits: traits || {},
    created_at: new Date().toISOString()
  };

  // 获取积分记录
  newReport.score_logs = db.scoreLogs
    .filter(log => log.student_id === student_id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);

  db.reports.push(newReport);
  saveDb();
  
  res.json({ id: shortId, report: newReport });
});

// 报告有效期（天）
const REPORT_EXPIRE_DAYS = 30;

// 获取报告（通过短ID）
app.get('/api/reports/:shortId', (req, res) => {
  const { shortId } = req.params;
  const report = db.reports.find(r => r.short_id === shortId);
  
  if (!report) {
    return res.status(404).json({ error: '报告不存在' });
  }

  // 服务端检查报告是否过期
  const createdAt = new Date(report.created_at);
  const now = new Date();
  const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  
  if (diffDays > REPORT_EXPIRE_DAYS) {
    return res.status(410).json({ error: '报告已过期', expired: true, expireDays: REPORT_EXPIRE_DAYS });
  }

  // 获取班级信息
  const classInfo = db.classes.find(c => c.id === report.class_id);
  
  res.json({
    ...report,
    class_name: classInfo?.name || ''
  });
});

// SPA路由处理
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// ============ 全局错误处理 ============
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误，请稍后再试' });
});

// 未捕获的异常处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  // 保存数据后退出
  saveDbSync();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在保存数据...');
  saveDbSync();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在保存数据...');
  saveDbSync();
  process.exit(0);
});

// 获取本机IP
const os = require('os');
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('');
  console.log('🎮 创赛营积分PK系统已启动！');
  console.log(`📍 环境: ${isProduction ? '生产' : '开发'}`);
  console.log('');
  console.log(`📺 大屏展示: http://${localIP}:${PORT}`);
  console.log(`🔧 管理后台: http://${localIP}:${PORT}/admin`);
  console.log(`💻 本机访问: http://localhost:${PORT}`);
  console.log('');
});
