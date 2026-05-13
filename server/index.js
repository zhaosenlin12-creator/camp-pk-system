const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// 导入安全模块
const security = require('./security');
const CLASS_PET_CATALOG = require('./classPetCatalogPremium');
const {
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  DEFAULT_QUESTION_COUNT,
  SUBJECT_OPTIONS,
  GRADE_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  QUICK_TEMPLATES,
  clampQuestionCount,
  findTemplate,
  generatePresetQuestions
} = require('./tugOfWarQuestionBank');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// API 数据需要始终拿最新结果，避免浏览器把宠物目录等接口缓存成旧值。
app.set('etag', false);

// 信任一层反向代理（nginx），避免 trust proxy=true 过于宽松导致限流告警
app.set('trust proxy', 1);

// ============ 安全配置加载 ============
// 从加密文件加载敏感配置（绑定机器指纹，防止配置文件被盗用）
const secureConfig = security.loadSecureConfig();
const getEnvAdminPin = () => (
  typeof process.env.ADMIN_PIN === 'string'
    ? process.env.ADMIN_PIN.trim().slice(0, 20)
    : ''
);
const isAdminPinManagedByEnv = () => Boolean(getEnvAdminPin());
const syncAdminPinHashFromEnv = () => {
  const envPin = getEnvAdminPin();
  if (!envPin) return;

  if (secureConfig.ADMIN_PIN_HASH && security.verifyPassword(envPin, secureConfig.ADMIN_PIN_HASH)) {
    if (secureConfig.ADMIN_PIN) {
      secureConfig.ADMIN_PIN = null;
      security.saveSecureConfig(secureConfig);
    }
    return;
  }

  secureConfig.ADMIN_PIN_HASH = security.hashPassword(envPin);
  secureConfig.ADMIN_PIN = null;

  if (security.saveSecureConfig(secureConfig)) {
    console.log('🔐 ADMIN_PIN 环境变量已同步为安全哈希配置');
  } else {
    console.warn('⚠️ ADMIN_PIN 环境变量未能写入加密配置，请检查 .secrets.enc');
  }
};

syncAdminPinHashFromEnv();

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY
  || process.env.MINMAX_API_KEY
  || process.env.MINIMAX_KEY
  || process.env.MINIMAX2_7_API_KEY
  || secureConfig.MINIMAX_API_KEY
  || secureConfig.MINMAX_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
  || process.env.DEEPSEEK_KEY
  || secureConfig.DEEPSEEK_API_KEY
  || secureConfig.DEEPSEEK_KEY;
const AI_QUESTION_TIMEOUT_MS = Number(process.env.AI_QUESTION_TIMEOUT_MS) > 0
  ? Math.min(30000, Number(process.env.AI_QUESTION_TIMEOUT_MS))
  : 18000;
const LIVE_BATTLE_AI_TOPUP_TIMEOUT_MS = Math.max(3000, Math.min(3500, AI_QUESTION_TIMEOUT_MS));
const LIVE_BATTLE_AI_TOPUP_MAX_ROUNDS = 1;
const LIVE_BATTLE_AI_TOPUP_BATCH_SIZE = 6;
const TUG_OF_WAR_DURATION_SEC = 180;
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

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
  ratingSessions: [],
  ratingVotes: [],
  pkQuestionBanks: [],
  nextId: {
    classes: 1,
    teams: 1,
    students: 1,
    scoreLogs: 1,
    lotteryLogs: 1,
    reports: 1,
    photos: 1,
    certificates: 1,
    ratingSessions: 1,
    ratingVotes: 1,
    pkQuestionBanks: 1
  }
};

const LOTTERY_PET_EFFECT_FIELDS = [
  'pet_growth_delta',
  'pet_satiety_delta',
  'pet_mood_delta',
  'pet_cleanliness_delta'
];

const LOTTERY_PET_SLOT_EFFECT_FIELDS = [
  'pet_bonus_slot_delta'
];

const DEFAULT_REWARD_SEED = [
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
  { id: 15, name: '课堂DJ', description: '负责控制课间音乐播放', icon: '🎧', rarity: 'rare', is_active: true },
  { id: 16, name: '工程喵加餐包', description: '工程车宠物补满能量，马上更愿意成长。', icon: '🥫', rarity: 'common', is_active: true, score_delta: 6, pet_growth_delta: 8, pet_satiety_delta: 18 },
  { id: 17, name: '巡航燃料箱', description: '给工程车系列宠物追加推进燃料，积分和成长同步上涨。', icon: '⛽', rarity: 'rare', is_active: true, score_delta: 8, pet_growth_delta: 14, pet_mood_delta: 6 },
  { id: 18, name: '维修小扳手', description: '帮宠物做一次快速检修，清洁和成长都能回暖。', icon: '🛠️', rarity: 'rare', is_active: true, pet_growth_delta: 10, pet_cleanliness_delta: 16 },
  { id: 19, name: '云梯观星夜', description: '云梯宠物一起看星空，心情会明显变好。', icon: '🌌', rarity: 'legendary', is_active: true, score_delta: 12, pet_growth_delta: 16, pet_mood_delta: 18 },
  { id: 20, name: '守护装甲贴片', description: '机甲伙伴换上新装甲，成长和状态都更稳。', icon: '🧩', rarity: 'epic', is_active: true, pet_growth_delta: 12, pet_mood_delta: 8, pet_cleanliness_delta: 10 },
  { id: 21, name: '施工徽章贴纸', description: '拿到工程宠物专属徽章，课堂积分也会顺手提升。', icon: '🚧', rarity: 'common', is_active: true, score_delta: 5, pet_growth_delta: 6 },
  { id: 22, name: '机甲能量芯片', description: '战术机甲装上新芯片，培养力和饱腹一起上涨。', icon: '🔋', rarity: 'epic', is_active: true, score_delta: 10, pet_growth_delta: 18, pet_satiety_delta: 8 },
  { id: 23, name: '宠物午睡补给', description: '让宠物安静休息一会儿，心情和饱腹都会回升。', icon: '💤', rarity: 'common', is_active: true, pet_satiety_delta: 10, pet_mood_delta: 14 },
  { id: 24, name: '神秘宠物蛋入场券', description: '给当前学员额外解锁 1 个宠物位，可再领一只宠物蛋。', icon: '🥚', rarity: 'legendary', is_active: true, pet_bonus_slot_delta: 1, draw_weight: 1 },
  { id: 25, name: '成长加速包', description: '宠物成长、心情和课堂积分一起上涨。', icon: '🚀', rarity: 'rare', is_active: true, score_delta: 8, pet_growth_delta: 12, pet_mood_delta: 10 },
  { id: 26, name: '闪亮护理站', description: '给宠物做一次高级护理，清洁和状态都会更稳。', icon: '🧼', rarity: 'common', is_active: true, pet_growth_delta: 6, pet_cleanliness_delta: 18, pet_mood_delta: 6 }
];

const DEFAULT_PUNISHMENT_SEED = [
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
  { id: 22, name: '成语表演', description: '用肢体语言表演一个成语让大家猜', type: 'challenge', icon: '🎭', is_active: true },
  { id: 23, name: '真心话-吐槽', description: '攻击老师最薄弱的地方（友善吐槽）', type: 'truth', icon: '🎯', is_active: true },
  { id: 24, name: '大冒险-表白', description: '给父母打电话说"我爱你"', type: 'dare', icon: '📞', is_active: true },
  { id: 25, name: '熄火检修日', description: '工程车宠物临时熄火，课堂积分和培养力都会掉一点。', type: 'challenge', icon: '🧯', is_active: true, score_delta: -6, pet_growth_delta: -10, pet_mood_delta: -8 },
  { id: 26, name: '泥点飞溅', description: '宠物被泥点扑了一身，清洁值明显下降。', type: 'challenge', icon: '🪣', is_active: true, score_delta: -4, pet_cleanliness_delta: -18 },
  { id: 27, name: '电量告急', description: '机甲伙伴能量不足，分数、饱腹和成长一起下滑。', type: 'challenge', icon: '🔌', is_active: true, score_delta: -8, pet_growth_delta: -8, pet_satiety_delta: -10 },
  { id: 28, name: '情绪警报', description: '宠物闹情绪，心情值快速下降。', type: 'challenge', icon: '🚨', is_active: true, score_delta: -5, pet_mood_delta: -16 },
  { id: 29, name: '训练偷懒税', description: '少练了一轮，培养力和课堂积分要补交。', type: 'challenge', icon: '😴', is_active: true, score_delta: -10, pet_growth_delta: -12 },
  { id: 30, name: '机械零件散落', description: '零件撒了一地，宠物的清洁和心情都受影响。', type: 'challenge', icon: '⚙️', is_active: true, pet_growth_delta: -8, pet_mood_delta: -6, pet_cleanliness_delta: -10 },
  { id: 31, name: '战术迷路日', description: '战术伙伴迷路了，状态和分数都要掉一点。', type: 'challenge', icon: '🧭', is_active: true, score_delta: -6, pet_satiety_delta: -8, pet_mood_delta: -12 },
  { id: 32, name: '宠物打瞌睡', description: '照料节奏断了一下，成长和心情都会回落。', type: 'challenge', icon: '😵', is_active: true, score_delta: -4, pet_growth_delta: -6, pet_mood_delta: -10 },
  { id: 33, name: '泡泡机故障', description: '刚整理好的宠物又被弄脏了，清洁值明显下降。', type: 'challenge', icon: '🫧', is_active: true, score_delta: -3, pet_cleanliness_delta: -14 }
];

function readLotteryCatalogNumber(value, fallback = 0, mode = 'int') {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (mode === 'score') {
    return Math.round(parsed * 10) / 10;
  }
  return Math.round(parsed);
}

function normalizeLotteryCatalogText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

function normalizeLotteryCatalogItem(item = {}, kind = 'reward') {
  const normalized = {
    ...item,
    id: Number.isFinite(Number(item?.id)) && Number(item.id) > 0 ? Math.floor(Number(item.id)) : null,
    name: normalizeLotteryCatalogText(item?.name, kind === 'reward' ? '神秘奖励' : '神秘惩罚'),
    description: normalizeLotteryCatalogText(item?.description, ''),
    icon: normalizeLotteryCatalogText(item?.icon, kind === 'reward' ? '🎁' : '🎭'),
    is_active: item?.is_active !== false,
    draw_weight: readLotteryCatalogNumber(item?.draw_weight, 0),
    score_delta: readLotteryCatalogNumber(item?.score_delta, 0, 'score'),
    pet_growth_delta: readLotteryCatalogNumber(item?.pet_growth_delta, 0),
    pet_satiety_delta: readLotteryCatalogNumber(item?.pet_satiety_delta, 0),
    pet_mood_delta: readLotteryCatalogNumber(item?.pet_mood_delta, 0),
    pet_cleanliness_delta: readLotteryCatalogNumber(item?.pet_cleanliness_delta, 0),
    pet_bonus_slot_delta: readLotteryCatalogNumber(item?.pet_bonus_slot_delta, 0)
  };

  if (kind === 'reward') {
    normalized.rarity = normalizeLotteryCatalogText(item?.rarity, 'common');
  } else {
    normalized.type = normalizeLotteryCatalogText(item?.type, 'challenge');
    if (item?.animation_type) {
      normalized.animation_type = normalizeLotteryCatalogText(item.animation_type);
    } else {
      delete normalized.animation_type;
    }
  }

  return normalized;
}

function mergeSeededLotteryCatalogItems(existingItems = [], seedItems = [], kind = 'reward') {
  const currentItems = Array.isArray(existingItems) ? existingItems : [];
  const seedById = new Map(seedItems.map((item) => [Number(item.id), normalizeLotteryCatalogItem(item, kind)]));
  const usedIds = new Set();
  let nextId = Math.max(
    0,
    ...seedItems.map((item) => Number(item.id) || 0),
    ...currentItems.map((item) => Number(item?.id) || 0)
  ) + 1;

  const merged = currentItems.map((item) => {
    const rawId = Number(item?.id);
    const defaultItem = Number.isFinite(rawId) ? seedById.get(rawId) : null;
    const normalized = normalizeLotteryCatalogItem(defaultItem ? { ...defaultItem, ...item } : item, kind);
    if (!normalized.id || usedIds.has(normalized.id)) {
      normalized.id = nextId++;
    }
    usedIds.add(normalized.id);
    return normalized;
  });

  seedItems.forEach((item) => {
    const seedId = Number(item.id);
    if (!usedIds.has(seedId)) {
      merged.push(normalizeLotteryCatalogItem(item, kind));
      usedIds.add(seedId);
    }
  });

  merged.sort((a, b) => a.id - b.id);

  return {
    items: merged,
    changed: JSON.stringify(currentItems) !== JSON.stringify(merged)
  };
}

function upgradeLotteryCatalogs() {
  const rewardResult = mergeSeededLotteryCatalogItems(db.rewards, DEFAULT_REWARD_SEED, 'reward');
  const punishmentResult = mergeSeededLotteryCatalogItems(db.punishments, DEFAULT_PUNISHMENT_SEED, 'punishment');

  db.rewards = rewardResult.items;
  db.punishments = punishmentResult.items;

  return rewardResult.changed || punishmentResult.changed;
}

// 加载数据
function loadDb() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      const loaded = JSON.parse(data);
      const loadedPkBanks = Array.isArray(loaded.pkQuestionBanks) ? loaded.pkQuestionBanks : [];
      const maxPkBankId = loadedPkBanks.reduce((maxId, item) => {
        const id = Number(item?.id);
        return Number.isFinite(id) ? Math.max(maxId, id) : maxId;
      }, 0);
      // 合并加载的数据，确保新字段存在
      db = {
        ...db,
        ...loaded,
        lotteryLogs: loaded.lotteryLogs || [],
        reports: loaded.reports || [],
        photos: loaded.photos || [],
        certificates: loaded.certificates || [],
        ratingSessions: loaded.ratingSessions || [],
        ratingVotes: loaded.ratingVotes || [],
        pkQuestionBanks: loadedPkBanks,
        nextId: {
          ...db.nextId,
          ...loaded.nextId,
          lotteryLogs: loaded.nextId?.lotteryLogs || 1,
          reports: loaded.nextId?.reports || 1,
          photos: loaded.nextId?.photos || 1,
          certificates: loaded.nextId?.certificates || 1,
          ratingSessions: loaded.nextId?.ratingSessions || 1,
          ratingVotes: loaded.nextId?.ratingVotes || 1,
          pkQuestionBanks: Math.max(loaded.nextId?.pkQuestionBanks || 1, maxPkBankId + 1)
        }
      };

      if (upgradeLotteryCatalogs()) {
        saveDb();
      }
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

// 保存数据（带防抖和队列，避免高并发写入冲突）
let saveTimeout = null;
let pendingSave = false;
let isSaving = false;

function saveDb() {
  pendingSave = true;
  
  // 防抖：300ms内的多次保存合并为一次（增加防抖时间）
  if (saveTimeout) {
    return;
  }
  
  saveTimeout = setTimeout(async () => {
    if (pendingSave && !isSaving) {
      isSaving = true;
      try {
        // 先写入临时文件，再重命名（原子操作，防止写入中断导致数据损坏）
        const tempPath = dbPath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
        fs.renameSync(tempPath, dbPath);
      } catch (err) {
        console.error('保存数据失败:', err);
      } finally {
        isSaving = false;
        pendingSave = false;
      }
    }
    saveTimeout = null;
  }, 300);
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

function uniqueStrings(values = []) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))];
}

function getReportPhotoUrls(report) {
  return uniqueStrings(Array.isArray(report?.photos) ? report.photos : []);
}

function removeUnusedReportPhotos(photoUrls = []) {
  const removableCandidates = uniqueStrings(photoUrls);
  if (!removableCandidates.length) {
    return 0;
  }

  const stillReferenced = new Set(
    db.reports.flatMap((report) => getReportPhotoUrls(report))
  );

  const removableUrls = removableCandidates.filter((url) => !stillReferenced.has(url));
  if (!removableUrls.length) {
    return 0;
  }

  const removableUrlSet = new Set(removableUrls);
  const removablePhotos = db.photos.filter((photo) => removableUrlSet.has(photo.url));
  const removableFilenames = new Set(
    removableUrls.map((url) => path.basename(url || '')).filter(Boolean)
  );

  db.photos = db.photos.filter((photo) => !removableUrlSet.has(photo.url));

  removablePhotos.forEach((photo) => {
    removableFilenames.add(photo.filename || path.basename(photo.url || ''));
  });

  removableFilenames.forEach((filename) => {
    const filePath = path.join(uploadsDir, filename);
    if (!filename || !fs.existsSync(filePath)) {
      return;
    }

    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.warn(`Failed to remove uploaded photo ${filename}:`, error.message);
    }
  });

  return removableFilenames.size;
}

function deleteReportsByMatcher(matcher) {
  const reportsToDelete = db.reports.filter(matcher);
  if (!reportsToDelete.length) {
    return { deletedReports: 0, deletedPhotos: 0 };
  }

  db.reports = db.reports.filter((report) => !matcher(report));

  const deletedPhotos = removeUnusedReportPhotos(
    reportsToDelete.flatMap((report) => getReportPhotoUrls(report))
  );

  return {
    deletedReports: reportsToDelete.length,
    deletedPhotos
  };
}

function deleteRatingSessionsByMatcher(matcher) {
  const sessionIds = db.ratingSessions
    .filter(matcher)
    .map((session) => session.id);

  if (!sessionIds.length) {
    return { deletedSessions: 0, deletedVotes: 0 };
  }

  const sessionIdSet = new Set(sessionIds);
  const deletedVotes = db.ratingVotes.filter((vote) => sessionIdSet.has(vote.session_id)).length;

  db.ratingVotes = db.ratingVotes.filter((vote) => !sessionIdSet.has(vote.session_id));
  db.ratingSessions = db.ratingSessions.filter((session) => !sessionIdSet.has(session.id));

  return {
    deletedSessions: sessionIds.length,
    deletedVotes
  };
}

function deleteStudentArtifacts(studentId) {
  const ratingCleanup = deleteRatingSessionsByMatcher((session) => session.student_id === studentId);
  const deletedScoreLogs = db.scoreLogs.filter((log) => log.student_id === studentId).length;
  db.scoreLogs = db.scoreLogs.filter((log) => log.student_id !== studentId);

  const reportCleanup = deleteReportsByMatcher((report) => report.student_id === studentId);

  const deletedCertificates = db.certificates.filter((certificate) => certificate.student_id === studentId).length;
  db.certificates = db.certificates.filter((certificate) => certificate.student_id !== studentId);

  return {
    deletedScoreLogs,
    deletedCertificates,
    ...ratingCleanup,
    ...reportCleanup
  };
}

function deleteClassArtifacts(classId) {
  const studentIds = new Set(
    db.students
      .filter((student) => student.class_id === classId)
      .map((student) => student.id)
  );
  const teamIds = new Set(
    db.teams
      .filter((team) => team.class_id === classId)
      .map((team) => team.id)
  );

  const ratingCleanup = deleteRatingSessionsByMatcher(
    (session) => session.class_id === classId || studentIds.has(session.student_id)
  );

  const deletedScoreLogs = db.scoreLogs.filter(
    (log) => studentIds.has(log.student_id) || teamIds.has(log.team_id)
  ).length;
  db.scoreLogs = db.scoreLogs.filter(
    (log) => !studentIds.has(log.student_id) && !teamIds.has(log.team_id)
  );

  const reportCleanup = deleteReportsByMatcher(
    (report) => report.class_id === classId || studentIds.has(report.student_id)
  );

  const deletedCertificates = db.certificates.filter(
    (certificate) => certificate.class_id === classId || studentIds.has(certificate.student_id)
  ).length;
  db.certificates = db.certificates.filter(
    (certificate) => certificate.class_id !== classId && !studentIds.has(certificate.student_id)
  );

  const deletedLotteryLogs = db.lotteryLogs.filter(
    (log) => log.class_id === classId || teamIds.has(log.team_id)
  ).length;
  db.lotteryLogs = db.lotteryLogs.filter(
    (log) => log.class_id !== classId && !teamIds.has(log.team_id)
  );

  const deletedStudents = db.students.filter((student) => student.class_id === classId).length;
  const deletedTeams = db.teams.filter((team) => team.class_id === classId).length;

  db.students = db.students.filter((student) => student.class_id !== classId);
  db.teams = db.teams.filter((team) => team.class_id !== classId);
  db.classes = db.classes.filter((item) => item.id !== classId);

  return {
    deletedStudents,
    deletedTeams,
    deletedScoreLogs,
    deletedCertificates,
    deletedLotteryLogs,
    ...ratingCleanup,
    ...reportCleanup
  };
}

// 初始化默认数据
function initDefaultData() {
  db.rewards = DEFAULT_REWARD_SEED.map((item) => normalizeLotteryCatalogItem(item, 'reward'));
  db.punishments = DEFAULT_PUNISHMENT_SEED.map((item) => normalizeLotteryCatalogItem(item, 'punishment'));
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
    crossOriginEmbedderPolicy: false,
    originAgentCluster: false
  }));
}

// API 请求频率限制（针对多老师并发使用场景优化）
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: isProduction ? 1200 : 300, // 生产环境提高上限，避免课堂多端轮询触发误限流
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  // 跳过静态资源和视频
  skip: (req) => req.path.startsWith('/assets') || req.path.startsWith('/videos') || req.path.startsWith('/uploads'),
  // 使用IP作为标识（同一教室可能多设备）
  keyGenerator: (req) => req.ip
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
app.use('/api', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store'
  });
  next();
});

const clientDistPath = path.join(__dirname, '../client/dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');
const pkGameDir = path.join(__dirname, '../public/pk-game');
const pkGameIndexPath = path.join(pkGameDir, 'index.html');

const noStoreHtmlHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store'
};

const sendSpaShell = (res) => {
  res.set(noStoreHtmlHeaders);
  res.sendFile(clientIndexPath);
};

// 静态文件缓存
const staticOptions = {
  maxAge: isProduction ? '1d' : 0,
  etag: true,
  index: false,
  setHeaders: (res, filePath) => {
    if (path.extname(filePath).toLowerCase() === '.html') {
      res.set(noStoreHtmlHeaders);
    }
  }
};
app.use(express.static(clientDistPath, staticOptions));
app.use('/pet-mirror', express.static(path.join(__dirname, '../public/pet-mirror'), { maxAge: '30d' }));
app.use('/pet-assets', express.static(path.join(__dirname, '../pet-assets'), { maxAge: '30d' }));
app.use('/videos', express.static(path.join(__dirname, '../public/videos'), { maxAge: '7d' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '7d' }));
app.use('/pk-game-assets', express.static(pkGameDir, { maxAge: isProduction ? '1d' : 0 }));

app.get('/pk-game', (req, res) => {
  res.set(noStoreHtmlHeaders);
  res.sendFile(pkGameIndexPath);
});

// ============ 输入验证辅助函数 ============
const sanitizeString = (str, maxLength = 50) => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength).replace(/[<>]/g, '');
};

const sanitizeQuestionText = (str, maxLength = 240) => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/<\/?[^>]+>/g, '')
    .replace(/[\u0000-\u001f]/g, '');
};

const validateId = (id) => {
  const parsed = parseInt(id);
  return !isNaN(parsed) && parsed > 0 ? parsed : null;
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = sanitizeString(String(value || ''), 12).toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' || text === 'on';
};

// 统一分数精度，避免浮点数累计后出现长小数
const normalizeScore = (score) => {
  const n = Number(score);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 10) / 10;
};

const normalizeTugAnswer = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '')
  .replace(/[，。！？、,.!?;:："'`]/g, '');

const shuffleTugItems = (items = []) => {
  const copied = [...items];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
};

const dedupeQuestionsByPrompt = (questions = []) => {
  const unique = [];
  const seen = new Set();

  (Array.isArray(questions) ? questions : []).forEach((question) => {
    const key = normalizeTugAnswer(question?.prompt || '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(question);
  });

  return unique;
};

const mapSubjectLabel = (subjectValue) => {
  const found = SUBJECT_OPTIONS.find((item) => item.value === subjectValue);
  return found ? found.label : '综合';
};

const mapQuestionTypeLabel = (typeValue) => {
  const found = QUESTION_TYPE_OPTIONS.find((item) => item.value === typeValue);
  return found ? found.label : '单选题';
};

const mapGradeLabel = (gradeValue) => {
  const found = GRADE_OPTIONS.find((item) => item.value === gradeValue);
  return found ? found.label : '小学';
};

const buildTugClassTeams = (classId) => {
  const parsedClassId = validateId(classId);
  if (!parsedClassId) return null;

  const classInfo = db.classes.find((item) => item.id === parsedClassId);
  if (!classInfo) return null;

  const teams = db.teams
    .filter((team) => team.class_id === parsedClassId)
    .map((team) => ({
      id: team.id,
      name: sanitizeString(team.name, 40) || `战队${team.id}`,
      color: sanitizeString(team.color || '#38bdf8', 20) || '#38bdf8',
      score: normalizeScore(team.score || 0)
    }))
    .sort((a, b) => b.score - a.score || a.id - b.id);

  return {
    classId: parsedClassId,
    className: sanitizeString(classInfo.name, 60) || `班级${parsedClassId}`,
    teams
  };
};

const extractJsonPayloadFromText = (rawText) => {
  const content = String(rawText || '').trim();
  if (!content) return null;

  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const target = (fencedMatch ? fencedMatch[1] : content).trim();
  const starts = [];
  const firstArray = target.indexOf('[');
  const firstObject = target.indexOf('{');
  if (firstArray >= 0) starts.push(firstArray);
  if (firstObject >= 0) starts.push(firstObject);
  if (starts.length === 0) return null;

  const startIndex = Math.min(...starts);
  const stack = [];
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < target.length; i += 1) {
    const ch = target[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '[' || ch === '{') {
      stack.push(ch);
      continue;
    }

    if (ch === ']' || ch === '}') {
      const last = stack[stack.length - 1];
      if (!last) break;
      if ((last === '[' && ch === ']') || (last === '{' && ch === '}')) {
        stack.pop();
        if (stack.length === 0) {
          return target.slice(startIndex, i + 1);
        }
      } else {
        break;
      }
    }
  }

  return null;
};

const normalizeQuestionTypeValue = (value) => {
  const safe = sanitizeString(value || '', 40).toLowerCase();
  if (!safe) return 'single_choice';
  const map = {
    single: 'single_choice',
    singlechoice: 'single_choice',
    choice: 'single_choice',
    radio: 'single_choice',
    multiple: 'multiple_choice',
    multiplechoice: 'multiple_choice',
    multi_choice: 'multiple_choice',
    multi: 'multiple_choice',
    truefalse: 'true_false',
    tf: 'true_false',
    fill: 'single_choice',
    fill_blank: 'single_choice',
    blank: 'single_choice',
    spelling: 'single_choice',
    qa: 'single_choice',
    text: 'single_choice',
    quickmath: 'quick_math',
    math_oral: 'quick_math',
    numeric: 'quick_math',
    number: 'quick_math'
  };
  return map[safe] || safe;
};

const stripChoicePrefix = (value) => {
  let text = sanitizeQuestionText(value || '', 140);
  if (!text) return '';
  for (let i = 0; i < 4; i += 1) {
    const next = text.replace(/^(?:[\(\[]?[A-Ha-hTtFf][\)\].:：、\s-]+)+/, '').trim();
    if (!next || next === text) break;
    text = next;
  }
  return text;
};

const isNumericAnswerText = (value) => /^-?\d+(?:\.\d+)?$/.test(String(value || '').trim());

const normalizeChoiceOptions = (rawOptions = []) => {
  const options = Array.isArray(rawOptions) ? rawOptions : [];
  const keys = ['A', 'B', 'C', 'D', 'E', 'F'];
  return options
    .map((item, idx) => {
      if (typeof item === 'string') {
        const clean = stripChoicePrefix(item);
        return clean ? { key: keys[idx] || String.fromCharCode(65 + idx), text: clean } : null;
      }
      const text = stripChoicePrefix(item?.text || item?.label || item?.value || '');
      const key = sanitizeString(item?.key || keys[idx] || String.fromCharCode(65 + idx), 4).toUpperCase();
      if (!text || !key) return null;
      return { key, text };
    })
    .filter(Boolean);
};

const parseCorrectOptions = (rawAnswer, options = []) => {
  if (Array.isArray(rawAnswer)) {
    return [...new Set(rawAnswer.map((item) => sanitizeString(item, 4).toUpperCase()).filter(Boolean))];
  }
  const answerText = sanitizeString(rawAnswer || '', 80).toUpperCase();
  if (!answerText) return [];
  const parts = answerText.split(/[|,，、/]/).map((item) => item.trim()).filter(Boolean);
  if (parts.length > 1) {
    return [...new Set(parts.map((item) => item.replace(/[^A-F]/g, '')))].filter(Boolean);
  }
  if (options.some((item) => item.key === answerText)) return [answerText];
  const matched = options.find((item) => normalizeTugAnswer(item.text) === normalizeTugAnswer(answerText));
  if (matched) return [matched.key];
  const letters = answerText.match(/[A-F]/g);
  if (letters?.length) return [...new Set(letters)];
  return [];
};

const FALLBACK_CHOICE_DISTRACTORS = ['还需要再想想', '以上都不对', '暂时不确定', '请再检查一遍'];

const buildFallbackSingleChoiceQuestion = ({
  prompt,
  answerText,
  source,
  difficulty
}) => {
  const correctText = stripChoicePrefix(answerText);
  if (!correctText) return null;
  const pool = shuffleTugItems(FALLBACK_CHOICE_DISTRACTORS)
    .filter((item) => normalizeTugAnswer(item) !== normalizeTugAnswer(correctText));
  const optionTexts = shuffleTugItems([correctText, ...pool]).slice(0, 4);
  const options = optionTexts.map((text, index) => ({
    key: String.fromCharCode(65 + index),
    text: stripChoicePrefix(text)
  }));
  const correctOption = options.find((item) => normalizeTugAnswer(item.text) === normalizeTugAnswer(correctText));
  if (!correctOption) return null;
  return {
    id: `${source}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    prompt,
    question_type: 'single_choice',
    answer_mode: 'single_choice',
    options,
    correct_options: [correctOption.key],
    answers: [correctText],
    source,
    difficulty
  };
};

const normalizeQuestionItem = (rawItem, source = 'ai', fallbackType = 'single_choice') => {
  const prompt = sanitizeQuestionText(rawItem?.prompt || rawItem?.question || rawItem?.title || '', 240);
  if (!prompt) return null;

  const explicitAnswerMode = sanitizeString(rawItem?.answer_mode || rawItem?.answerMode || '', 30).toLowerCase();
  const normalizedType = normalizeQuestionTypeValue(rawItem?.question_type || rawItem?.type || fallbackType || 'single_choice');
  let effectiveType = normalizedType === 'quick_math'
    ? 'quick_math'
    : (normalizedType === 'multiple_choice' || normalizedType === 'single_choice' || normalizedType === 'true_false')
      ? normalizedType
      : 'single_choice';
  if (explicitAnswerMode === 'multiple_choice') effectiveType = 'multiple_choice';
  else if (explicitAnswerMode === 'single_choice' || explicitAnswerMode === 'click') effectiveType = 'single_choice';
  else if (explicitAnswerMode === 'numeric' || explicitAnswerMode === 'number') effectiveType = 'quick_math';
  const difficulty = sanitizeString(rawItem?.difficulty || 'normal', 20) || 'normal';
  const options = normalizeChoiceOptions(rawItem?.options || rawItem?.choices || []);
  const presetCorrectOptions = Array.isArray(rawItem?.correct_options)
    ? rawItem.correct_options
    : Array.isArray(rawItem?.correctOptions)
      ? rawItem.correctOptions
      : [];
  const presetAnswers = Array.isArray(rawItem?.answers) ? rawItem.answers : [];
  const answerRaw = presetCorrectOptions.length
    ? presetCorrectOptions
    : (rawItem?.answer ?? rawItem?.correctAnswer ?? rawItem?.correct_answer ?? '');

  if (effectiveType === 'quick_math') {
    const candidates = presetAnswers.length
      ? presetAnswers
      : String(answerRaw || '').split(/[|,，、/]/).map((item) => sanitizeQuestionText(item, 80)).filter(Boolean);
    const numericAnswer = candidates.find((item) => isNumericAnswerText(item));
    if (numericAnswer) {
      return {
        id: `${source}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        prompt,
        question_type: 'quick_math',
        answer_mode: 'numeric',
        answers: [String(Number(numericAnswer))],
        source,
        difficulty
      };
    }

    const optionBasedKeys = parseCorrectOptions(answerRaw, options);
    if (options.length && optionBasedKeys.length) {
      const optionMap = new Map(options.map((item) => [item.key, item.text]));
      for (const key of optionBasedKeys) {
        const optionText = optionMap.get(key);
        if (isNumericAnswerText(optionText)) {
          return {
            id: `${source}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            prompt,
            question_type: 'quick_math',
            answer_mode: 'numeric',
            answers: [String(Number(optionText))],
            source,
            difficulty
          };
        }
      }
    }

    effectiveType = 'single_choice';
  }

  if (effectiveType === 'single_choice' || effectiveType === 'multiple_choice' || effectiveType === 'true_false') {
    const normalizedOptions = effectiveType === 'true_false'
      ? (options.length ? options : [{ key: 'T', text: '对' }, { key: 'F', text: '错' }])
      : options;
    const correctOptions = parseCorrectOptions(answerRaw, normalizedOptions);
    if (normalizedOptions.length && correctOptions.length) {
      return {
        id: `${source}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        prompt,
        question_type: effectiveType,
        answer_mode: effectiveType === 'multiple_choice' ? 'multiple_choice' : 'single_choice',
        options: normalizedOptions,
        correct_options: correctOptions,
        source,
        difficulty
      };
    }
    // Keep AI output usable: if options are malformed, degrade to fallback single-choice instead of dropping.
    const degradedAnswers = presetAnswers.length
      ? presetAnswers.map((item) => sanitizeQuestionText(item, 80)).filter(Boolean)
      : String(answerRaw || '')
        .split(/[|,，、/]/)
        .map((item) => sanitizeQuestionText(item, 80))
        .filter(Boolean);
    if (degradedAnswers.length) {
      const fallbackChoice = buildFallbackSingleChoiceQuestion({
        prompt,
        answerText: degradedAnswers[0],
        source,
        difficulty
      });
      if (fallbackChoice) return fallbackChoice;
    }
    return null;
  }

  const answers = presetAnswers.length
    ? presetAnswers.map((item) => sanitizeQuestionText(item, 80)).filter(Boolean)
    : String(answerRaw || '')
      .split(/[|,，、/]/)
      .map((item) => sanitizeQuestionText(item, 80))
      .filter(Boolean);
  if (!answers.length) return null;
  return buildFallbackSingleChoiceQuestion({
    prompt,
    answerText: answers[0],
    source,
    difficulty
  });
};

const normalizeAiQuestionList = (rawItems, expectedCount, fallbackType = 'single_choice') => {
  const list = Array.isArray(rawItems)
    ? rawItems
    : Array.isArray(rawItems?.questions)
      ? rawItems.questions
      : [];
  const normalized = [];
  const dedupe = new Set();

  for (const item of list) {
    const q = normalizeQuestionItem(item, 'ai', fallbackType);
    if (!q) continue;
    const uniqueKey = normalizeTugAnswer(q.prompt);
    if (!uniqueKey || dedupe.has(uniqueKey)) continue;
    dedupe.add(uniqueKey);
    normalized.push(q);
    if (normalized.length >= expectedCount) break;
  }

  return normalized;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = AI_QUESTION_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
};

const buildAiQuestionPrompt = ({
  subject,
  grade,
  questionType,
  questionCount,
  description
}) => {
  const subjectLabel = mapSubjectLabel(subject);
  const gradeLabel = mapGradeLabel(grade);
  const typeLabel = mapQuestionTypeLabel(questionType);
  const ext = sanitizeString(description || '', 200);

  return `请生成适合课堂拔河答题赛的题库，要求：
1) 学科：${subjectLabel}
2) 年级：${gradeLabel}
3) 题型：${typeLabel}
4) 数量：${questionCount} 题
5) 每题答案必须唯一、简短，适合同屏双人快速作答
6) 尽量覆盖不同知识点，避免重复
7) 仅输出 JSON，不要解释，不要 Markdown

返回格式（严格）：
[
  {
    "prompt":"题目文本",
    "question_type":"${questionType}",
    "options":["A 选项","B 选项","C 选项","D 选项"],
    "answer":"A 或 A,C 或 对/错 或 数字答案",
    "difficulty":"easy|normal|hard"
  }
]

${ext ? `附加要求：${ext}` : ''}`;
};

const buildAiQuestionPromptV2 = ({
  subject,
  grade,
  questionType,
  questionCount,
  description
}) => {
  const subjectLabel = mapSubjectLabel(subject);
  const gradeLabel = mapGradeLabel(grade);
  const typeLabel = mapQuestionTypeLabel(questionType);
  const ext = sanitizeString(description || '', 200);

  return `请生成适合课堂拔河答题赛的题库，要求：
1) 学科：${subjectLabel}
2) 年级：${gradeLabel}
3) 题型：${typeLabel}
4) 数量：${questionCount} 题
5) 只输出 JSON，不要解释，不要 markdown

JSON 结构（严格）：
[
  {
    "prompt":"题目文本",
    "question_type":"${questionType}",
    "options":["A 选项","B 选项","C 选项","D 选项"],
    "answer":"A 或 A,C 或 对/错 或 文本答案",
    "difficulty":"easy|normal|hard"
  }
]

规则：
- single_choice/multiple_choice/true_false 必须提供 options。
- quick_math 只输出数字答案（answer 为纯数字，不带单位）。
- 不要输出主观问答题、长文本填空题或拼写题。

${ext ? `附加要求：${ext}` : ''}`;
};

const parseAiQuestionsFromResponseText = (text, expectedCount, fallbackType = 'single_choice') => {
  const payload = extractJsonPayloadFromText(text);
  if (!payload) {
    throw new Error('AI response does not contain valid JSON payload');
  }
  const parsed = JSON.parse(payload);
  const questions = normalizeAiQuestionList(parsed, expectedCount, fallbackType);
  if (questions.length === 0) {
    throw new Error('AI response contains no valid questions');
  }
  return questions;
};

const generateByMiniMax = async ({
  prompt,
  questionCount,
  fallbackType = 'single_choice',
  timeoutMs: customTimeoutMs = null,
  maxRounds = 4,
  maxBatchSize = 10,
  maxEndpoints = 3
}) => {
  if (!MINIMAX_API_KEY) {
    throw new Error('MINIMAX_API_KEY is not configured');
  }

  const endpoints = [
    'https://api.minimaxi.com/v1/chat/completions',
    'https://api.minimax.chat/v1/chat/completions',
    'https://api.minimax.io/v1/chat/completions'
  ];

  const failures = [];
  const expectedCount = clampQuestionCount(questionCount);
  const safeMaxRounds = Math.max(1, Math.floor(Number(maxRounds) || 1));
  const batchSize = Math.max(1, Math.min(Math.floor(Number(maxBatchSize) || 10), expectedCount));
  const timeoutMs = Number.isFinite(Number(customTimeoutMs)) && Number(customTimeoutMs) > 0
    ? Math.max(3000, Math.floor(Number(customTimeoutMs)))
    : Math.max(70000, AI_QUESTION_TIMEOUT_MS);

  const safeMaxEndpoints = Math.max(1, Math.min(Math.floor(Number(maxEndpoints) || endpoints.length), endpoints.length));
  for (const endpoint of endpoints.slice(0, safeMaxEndpoints)) {
    const collected = [];
    const dedupe = new Set();
    let requestRound = 0;

    while (collected.length < expectedCount && requestRound < safeMaxRounds) {
      requestRound += 1;
      const remainingCount = expectedCount - collected.length;
      const askCount = Math.min(batchSize, remainingCount);
      const sampleSeenPrompts = collected
        .slice(-6)
        .map((item) => sanitizeString(item.prompt || '', 120))
        .filter(Boolean)
        .map((item) => `- ${item}`);

      const requestBody = {
        model: 'MiniMax-M2.7',
        temperature: 0.35,
        max_completion_tokens: 3800,
        messages: [
          {
            role: 'system',
            content: '你是一位K12课堂出题助手。请严格输出 JSON 数组，不要额外文本，不要解释，不要 `<think>` 标签。'
          },
          {
            role: 'user',
            content: `${prompt}\n\n本轮仅输出 ${askCount} 题，且不要重复。${sampleSeenPrompts.length ? `\n以下题干已经出现过，请务必避开：\n${sampleSeenPrompts.join('\n')}` : ''}`
          }
        ]
      };

      try {
        const response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${MINIMAX_API_KEY}`
          },
          body: JSON.stringify(requestBody)
        }, timeoutMs);

        if (!response.ok) {
          const errText = await response.text();
          failures.push(`${endpoint} -> HTTP ${response.status}: ${sanitizeString(errText, 200)}`);
          break;
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) {
          failures.push(`${endpoint} -> empty content`);
          break;
        }

        let parsed = [];
        try {
          parsed = parseAiQuestionsFromResponseText(
            String(content).replace(/<think>[\s\S]*?<\/think>/gi, ''),
            askCount,
            fallbackType
          );
        } catch (error) {
          failures.push(`${endpoint} -> parse failed: ${sanitizeString(error.message || 'unknown', 160)}`);
          break;
        }

        let addedCount = 0;
        parsed.forEach((item) => {
          const key = normalizeTugAnswer(item.prompt || '');
          if (!key || dedupe.has(key)) return;
          dedupe.add(key);
          collected.push(item);
          addedCount += 1;
        });

        if (addedCount === 0) {
          failures.push(`${endpoint} -> no unique questions`);
          break;
        }
      } catch (error) {
        failures.push(`${endpoint} -> ${sanitizeString(error.message || 'unknown', 200)}`);
        break;
      }
    }

    if (collected.length > 0) {
      return collected.slice(0, expectedCount);
    }
  }

  throw new Error(`MiniMax unavailable across endpoints: ${failures.join(' | ').slice(0, 900)}`);
};

const generateByDeepSeek = async ({
  prompt,
  questionCount,
  fallbackType = 'single_choice',
  timeoutMs: customTimeoutMs = null
}) => {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const timeoutMs = Number.isFinite(Number(customTimeoutMs)) && Number(customTimeoutMs) > 0
    ? Math.max(3000, Math.floor(Number(customTimeoutMs)))
    : AI_QUESTION_TIMEOUT_MS;

  const response = await fetchWithTimeout('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.5,
      max_tokens: 2800,
      messages: [
        {
          role: 'system',
          content: '你是一位K12课堂出题助手。请严格输出 JSON 数组，不要额外文本。'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  }, timeoutMs);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek HTTP ${response.status}: ${errText.slice(0, 240)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek response content is empty');
  }
  return parseAiQuestionsFromResponseText(content, questionCount, fallbackType);
};

const generateTugQuestions = async ({
  subject,
  grade,
  questionType,
  questionCount,
  templateId,
  description,
  preferPreset
}) => {
  const count = clampQuestionCount(questionCount);
  const template = findTemplate(templateId);
  const safeDescription = sanitizeString(description || '', 200);
  const diagnostics = {
    attempts: []
  };
  if (preferPreset) {
    return {
      provider: template ? `preset:${template.id}` : 'preset:auto',
      diagnostics: {
        ...diagnostics,
        mode: template ? 'template' : 'preset_only'
      },
      questions: shuffleTugItems(generatePresetQuestions({
        templateId: template ? template.id : null,
        subject,
        grade,
        questionType,
        questionCount: count
      }))
    };
  }

  const mergedDescription = template
    ? [safeDescription, `模板偏好：${template.label}${template.description ? `，${template.description}` : ''}`]
      .filter(Boolean)
      .join('；')
    : safeDescription;

  const prompt = buildAiQuestionPromptV2({
    subject,
    grade,
    questionType,
    questionCount: count,
    description: mergedDescription
  });

  try {
    const miniMaxQuestions = await generateByMiniMax({
      prompt,
      questionCount: count,
      fallbackType: questionType
    });
    diagnostics.attempts.push({ provider: 'minimax', ok: true });
    const mergedQuestions = [...miniMaxQuestions];

    if (mergedQuestions.length < count) {
      const fillCount = count - mergedQuestions.length;
      try {
        const deepseekFillQuestions = await generateByDeepSeek({
          prompt,
          questionCount: fillCount,
          fallbackType: questionType
        });
        const existing = new Set(
          mergedQuestions
            .map((item) => normalizeTugAnswer(item.prompt || ''))
            .filter(Boolean)
        );
        let aiFillCount = 0;
        deepseekFillQuestions.forEach((item) => {
          if (aiFillCount >= fillCount) return;
          const key = normalizeTugAnswer(item.prompt || '');
          if (!key || existing.has(key)) return;
          existing.add(key);
          mergedQuestions.push(item);
          aiFillCount += 1;
        });
        if (aiFillCount > 0) {
          diagnostics.attempts.push({ provider: 'deepseek', ok: true, mode: '补题' });
        }
      } catch (deepseekFillError) {
        diagnostics.attempts.push({
          provider: 'deepseek',
          ok: false,
          mode: '补题',
          error: sanitizeString(deepseekFillError.message || 'unknown', 240)
        });
      }
    }

    if (mergedQuestions.length < count) {
      const fillItems = generatePresetQuestions({
        templateId: template ? template.id : null,
        subject,
        grade,
        questionType,
        questionCount: count
      }).slice(0, count);
      diagnostics.partial_fill = {
        provider: 'preset',
        reason: 'ai_insufficient_questions',
        fill_count: fillItems.length
      };
      mergedQuestions.push(...fillItems);
    }
    return { provider: 'minimax', diagnostics, questions: shuffleTugItems(mergedQuestions) };
  } catch (miniMaxError) {
    diagnostics.attempts.push({
      provider: 'minimax',
      ok: false,
      error: sanitizeString(miniMaxError.message || 'unknown', 240)
    });
    console.warn('[TugGame] MiniMax failed, switching to DeepSeek immediately:', miniMaxError.message);
  }

  try {
    const deepseekQuestions = await generateByDeepSeek({
      prompt,
      questionCount: count,
      fallbackType: questionType
    });
    diagnostics.attempts.push({ provider: 'deepseek', ok: true });
    const mergedQuestions = [...deepseekQuestions];
    if (mergedQuestions.length < count) {
      const fillItems = generatePresetQuestions({
        templateId: template ? template.id : null,
        subject,
        grade,
        questionType,
        questionCount: count
      }).slice(0, count);
      diagnostics.partial_fill = {
        provider: 'preset',
        reason: 'ai_insufficient_questions',
        fill_count: fillItems.length
      };
      mergedQuestions.push(...fillItems);
    }
    return { provider: 'deepseek', diagnostics, questions: shuffleTugItems(mergedQuestions) };
  } catch (deepseekError) {
    diagnostics.attempts.push({
      provider: 'deepseek',
      ok: false,
      error: sanitizeString(deepseekError.message || 'unknown', 240)
    });
    console.warn('[TugGame] DeepSeek failed, fallback to preset bank:', deepseekError.message);
    return {
      provider: 'preset:fallback',
      diagnostics: {
        ...diagnostics,
        fallback_reason: 'all_ai_failed'
      },
      questions: shuffleTugItems(generatePresetQuestions({
        templateId: template ? template.id : null,
        subject,
        grade,
        questionType,
        questionCount: count
      }))
    };
  }
};

const buildSingleQuestionRewritePrompt = ({
  subject,
  grade,
  questionType,
  originalPrompt = '',
  rewriteHint = ''
}) => {
  const subjectLabel = mapSubjectLabel(subject);
  const gradeLabel = mapGradeLabel(grade);
  const typeLabel = mapQuestionTypeLabel(questionType);
  const cleanOriginal = sanitizeString(originalPrompt, 260);
  const cleanHint = sanitizeString(rewriteHint, 220);

  return `请重写一题课堂拔河答题赛题目，要求：
1) 学科：${subjectLabel}
2) 年级：${gradeLabel}
3) 题型：${typeLabel}
4) 只输出 JSON 数组，不要解释，不要 markdown

JSON 结构（严格）：
[
  {
    "prompt":"题目文本",
    "question_type":"${questionType}",
    "options":["A 选项","B 选项","C 选项","D 选项"],
    "answer":"A 或 A,C 或 对/错 或 数字答案",
    "difficulty":"easy|normal|hard"
  }
]

原题参考：${cleanOriginal || '无'}
补充要求：${cleanHint || '请提升题目质量并保证答案唯一。不要输出长文本问答。'}`;
};

const generateSingleAiQuestion = async ({
  subject,
  grade,
  questionType,
  originalPrompt = '',
  rewriteHint = ''
}) => {
  const diagnostics = { attempts: [] };
  const prompt = buildSingleQuestionRewritePrompt({
    subject,
    grade,
    questionType,
    originalPrompt,
    rewriteHint
  });

  try {
    const miniMaxQuestions = await generateByMiniMax({
      prompt,
      questionCount: 1,
      fallbackType: questionType
    });
    diagnostics.attempts.push({ provider: 'minimax', ok: true });
    return {
      provider: 'minimax',
      diagnostics,
      question: miniMaxQuestions[0]
    };
  } catch (miniMaxError) {
    diagnostics.attempts.push({
      provider: 'minimax',
      ok: false,
      error: sanitizeString(miniMaxError.message || 'unknown', 240)
    });
  }

  try {
    const deepseekQuestions = await generateByDeepSeek({
      prompt,
      questionCount: 1,
      fallbackType: questionType
    });
    diagnostics.attempts.push({ provider: 'deepseek', ok: true });
    return {
      provider: 'deepseek',
      diagnostics,
      question: deepseekQuestions[0]
    };
  } catch (deepseekError) {
    diagnostics.attempts.push({
      provider: 'deepseek',
      ok: false,
      error: sanitizeString(deepseekError.message || 'unknown', 240)
    });
  }

  const fallbackQuestion = generatePresetQuestions({
    subject,
    grade,
    questionType,
    questionCount: 1
  })[0];

  return {
    provider: 'preset:fallback',
    diagnostics: {
      ...diagnostics,
      fallback_reason: 'all_ai_failed'
    },
    question: fallbackQuestion
  };
};

const PK_QUESTION_BANK_JOB_TTL_MS = 30 * 60 * 1000;
const pkQuestionBankJobs = new Map();

const normalizePkQuestion = (rawQuestion, source = 'preset', fallbackType = 'single_choice') => {
  const normalized = normalizeQuestionItem(rawQuestion, source, fallbackType);
  if (!normalized) return null;
  return {
    ...normalized,
    prompt: sanitizeQuestionText(normalized.prompt, 240),
    question_type: normalizeQuestionTypeValue(normalized.question_type || fallbackType),
    difficulty: sanitizeString(normalized.difficulty || 'normal', 20) || 'normal'
  };
};

const normalizePkQuestionList = (rawQuestions = [], source = 'preset', fallbackType = 'single_choice') => {
  const list = Array.isArray(rawQuestions) ? rawQuestions : [];
  const normalized = [];
  for (const item of list) {
    const q = normalizePkQuestion(item, source, fallbackType);
    if (!q) continue;
    normalized.push(q);
  }
  return dedupeQuestionsByPrompt(normalized);
};

const BATTLE_CLICKABLE_MODES = new Set(['single_choice', 'multiple_choice']);
const BATTLE_FALLBACK_DISTRACTORS = ['还需要再想想', '以上都不对', '暂时不确定', '请再检查一遍'];

const getQuestionAnswerTexts = (question) => {
  const texts = [];
  if (!question || typeof question !== 'object') return texts;

  if (Array.isArray(question.answers)) {
    question.answers.forEach((item) => {
      const safe = sanitizeString(item, 80);
      if (safe) texts.push(safe);
    });
  }

  if (Array.isArray(question.options) && Array.isArray(question.correct_options)) {
    const optionMap = new Map(
      question.options.map((item) => [
        sanitizeString(item?.key, 4).toUpperCase(),
        sanitizeString(item?.text, 80)
      ])
    );
    question.correct_options.forEach((key) => {
      const text = optionMap.get(sanitizeString(key, 4).toUpperCase());
      if (text) texts.push(text);
    });
  }

  return [...new Set(texts.filter(Boolean))];
};

const buildBattleAnswerPool = (questions = []) => {
  const pool = [];
  (Array.isArray(questions) ? questions : []).forEach((question) => {
    pool.push(...getQuestionAnswerTexts(question));
  });
  return [...new Set(pool.filter(Boolean))];
};

const buildNumericDistractors = (correctText) => {
  const parsed = Number(String(correctText).replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(parsed)) return [];
  const delta = parsed >= 20 ? 5 : (parsed >= 10 ? 3 : 1);
  const values = [parsed + delta, parsed - delta, parsed + delta * 2]
    .filter((item) => Number.isFinite(item) && item >= 0)
    .map((item) => String(Number.isInteger(item) ? item : Number(item.toFixed(2))));
  return [...new Set(values.filter((item) => item !== String(parsed)))];
};

const pickBattleDistractors = (correctText, answerPool = [], count = 3) => {
  const normalizedCorrect = normalizeTugAnswer(correctText);
  const unique = [];
  const seen = new Set([normalizedCorrect]);

  const pushCandidate = (candidate) => {
    const safe = sanitizeString(candidate, 80);
    const key = normalizeTugAnswer(safe);
    if (!safe || !key || seen.has(key)) return;
    seen.add(key);
    unique.push(safe);
  };

  shuffleTugItems(answerPool).forEach(pushCandidate);
  buildNumericDistractors(correctText).forEach(pushCandidate);
  BATTLE_FALLBACK_DISTRACTORS.forEach(pushCandidate);
  while (unique.length < count) {
    pushCandidate(`选项${unique.length + 2}`);
  }
  return unique.slice(0, count);
};

const convertToBattleSingleChoice = (question, answerPool = []) => {
  const answerTexts = getQuestionAnswerTexts(question);
  const correctText = sanitizeString(answerTexts[0], 80);
  if (!correctText) return null;

  const distractors = pickBattleDistractors(correctText, answerPool, 3);
  const choiceTexts = shuffleTugItems([correctText, ...distractors]).slice(0, 4);
  const options = choiceTexts.map((text, index) => ({
    key: String.fromCharCode(65 + index),
    text: sanitizeString(text, 80)
  }));

  const correctOption = options.find((item) => normalizeTugAnswer(item.text) === normalizeTugAnswer(correctText));
  if (!correctOption) return null;

  return {
    ...question,
    question_type: 'single_choice',
    answer_mode: 'single_choice',
    options,
    correct_options: [correctOption.key],
    answers: [correctText]
  };
};

const convertToBattleNumeric = (question) => {
  const answerTexts = getQuestionAnswerTexts(question);
  const numeric = answerTexts.find((item) => isNumericAnswerText(item));
  if (!numeric) return null;
  return {
    ...question,
    question_type: 'quick_math',
    answer_mode: 'numeric',
    options: [],
    correct_options: [],
    answers: [String(Number(numeric))]
  };
};

const normalizeBattleQuestion = (question, answerPool = []) => {
  if (!question || typeof question !== 'object') return { question: null, adapted: false };

  const safeQuestion = normalizePkQuestion(question, question.source || 'battle', question.question_type || 'single_choice');
  if (!safeQuestion) return { question: null, adapted: false };

  if (safeQuestion.question_type === 'quick_math') {
    const numericReady = convertToBattleNumeric(safeQuestion);
    if (numericReady) {
      return { question: numericReady, adapted: safeQuestion.answer_mode !== 'numeric' };
    }
  }

  const mode = sanitizeString(safeQuestion.answer_mode, 30);
  if (BATTLE_CLICKABLE_MODES.has(mode)) {
    const options = Array.isArray(safeQuestion.options) ? safeQuestion.options : [];
    const correctOptions = Array.isArray(safeQuestion.correct_options) ? safeQuestion.correct_options : [];
    if (options.length >= 2 && correctOptions.length > 0) {
      return { question: safeQuestion, adapted: false };
    }
  }

  const converted = convertToBattleSingleChoice(safeQuestion, answerPool);
  if (!converted) return { question: null, adapted: false };
  return { question: converted, adapted: true };
};

const buildBattleReadyQuestions = (questions = []) => {
  const list = Array.isArray(questions) ? questions : [];
  const answerPool = buildBattleAnswerPool(list);
  const ready = [];
  const seen = new Set();
  let adaptedCount = 0;

  list.forEach((question) => {
    const normalized = normalizeBattleQuestion(question, answerPool);
    if (!normalized.question) return;
    const promptKey = normalizeTugAnswer(normalized.question.prompt || '');
    if (!promptKey || seen.has(promptKey)) return;
    seen.add(promptKey);
    if (normalized.adapted) adaptedCount += 1;
    ready.push(normalized.question);
  });

  return {
    questions: ready,
    adaptedCount
  };
};

const ensureBattleQuestionCount = ({
  questions = [],
  targetCount = 0,
  subject = 'math',
  grade = 'g3',
  templateId = null,
  questionType = 'single_choice'
} = {}) => {
  const safeTarget = Math.max(0, Math.floor(Number(targetCount) || 0));
  if (!safeTarget) return [];

  let merged = dedupeQuestionsByPrompt(Array.isArray(questions) ? questions : []).slice(0, safeTarget);
  if (merged.length >= safeTarget) {
    return shuffleTugItems(merged).slice(0, safeTarget);
  }

  const requestedType = normalizeQuestionTypeValue(questionType || 'single_choice');
  const fallbackTypes = [];
  fallbackTypes.push(requestedType === 'quick_math' ? 'quick_math' : requestedType);
  if (!fallbackTypes.includes('single_choice')) fallbackTypes.push('single_choice');

  fallbackTypes.forEach((fallbackQuestionType) => {
    if (merged.length >= safeTarget) return;
    const fallbackRaw = generatePresetQuestions({
      templateId: findTemplate(templateId)?.id || null,
      subject,
      grade,
      questionType: fallbackQuestionType,
      questionCount: safeTarget
    });
    const fallbackNormalized = normalizePkQuestionList(
      fallbackRaw,
      `preset:battle-fallback:${fallbackQuestionType}`,
      fallbackQuestionType
    );
    const fallbackReady = buildBattleReadyQuestions(fallbackNormalized).questions;
    merged = dedupeQuestionsByPrompt(merged.concat(fallbackReady)).slice(0, safeTarget);
  });

  return shuffleTugItems(merged).slice(0, safeTarget);
};

const buildBattleQuestionTopUpPrompt = ({
  bank,
  shortage = 0,
  existingQuestions = []
}) => {
  const existingPrompts = dedupeQuestionsByPrompt(existingQuestions)
    .slice(-12)
    .map((item) => sanitizeQuestionText(item?.prompt || '', 120))
    .filter(Boolean)
    .map((item) => `- ${item}`);

  const description = [
    sanitizeString(bank?.description || '', 200),
    'Live tug-of-war match top-up. Generate fresh questions immediately.',
    'Keep the same subject, grade and question type as the current bank.',
    'Prefer short, clickable and unambiguous classroom questions.',
    existingPrompts.length
      ? `Do not repeat any of these prompts:\n${existingPrompts.join('\n')}`
      : '',
    'Return JSON only.'
  ]
    .filter(Boolean)
    .join('\n\n');

  return buildAiQuestionPromptV2({
    subject: bank?.subject || 'math',
    grade: bank?.grade || 'g3',
    questionType: bank?.question_type || 'single_choice',
    questionCount: shortage,
    description
  });
};

const topUpBattleQuestionsWithAi = async ({
  safeBank,
  existingQuestions = [],
  targetCount = 0
} = {}) => {
  const safeTarget = Math.max(0, Math.floor(Number(targetCount) || 0));
  let merged = dedupeQuestionsByPrompt(Array.isArray(existingQuestions) ? existingQuestions : []).slice(0, safeTarget);
  const initialCount = merged.length;
  const diagnostics = {
    shortage: Math.max(0, safeTarget - initialCount),
    ai_fill_count: 0,
    fallback_fill_count: 0,
    attempts: []
  };

  if (!safeTarget || merged.length >= safeTarget) {
    return {
      questions: shuffleTugItems(merged).slice(0, safeTarget),
      diagnostics,
      topUpQuestions: []
    };
  }

  const prompt = buildBattleQuestionTopUpPrompt({
    bank: safeBank,
    shortage: safeTarget - merged.length,
    existingQuestions: merged
  });
  const acceptedTopUps = [];
  const acceptedKeys = new Set();

  const mergeGeneratedQuestions = (rawQuestions = [], provider = 'ai') => {
    const normalized = normalizePkQuestionList(
      rawQuestions,
      provider,
      safeBank?.question_type || 'single_choice'
    );
    if (!normalized.length) return 0;

    const ready = buildBattleReadyQuestions(normalized).questions;
    const beforeCount = merged.length;
    merged = dedupeQuestionsByPrompt(merged.concat(ready)).slice(0, safeTarget);
    const acceptedCount = Math.max(0, merged.length - beforeCount);

    if (acceptedCount > 0) {
      normalized.forEach((item) => {
        if (acceptedTopUps.length >= Math.max(0, safeTarget - initialCount)) return;
        const key = normalizeTugAnswer(item?.prompt || '');
        if (!key || acceptedKeys.has(key)) return;
        acceptedKeys.add(key);
        acceptedTopUps.push(item);
      });
    }

    return acceptedCount;
  };

  try {
    const shortage = safeTarget - merged.length;
    if (shortage > 0) {
      const questions = await generateByMiniMax({
        prompt,
        questionCount: shortage,
        fallbackType: safeBank?.question_type || 'single_choice',
        timeoutMs: LIVE_BATTLE_AI_TOPUP_TIMEOUT_MS,
        maxRounds: LIVE_BATTLE_AI_TOPUP_MAX_ROUNDS,
        maxBatchSize: LIVE_BATTLE_AI_TOPUP_BATCH_SIZE,
        maxEndpoints: 1
      });
      const acceptedCount = mergeGeneratedQuestions(questions, 'minimax:runtime-topup');
      diagnostics.attempts.push({
        provider: 'minimax',
        ok: acceptedCount > 0,
        accepted_count: acceptedCount
      });
    }
  } catch (error) {
    diagnostics.attempts.push({
      provider: 'minimax',
      ok: false,
      error: sanitizeString(error.message || 'unknown', 240)
    });
  }

  try {
    const shortage = safeTarget - merged.length;
    if (shortage > 0) {
      const questions = await generateByDeepSeek({
        prompt,
        questionCount: shortage,
        fallbackType: safeBank?.question_type || 'single_choice',
        timeoutMs: LIVE_BATTLE_AI_TOPUP_TIMEOUT_MS
      });
      const acceptedCount = mergeGeneratedQuestions(questions, 'deepseek:runtime-topup');
      diagnostics.attempts.push({
        provider: 'deepseek',
        ok: acceptedCount > 0,
        accepted_count: acceptedCount
      });
    }
  } catch (error) {
    diagnostics.attempts.push({
      provider: 'deepseek',
      ok: false,
      error: sanitizeString(error.message || 'unknown', 240)
    });
  }

  diagnostics.ai_fill_count = Math.max(0, merged.length - initialCount);

  if (merged.length < safeTarget) {
    const fallbackQuestions = ensureBattleQuestionCount({
      questions: merged,
      targetCount: safeTarget,
      subject: safeBank?.subject || 'math',
      grade: safeBank?.grade || 'g3',
      templateId: safeBank?.template_id || null,
      questionType: safeBank?.question_type || 'single_choice'
    });
    diagnostics.fallback_fill_count = Math.max(0, fallbackQuestions.length - merged.length);
    merged = fallbackQuestions;
  } else {
    merged = shuffleTugItems(merged).slice(0, safeTarget);
  }

  return {
    questions: merged,
    diagnostics,
    topUpQuestions: acceptedTopUps
  };
};

const createPkQuestionBankTitle = ({
  sourceProvider = 'preset',
  subject = 'math',
  grade = 'g3',
  questionType = 'single_choice',
  templateId = ''
}) => {
  const subjectLabel = mapSubjectLabel(subject);
  const gradeLabel = mapGradeLabel(grade);
  const typeLabel = mapQuestionTypeLabel(questionType);
  if (templateId) {
    const template = findTemplate(templateId);
    if (template) {
      return `${template.label}题库（${gradeLabel}）`;
    }
  }
  if (sourceProvider.startsWith('preset')) {
    return `${subjectLabel}${typeLabel}题库（${gradeLabel}）`;
  }
  return `AI题库 · ${subjectLabel}${typeLabel}（${gradeLabel}）`;
};

const PK_SUBJECT_VALUE_SET = new Set(SUBJECT_OPTIONS.map((item) => item.value));
const PK_GRADE_VALUE_SET = new Set(GRADE_OPTIONS.map((item) => item.value));
const PK_SUBJECT_ALIASES = {
  python: 'programming_python',
  scratch: 'programming_scratch',
  wedo: 'programming_wedo',
  jcode: 'programming_jcode',
  lego_large: 'robotics_lego_large',
  lego_small: 'robotics_lego_small',
  robotics: 'robotics_general',
  robotics_general: 'robotics_general',
  programming: 'programming_python',
  coding: 'programming_python'
};

const hasPkPlaceholderCorruption = (value) => {
  if (typeof value !== 'string') return false;
  return /(?:\?{2,}|？{2,}|�)/.test(value);
};

const normalizePkQuestionBankSubject = (value, fallback = 'science') => {
  const safe = sanitizeString(value || '', 40).toLowerCase();
  const normalized = PK_SUBJECT_ALIASES[safe] || safe;
  return PK_SUBJECT_VALUE_SET.has(normalized) ? normalized : fallback;
};

const normalizePkQuestionBankGrade = (value, fallback = 'g3') => {
  const safe = sanitizeString(value || '', 20).toLowerCase();
  if (PK_GRADE_VALUE_SET.has(safe)) return safe;
  if (/^[1-9]$/.test(safe)) {
    const mapped = `g${safe}`;
    if (PK_GRADE_VALUE_SET.has(mapped)) return mapped;
  }
  const aliasMap = {
    kindergarten: 'k1',
    preschool: 'k1',
    grade1: 'g1',
    grade2: 'g2',
    grade3: 'g3',
    grade4: 'g4',
    grade5: 'g5',
    grade6: 'g6',
    grade7: 'g7',
    grade8: 'g8',
    grade9: 'g9'
  };
  const normalized = aliasMap[safe];
  return normalized && PK_GRADE_VALUE_SET.has(normalized) ? normalized : fallback;
};

const buildPkQuestionBankDescription = ({
  sourceProvider = 'preset',
  subject = 'math',
  grade = 'g3',
  questionType = 'single_choice',
  templateId = ''
}) => {
  const template = templateId ? findTemplate(templateId) : null;
  if (template?.description && !hasPkPlaceholderCorruption(template.description)) {
    return sanitizeString(template.description, 240);
  }

  const subjectLabel = mapSubjectLabel(subject);
  const gradeLabel = mapGradeLabel(grade);
  const typeLabel = mapQuestionTypeLabel(questionType);
  if (String(sourceProvider || '').startsWith('preset')) {
    return sanitizeString(`${subjectLabel}${typeLabel}，适合${gradeLabel}课堂快速开赛。`, 240);
  }
  return sanitizeString(`智能生成的${subjectLabel}${typeLabel}，适合${gradeLabel}课堂快速开赛。`, 240);
};

const isPresetStylePkQuestionBank = (bank) => {
  if (!bank || typeof bank !== 'object') return false;
  const provider = String(bank.source_provider || '');
  return provider.startsWith('preset') || bank.generated_by === 'preset' || Boolean(bank.template_id);
};

const questionNeedsPlaceholderRepair = (question) => {
  if (!question || typeof question !== 'object') return true;
  if (hasPkPlaceholderCorruption(question.prompt || '')) return true;
  if (Array.isArray(question.answers) && question.answers.some((item) => hasPkPlaceholderCorruption(String(item || '')))) {
    return true;
  }
  if (Array.isArray(question.options) && question.options.some((item) => hasPkPlaceholderCorruption(String(item?.text || '')))) {
    return true;
  }
  return false;
};

const rebuildPresetStyleQuestionBankQuestions = (bank, subject, grade, questionType) => {
  const desiredCount = clampQuestionCount(
    bank.question_count || (Array.isArray(bank.questions) ? bank.questions.length : DEFAULT_QUESTION_COUNT)
  );
  const generated = generatePresetQuestions({
    templateId: findTemplate(bank.template_id)?.id || null,
    subject,
    grade,
    questionType,
    questionCount: desiredCount
  });
  return normalizePkQuestionList(generated, bank.source_provider || 'preset:auto', questionType);
};

const buildDisplayReadyPkQuestionBank = (bank) => {
  if (!bank || typeof bank !== 'object') return null;

  const subject = normalizePkQuestionBankSubject(bank.subject || '', 'science');
  const grade = normalizePkQuestionBankGrade(bank.grade || '', 'g3');
  const questionType = normalizeQuestionTypeValue(bank.question_type || 'single_choice');
  const rawQuestions = Array.isArray(bank.questions) ? bank.questions : [];
  let questions = normalizePkQuestionList(
    rawQuestions,
    bank.source_provider || 'preset',
    questionType
  );

  if (isPresetStylePkQuestionBank(bank)) {
    const brokenCount = questions.filter(questionNeedsPlaceholderRepair).length;
    const hasDuplicatePrompts = rawQuestions.length > questions.length;
    const desiredCount = clampQuestionCount(
      bank.question_count || rawQuestions.length || DEFAULT_QUESTION_COUNT
    );
    const shouldRebuild = !questions.length
      || hasDuplicatePrompts
      || questions.length < Math.min(desiredCount, DEFAULT_QUESTION_COUNT)
      || brokenCount >= Math.max(1, Math.ceil(questions.length * 0.3));
    if (shouldRebuild) {
      const rebuilt = rebuildPresetStyleQuestionBankQuestions(bank, subject, grade, questionType);
      if (rebuilt.length) {
        questions = rebuilt;
      }
    }
  }

  const title = sanitizeString(bank.title || '', 80);
  const description = sanitizeString(bank.description || '', 240);

  return {
    ...bank,
    subject,
    grade,
    question_type: questionType,
    title: title && !hasPkPlaceholderCorruption(title)
      ? title
      : createPkQuestionBankTitle({
        sourceProvider: bank.source_provider || 'preset',
        subject,
        grade,
        questionType,
        templateId: bank.template_id || ''
      }),
    description: description && !hasPkPlaceholderCorruption(description)
      ? description
      : buildPkQuestionBankDescription({
        sourceProvider: bank.source_provider || 'preset',
        subject,
        grade,
        questionType,
        templateId: bank.template_id || ''
      }),
    question_count: questions.length || Number(bank.question_count) || 0,
    questions
  };
};

const createPkQuestionBankRecord = ({
  classId,
  title,
  description = '',
  sourceProvider = 'preset',
  subject = 'math',
  grade = 'g3',
  questionType = 'single_choice',
  templateId = null,
  generatedBy = 'system',
  providerDiagnostics = null,
  questions = []
}) => {
  const normalizedQuestions = normalizePkQuestionList(questions, sourceProvider, questionType);
  if (!normalizedQuestions.length) {
    throw new Error('Question bank cannot be empty');
  }
  const normalizedClassId = validateId(classId);

  const now = new Date().toISOString();
  const record = {
    id: db.nextId.pkQuestionBanks++,
    class_id: normalizedClassId,
    scope: normalizedClassId ? 'class' : 'global',
    title: sanitizeString(title || '', 80) || createPkQuestionBankTitle({
      sourceProvider, subject, grade, questionType, templateId
    }),
    description: sanitizeString(description || '', 240),
    source_provider: sourceProvider,
    subject: sanitizeString(subject || 'math', 40) || 'math',
    grade: sanitizeString(grade || 'g3', 12) || 'g3',
    question_type: sanitizeString(questionType || 'single_choice', 30) || 'single_choice',
    question_count: normalizedQuestions.length,
    template_id: templateId ? sanitizeString(templateId, 60) : null,
    generated_by: sanitizeString(generatedBy || 'system', 40) || 'system',
    provider_diagnostics: providerDiagnostics && typeof providerDiagnostics === 'object'
      ? providerDiagnostics
      : null,
    created_at: now,
    updated_at: now,
    questions: normalizedQuestions
  };

  db.pkQuestionBanks.unshift(record);
  saveDb();
  return record;
};

const summarizePkQuestionBank = (bank) => {
  const safeBank = buildDisplayReadyPkQuestionBank(bank) || bank;
  return {
    id: safeBank.id,
    class_id: safeBank.class_id,
    scope: safeBank.scope,
    can_delete: (safeBank.scope || (validateId(safeBank.class_id) ? 'class' : 'global')) === 'class',
    title: safeBank.title,
    description: safeBank.description,
    source_provider: safeBank.source_provider,
    subject: safeBank.subject,
    grade: safeBank.grade,
    question_type: normalizeQuestionTypeValue(safeBank.question_type || 'single_choice'),
    question_count: safeBank.question_count,
    template_id: safeBank.template_id,
    provider_diagnostics: safeBank.provider_diagnostics || null,
    created_at: safeBank.created_at,
    updated_at: safeBank.updated_at
  };
};

const ensurePresetPkQuestionBanks = () => {
  const hasPreset = db.pkQuestionBanks.some((item) => item.template_id && item.source_provider.startsWith('preset'));
  if (hasPreset) return;

  QUICK_TEMPLATES.forEach((template) => {
    const generated = generatePresetQuestions({
      templateId: template.id,
      subject: template.subject,
      grade: 'g3',
      questionType: template.questionType,
      questionCount: DEFAULT_QUESTION_COUNT
    });
    if (!generated.length) return;
    createPkQuestionBankRecord({
      classId: null,
      title: `${template.label} · 标准题库`,
      description: template.description,
      sourceProvider: `preset:${template.id}`,
      subject: template.subject,
      grade: 'g3',
      questionType: template.questionType,
      templateId: template.id,
      generatedBy: 'preset',
      questions: generated
    });
  });
};

const getPkQuestionBankById = (bankId) => {
  const safeId = validateId(bankId);
  if (!safeId) return null;
  return db.pkQuestionBanks.find((item) => Number(item.id) === Number(safeId)) || null;
};

const deletePkQuestionBank = (bankId) => {
  const safeId = validateId(bankId);
  if (!safeId) return null;
  const index = db.pkQuestionBanks.findIndex((item) => Number(item.id) === Number(safeId));
  if (index < 0) return null;
  const [removed] = db.pkQuestionBanks.splice(index, 1);
  saveDb();
  return removed || null;
};

const replacePkQuestionBankQuestions = (bank, questions = [], source = 'manual') => {
  const normalized = normalizePkQuestionList(
    questions,
    source || bank.source_provider || 'manual',
    bank.question_type || 'single_choice'
  );
  if (!normalized.length) {
    throw new Error('题库题目不能为空');
  }
  bank.questions = normalized;
  bank.question_count = normalized.length;
  bank.updated_at = new Date().toISOString();
  return bank;
};

const updatePkQuestionBankMeta = (bank, patch = {}) => {
  if (patch.title !== undefined) {
    const title = sanitizeString(patch.title || '', 80);
    if (!title) throw new Error('题库标题不能为空');
    bank.title = title;
  }
  if (patch.description !== undefined) {
    bank.description = sanitizeString(patch.description || '', 240);
  }
  bank.updated_at = new Date().toISOString();
  return bank;
};

const buildPkQuestionBankFilterMeta = (banks = []) => {
  const list = (Array.isArray(banks) ? banks : [])
    .map((item) => buildDisplayReadyPkQuestionBank(item) || item);
  const sourceMap = new Map();
  list.forEach((item) => {
    const raw = String(item.source_provider || '');
    if (!raw) return;
    const key = raw.startsWith('preset') ? 'preset' : 'ai';
    if (sourceMap.has(key)) return;
    sourceMap.set(key, {
      value: key,
      label: key === 'preset' ? '标准题库' : '智能题库'
    });
  });
  return {
    subjects: [...new Set(
      list
        .map((item) => normalizePkQuestionBankSubject(item.subject || '', ''))
        .filter((value) => value && PK_SUBJECT_VALUE_SET.has(value))
    )]
      .map((value) => ({ value, label: mapSubjectLabel(value) })),
    grades: [...new Set(
      list
        .map((item) => normalizePkQuestionBankGrade(item.grade || '', ''))
        .filter((value) => value && PK_GRADE_VALUE_SET.has(value))
    )]
      .map((value) => ({ value, label: mapGradeLabel(value) })),
    question_types: [...new Set(list.map((item) => normalizeQuestionTypeValue(item.question_type || 'single_choice')).filter(Boolean))]
      .map((value) => ({ value, label: mapQuestionTypeLabel(value) })),
    sources: Array.from(sourceMap.values())
  };
};

ensurePresetPkQuestionBanks();

const queryPkQuestionBanks = ({
  classId,
  keyword = '',
  subject = '',
  grade = '',
  questionType = '',
  source = ''
} = {}) => {
  const safeKeyword = normalizeTugAnswer(keyword);
  const safeSubject = normalizePkQuestionBankSubject(subject, '');
  const safeGrade = normalizePkQuestionBankGrade(grade, '');
  const safeQuestionTypeText = sanitizeString(questionType || '', 30);
  const safeQuestionType = safeQuestionTypeText ? normalizeQuestionTypeValue(safeQuestionTypeText) : '';
  const safeSource = sanitizeString(source, 60);
  const classFilter = validateId(classId);

  return db.pkQuestionBanks
    .filter((item) => {
      const scope = item.scope || (validateId(item.class_id) ? 'class' : 'global');
      if (classFilter && scope === 'class' && Number(item.class_id) !== Number(classFilter)) return false;
      if (classFilter && scope === 'global') return true;
      if (!classFilter && scope === 'class') return false;
      return true;
    })
    .filter((item) => !safeSubject || normalizePkQuestionBankSubject(item.subject || '', '') === safeSubject)
    .filter((item) => !safeGrade || normalizePkQuestionBankGrade(item.grade || '', '') === safeGrade)
    .filter((item) => !safeQuestionType || normalizeQuestionTypeValue(item.question_type || 'single_choice') === safeQuestionType)
    .filter((item) => {
      if (!safeSource) return true;
      const provider = String(item.source_provider || '');
      if (safeSource === 'preset') return provider.startsWith('preset');
      if (safeSource === 'ai') return !provider.startsWith('preset');
      return provider.includes(safeSource);
    })
    .filter((item) => {
      if (!safeKeyword) return true;
      const safeItem = buildDisplayReadyPkQuestionBank(item) || item;
      const text = normalizeTugAnswer(`${safeItem.title || ''} ${safeItem.description || ''} ${item.source_provider || ''}`);
      return text.includes(safeKeyword);
    })
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
};

const cleanupPkQuestionBankJobs = () => {
  const now = Date.now();
  for (const [jobId, job] of pkQuestionBankJobs.entries()) {
    const updatedTs = new Date(job.updated_at || job.created_at || 0).getTime();
    if (now - updatedTs > PK_QUESTION_BANK_JOB_TTL_MS) {
      pkQuestionBankJobs.delete(jobId);
    }
  }
};

setInterval(cleanupPkQuestionBankJobs, 60 * 1000).unref?.();

const createPkQuestionBankJob = (payload) => {
  const jobId = `pkjob_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const now = new Date().toISOString();
  const job = {
    id: jobId,
    status: 'running',
    progress: 0,
    message: '正在排队准备出题',
    payload,
    bank: null,
    error: null,
    created_at: now,
    updated_at: now
  };
  pkQuestionBankJobs.set(jobId, job);
  return job;
};

const updatePkJob = (job, patch = {}) => {
  Object.assign(job, patch, { updated_at: new Date().toISOString() });
  pkQuestionBankJobs.set(job.id, job);
};

const startPkQuestionBankGeneration = async ({
  classId,
  subject,
  grade,
  questionType,
  questionCount,
  templateId,
  description,
  preferPreset
}) => {
  const job = createPkQuestionBankJob({
    class_id: classId,
    subject,
    grade,
    question_type: questionType,
    question_count: questionCount,
    template_id: templateId,
    description,
    prefer_preset: preferPreset
  });

  const progressTimer = setInterval(() => {
    const latest = pkQuestionBankJobs.get(job.id);
    if (!latest || latest.status !== 'running') {
      clearInterval(progressTimer);
      return;
    }
    const nextProgress = Math.min(96, latest.progress + Math.floor(Math.random() * 7 + 2));
    updatePkJob(latest, {
      progress: nextProgress,
      message: nextProgress < 30
        ? '正在分析题库结构'
        : nextProgress < 65
          ? '正在生成并校验题目'
          : nextProgress < 90
            ? '正在整理题目与答案'
            : '正在收尾入库'
    });
  }, 550);
  progressTimer.unref?.();

  (async () => {
    try {
      const generated = await generateTugQuestions({
        subject,
        grade,
        questionType,
        questionCount,
        templateId,
        description,
        preferPreset
      });

      const normalizedQuestions = normalizePkQuestionList(
        generated.questions || [],
        generated.provider,
        questionType
      );
      const battlePrepared = buildBattleReadyQuestions(normalizedQuestions);
      const battleQuestions = ensureBattleQuestionCount({
        questions: battlePrepared.questions,
        targetCount: questionCount,
        subject,
        grade,
        templateId,
        questionType
      });

      const bank = createPkQuestionBankRecord({
        classId,
        description,
        sourceProvider: generated.provider,
        subject,
        grade,
        questionType,
        templateId,
        generatedBy: generated.provider.startsWith('preset') ? 'preset' : 'ai',
        providerDiagnostics: {
          ...(generated.diagnostics || {}),
          battle_answer_mode: 'mixed_click_numeric',
          battle_adapted_count: battlePrepared.adaptedCount
        },
        questions: battleQuestions
      });

      const doneMessage = generated.provider === 'preset:fallback'
        ? '题库已生成（智能题库繁忙，已自动使用标准题库）'
        : generated.provider === 'deepseek'
          ? '题库生成完成（已自动保障可开赛）'
          : '题库生成完成';

      updatePkJob(job, {
        status: 'done',
        progress: 100,
        message: doneMessage,
        bank: summarizePkQuestionBank(bank)
      });
    } catch (error) {
      updatePkJob(job, {
        status: 'failed',
        progress: 100,
        message: '题库生成失败',
        error: '题库生成失败，请稍后重试'
      });
    } finally {
      clearInterval(progressTimer);
    }
  })();

  return job;
};

const getAdminPinCandidate = () => {
  const envPin = getEnvAdminPin();
  const configPin = typeof secureConfig.ADMIN_PIN === 'string' ? secureConfig.ADMIN_PIN.trim() : '';
  return envPin || configPin || '';
};

const getAdminSessionSecret = () => crypto
  .createHash('sha256')
  .update(
    process.env.ADMIN_SESSION_SECRET
      || `${security.getMachineFingerprint()}|${secureConfig.ADMIN_PIN_HASH || getAdminPinCandidate() || 'missing-admin-pin'}`
  )
  .digest('hex');

const encodeBase64Url = (value) => Buffer.from(value)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

const decodeBase64Url = (value) => {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4 || 4)) % 4;
  return Buffer.from(`${normalized}${'='.repeat(padding)}`, 'base64').toString('utf8');
};

const createAdminSessionToken = () => {
  const payload = {
    role: 'admin',
    issued_at: Date.now(),
    expires_at: Date.now() + ADMIN_SESSION_TTL_MS
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getAdminSessionSecret())
    .update(encodedPayload)
    .digest('hex');
  return `${encodedPayload}.${signature}`;
};

const verifyAdminSessionToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', getAdminSessionSecret())
    .update(encodedPayload)
    .digest('hex');

  const actualBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  if (
    actualBuffer.length === 0
    || actualBuffer.length !== expectedBuffer.length
    || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload));
    if (payload.role !== 'admin') return null;
    if (!Number.isFinite(payload.expires_at) || payload.expires_at <= Date.now()) return null;
    return payload;
  } catch (error) {
    return null;
  }
};

const extractAdminToken = (req) => {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
};

const PUBLIC_API_ROUTE_RULES = [
  { method: 'GET', pattern: /^\/api\/classes$/ },
  { method: 'GET', pattern: /^\/api\/classes\/\d+\/teams$/ },
  { method: 'GET', pattern: /^\/api\/classes\/\d+\/students$/ },
  { method: 'GET', pattern: /^\/api\/classes\/\d+\/leaderboard\/students$/ },
  { method: 'GET', pattern: /^\/api\/classes\/\d+\/leaderboard\/teams$/ },
  { method: 'GET', pattern: /^\/api\/classes\/\d+\/active-session$/ },
  { method: 'GET', pattern: /^\/api\/classes\/\d+\/rating-leaderboard$/ },
  { method: 'GET', pattern: /^\/api\/pets$/ },
  { method: 'GET', pattern: /^\/api\/rewards$/ },
  { method: 'GET', pattern: /^\/api\/punishments$/ },
  { method: 'POST', pattern: /^\/api\/rating-sessions\/\d+\/vote$/ },
  { method: 'GET', pattern: /^\/api\/rating-sessions\/\d+\/check-voted$/ },
  { method: 'POST', pattern: /^\/api\/admin\/verify$/ },
  { method: 'GET', pattern: /^\/api\/reports\/[a-z0-9]+$/ },
  { method: 'GET', pattern: /^\/api\/certificates\/[a-z0-9]+$/ },
  { method: 'GET', pattern: /^\/api\/pk\/options$/ },
  { method: 'GET', pattern: /^\/api\/pk\/classes\/\d+\/context$/ },
  { method: 'GET', pattern: /^\/api\/pk\/question-banks$/ },
  { method: 'GET', pattern: /^\/api\/pk\/question-banks\/\d+$/ },
  { method: 'PUT', pattern: /^\/api\/pk\/question-banks\/\d+$/ },
  { method: 'DELETE', pattern: /^\/api\/pk\/question-banks\/\d+$/ },
  { method: 'POST', pattern: /^\/api\/pk\/question-banks\/generate$/ },
  { method: 'POST', pattern: /^\/api\/pk\/question-banks\/\d+\/questions\/\d+\/regenerate$/ },
  { method: 'GET', pattern: /^\/api\/pk\/question-banks\/jobs\/pkjob_[a-z0-9_]+$/i },
  { method: 'POST', pattern: /^\/api\/pk\/matches\/start$/ },
  { method: 'POST', pattern: /^\/api\/pk\/questions$/ },
  { method: 'GET', pattern: /^\/api\/version$/ }
];

const isPublicApiRequest = (req) => {
  if (req.method === 'OPTIONS') {
    return true;
  }
  const rawCandidates = [...new Set([
    String(req.originalUrl || '').split('?')[0],
    `${req.baseUrl || ''}${req.path || ''}`,
    String(req.path || '')
  ].map((value) => String(value || '').trim()).filter(Boolean))];
  const routeCandidates = [...new Set(rawCandidates.flatMap((path) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const variants = [normalized];
    if (normalized.startsWith('/api/')) {
      variants.push(normalized.slice(4));
    } else {
      variants.push(`/api${normalized}`);
    }
    return variants;
  }))];

  if (
    req.method === 'DELETE'
    && routeCandidates.some((path) => (
      /^\/api\/pk\/question-banks\/\d+\/?$/.test(path)
      || /^\/pk\/question-banks\/\d+\/?$/.test(path)
    ))
  ) {
    return true;
  }

  const matched = PUBLIC_API_ROUTE_RULES.some(
    (rule) => rule.method === req.method && routeCandidates.some((path) => rule.pattern.test(path))
  );
  return matched;
};

const requireAdmin = (req, res, next) => {
  if (isPublicApiRequest(req)) {
    return next();
  }

  const session = verifyAdminSessionToken(extractAdminToken(req));
  if (!session) {
    return res.status(401).json({ error: '管理员登录已失效，请重新验证' });
  }

  req.adminSession = session;
  return next();
};

app.use('/api', requireAdmin);

const PET_CATALOG = [
  { id: 1, name: '东北虎', species: 'Cloud Pet', emoji: '🐯', rarity: 'epic', theme: '#FFF2D6', accent: '#F59E0B', quote: '勇气值拉满的小队长。' },
  { id: 2, name: '垂耳兔', species: 'Cloud Pet', emoji: '🐰', rarity: 'common', theme: '#FDF2F8', accent: '#EC4899', quote: '最喜欢安静陪你完成任务。' },
  { id: 3, name: '泰迪', species: 'Cloud Pet', emoji: '🐶', rarity: 'common', theme: '#FFF4E6', accent: '#F97316', quote: '一夸就摇尾巴的快乐制造机。' },
  { id: 4, name: '迷你刺猬', species: 'Cloud Pet', emoji: '🦔', rarity: 'rare', theme: '#FEF3C7', accent: '#D97706', quote: '外表扎扎的，内心超柔软。' },
  { id: 5, name: '红腹松鼠', species: 'Cloud Pet', emoji: '🐿️', rarity: 'rare', theme: '#FFF7ED', accent: '#EA580C', quote: '囤积分的速度和它囤松果一样快。' },
  { id: 6, name: '仓鼠团子', species: 'Cloud Pet', emoji: '🐹', rarity: 'common', theme: '#FEF3C7', accent: '#F59E0B', quote: '小小一只，治愈值很高。' },
  { id: 7, name: '柯基', species: 'Cloud Pet', emoji: '🐕', rarity: 'common', theme: '#FFF7ED', accent: '#FB923C', quote: '短腿冲刺王，课堂能量担当。' },
  { id: 8, name: '三花猫', species: 'Cloud Pet', emoji: '🐱', rarity: 'rare', theme: '#FCE7F3', accent: '#F472B6', quote: '灵感来的时候像猫一样敏捷。' },
  { id: 9, name: '银狐', species: 'Cloud Pet', emoji: '🦊', rarity: 'epic', theme: '#EEF2FF', accent: '#6366F1', quote: '机灵又优雅，超适合高分学员。' },
  { id: 10, name: '羊驼', species: 'Cloud Pet', emoji: '🦙', rarity: 'rare', theme: '#FAF5FF', accent: '#A855F7', quote: '情绪稳定，是队伍里的气氛组。' },
  { id: 11, name: '水豚君', species: 'Cloud Pet', emoji: '🦫', rarity: 'rare', theme: '#F8FAFC', accent: '#64748B', quote: '再忙也要保持慢慢变强。' },
  { id: 12, name: '熊猫团子', species: 'Cloud Pet', emoji: '🐼', rarity: 'epic', theme: '#F8FAFC', accent: '#0F172A', quote: '看起来软乎乎，实力却很稳。' },
  { id: 13, name: '小鹿', species: 'Cloud Pet', emoji: '🦌', rarity: 'rare', theme: '#FFFBEB', accent: '#CA8A04', quote: '安静成长，关键时刻很可靠。' },
  { id: 14, name: '猫头鹰', species: 'Cloud Pet', emoji: '🦉', rarity: 'epic', theme: '#EFF6FF', accent: '#2563EB', quote: '擅长观察，总能发现细节分。' },
  { id: 15, name: '小企鹅', species: 'Cloud Pet', emoji: '🐧', rarity: 'common', theme: '#ECFEFF', accent: '#0891B2', quote: '每一步都认真，笨拙但努力。' },
  { id: 16, name: '小鸭子', species: 'Cloud Pet', emoji: '🦆', rarity: 'common', theme: '#FEFCE8', accent: '#EAB308', quote: '最会跟着节奏一起向前冲。' },
  { id: 17, name: '白团子', species: 'Cloud Pet', emoji: '🐻‍❄️', rarity: 'epic', theme: '#F8FAFC', accent: '#38BDF8', quote: '像雪一样干净，像风一样轻。' },
  { id: 18, name: '考拉', species: 'Cloud Pet', emoji: '🐨', rarity: 'rare', theme: '#F8FAFC', accent: '#94A3B8', quote: '抱着知识树，慢慢变厉害。' },
  { id: 19, name: '小青蛙', species: 'Cloud Pet', emoji: '🐸', rarity: 'common', theme: '#F0FDF4', accent: '#22C55E', quote: '最擅长把课堂变成冒险。' },
  { id: 20, name: '蜜蜂球', species: 'Cloud Pet', emoji: '🐝', rarity: 'rare', theme: '#FFFBEB', accent: '#EAB308', quote: '忙忙碌碌，但每一次都很有效。' },
  { id: 21, name: '独角兽', species: 'Cloud Pet', emoji: '🦄', rarity: 'legendary', theme: '#F5F3FF', accent: '#8B5CF6', quote: '只有持续闪光的小朋友才能拥有。' },
  { id: 22, name: '小狮子', species: 'Cloud Pet', emoji: '🦁', rarity: 'epic', theme: '#FFF7ED', accent: '#F97316', quote: '敢表现、敢担当，天生主角。' },
  { id: 23, name: '鲸宝', species: 'Cloud Pet', emoji: '🐳', rarity: 'legendary', theme: '#ECFEFF', accent: '#06B6D4', quote: '超稀有宠物，像海一样有能量。' },
  { id: 24, name: '火箭喵', species: 'Cloud Pet', emoji: '🚀', rarity: 'legendary', theme: '#FFF1F2', accent: '#F43F5E', quote: '升分速度像点火发射。' }
];

const PET_STAGE_RULES = [
  { minScore: 0, maxScore: 80, level: 1, name: '幼崽期', description: '刚认识班级，最爱收集夸夸。', color: '#F59E0B' },
  { minScore: 80, maxScore: 200, level: 2, name: '活力期', description: '开始主动营业，想要更多任务。', color: '#10B981' },
  { minScore: 200, maxScore: 400, level: 3, name: '进化期', description: '外形和气场都在飞快成长。', color: '#3B82F6' },
  { minScore: 400, maxScore: 700, level: 4, name: '守护期', description: '会陪着学生一起闯关拿分。', color: '#8B5CF6' },
  { minScore: 700, maxScore: Infinity, level: 5, name: '闪耀期', description: '已经是班级里最亮眼的存在。', color: '#EC4899' }
];

const getPetById = (petId) => {
  const id = validateId(petId);
  if (!id) return null;
  return PET_CATALOG.find((pet) => pet.id === id) || null;
};

const getPetStage = (score) => {
  const normalized = normalizeScore(score);
  return PET_STAGE_RULES.find(
    (stage) => normalized >= stage.minScore && normalized < stage.maxScore
  ) || PET_STAGE_RULES[PET_STAGE_RULES.length - 1];
};

const getPetStageProgress = (score) => {
  const stage = getPetStage(score);
  if (!stage || stage.maxScore === Infinity) {
    return 100;
  }

  const span = stage.maxScore - stage.minScore;
  if (!span) return 100;

  return Math.min(
    100,
    Math.max(0, ((normalizeScore(score) - stage.minScore) / span) * 100)
  );
};

const decorateStudent = (student) => {
  const team = db.teams.find((item) => item.id === student.team_id);
  const pet = getPetById(student.pet_id);
  const stage = pet ? getPetStage(student.score) : null;

  return {
    ...student,
    score: normalizeScore(student.score),
    team_name: team?.name || null,
    team_color: team?.color || null,
    pet_id: student.pet_id || null,
    pet_claimed_at: student.pet_claimed_at || null,
    pet: pet
      ? {
          ...pet,
          stage_name: stage.name,
          stage_description: stage.description,
          stage_level: stage.level,
          stage_color: stage.color,
          progress: getPetStageProgress(student.score)
        }
      : null
  };
};

// ============ 班级管理 API ============

const LEGACY_CLASS_PET_CATALOG = [
  { id: 1, name: '长颈观察员', species: '长颈鹿', artwork_key: 'giraffe', emoji: '🦒', rarity: 'rare', theme: '#FFF7D6', accent: '#F59E0B', quote: '擅长把课堂里的细节都看在眼里。' },
  { id: 2, name: '乐跑小猎犬', species: '猎犬', artwork_key: 'beagle', emoji: '🐶', rarity: 'common', theme: '#FFF7ED', accent: '#F97316', quote: '最会陪着新同学快速进入编程状态。' },
  { id: 3, name: '破冰小企鹅', species: '企鹅', artwork_key: 'penguin-buddy', emoji: '🐧', rarity: 'common', theme: '#ECFEFF', accent: '#06B6D4', quote: '擅长把课堂气氛带热，让表达更勇敢。' },
  { id: 4, name: '代码熊猫', species: '熊猫', artwork_key: 'panda-guardian', emoji: '🐼', rarity: 'legendary', theme: '#F8FAFC', accent: '#111827', quote: '稳定、耐心、会把每一个代码细节照顾到位。' },
  { id: 5, name: '狮王队长', species: '狮子', artwork_key: 'lion', emoji: '🦁', rarity: 'epic', theme: '#FFF7ED', accent: '#D97706', quote: '最适合带领小组冲榜，是天然的舞台中心。' },
  { id: 6, name: '冲刺短腿犬', species: '腊肠犬', artwork_key: 'dachshund', emoji: '🐕', rarity: 'common', theme: '#FEF3C7', accent: '#92400E', quote: '步子不大但很稳，特别适合长期进步。' },
  { id: 7, name: '云团白猫', species: '白猫', artwork_key: 'white-cat', emoji: '🐈', rarity: 'rare', theme: '#F8FAFC', accent: '#64748B', quote: '很会安静专注，适合沉浸式完成项目。' },
  { id: 8, name: '灰塔猫', species: '灰猫', artwork_key: 'gray-cat', emoji: '🐱', rarity: 'common', theme: '#EEF2FF', accent: '#6366F1', quote: '好奇心强，常常是最先发现新玩法的那只。' },
  { id: 9, name: '算法金鱼', species: '金鱼', artwork_key: 'goldfish', emoji: '🐠', rarity: 'rare', theme: '#EFF6FF', accent: '#2563EB', quote: '别看它小，转念头的速度特别快。' },
  { id: 10, name: '冲榜虎崽', species: '虎崽', artwork_key: 'tiger-cub', emoji: '🐯', rarity: 'epic', theme: '#FFF7ED', accent: '#EA580C', quote: '适合竞赛冲刺阶段，越挑战越来劲。' },
  { id: 11, name: '彩虹锦鲤', species: '锦鲤', artwork_key: 'koi', emoji: '🎏', rarity: 'rare', theme: '#ECFEFF', accent: '#F97316', quote: '课堂表现一亮眼，整只宠物都会跟着发光。' },
  { id: 12, name: '北极企鹅王', species: '企鹅王', artwork_key: 'penguin-royal', emoji: '🐧', rarity: 'legendary', theme: '#E0F2FE', accent: '#0284C7', quote: '节奏稳定、存在感强，适合做班级明星宠物。' },
  { id: 13, name: '团子小熊猫', species: '熊猫幼崽', artwork_key: 'panda-baby', emoji: '🐼', rarity: 'common', theme: '#F8FAFC', accent: '#6B7280', quote: '软萌又耐心，最适合陪伴低龄学员成长。' },
  { id: 14, name: '荣耀猛虎', species: '守护猛虎', artwork_key: 'tiger-guardian', emoji: '🐅', rarity: 'legendary', theme: '#FFF1F2', accent: '#DC2626', quote: '成长拉满后，它会变成班级最有气场的守护者。' }
];

const CLASS_PET_GROWTH_STAGES = [
  { minGrowth: 0, maxGrowth: 80, level: 1, name: '萌芽期', description: '刚开始认识课堂节奏，适合先建立照料习惯。', color: '#F59E0B' },
  { minGrowth: 80, maxGrowth: 160, level: 2, name: '活力期', description: '开始主动互动，成长速度明显加快。', color: '#FB923C' },
  { minGrowth: 160, maxGrowth: 250, level: 3, name: '训练期', description: '状态逐步稳定，能承接更多课堂挑战。', color: '#10B981' },
  { minGrowth: 250, maxGrowth: 340, level: 4, name: '进阶期', description: '形态和气质都更成熟，陪伴感更强。', color: '#14B8A6' },
  { minGrowth: 340, maxGrowth: 440, level: 5, name: '闪亮期', description: '已经具备展示感，是班级里的亮点之一。', color: '#3B82F6' },
  { minGrowth: 440, maxGrowth: 550, level: 6, name: '守护期', description: '开始进入稳定守护阶段，成长曲线更平滑。', color: '#6366F1' },
  { minGrowth: 550, maxGrowth: 670, level: 7, name: '高能期', description: '综合状态更强，培养反馈更及时。', color: '#8B5CF6' },
  { minGrowth: 670, maxGrowth: 800, level: 8, name: '冲刺期', description: '已经接近终阶，继续保持节奏即可冲顶。', color: '#D946EF' },
  { minGrowth: 800, maxGrowth: 930, level: 9, name: '巅峰期', description: '距离终阶很近，适合安排进化前冲刺。', color: '#EC4899' },
  { minGrowth: 930, maxGrowth: Infinity, level: 10, name: '王冠期', description: '达到十级满阶，随时可以点亮进化仪式。', color: '#F97316' }
];

const CLASS_PET_DEFAULTS = {
  pet_status: 'unclaimed',
  pet_satiety: 82,
  pet_mood: 80,
  pet_cleanliness: 85,
  pet_feed_count: 0,
  pet_play_count: 0,
  pet_clean_count: 0,
  pet_last_score_sync: 0,
  pet_last_care_at: null,
  pet_hatched_at: null,
  pet_evolved_at: null,
  pet_stage_level: 0
};

const LEGACY_CLASS_PET_CARE_ACTIONS = {
  feed: { label: '喂养', metricKey: 'pet_satiety', amount: 18, sideMetricKey: 'pet_mood', sideAmount: 4, countKey: 'pet_feed_count' },
  play: { label: '互动', metricKey: 'pet_mood', amount: 18, sideMetricKey: 'pet_cleanliness', sideAmount: -4, countKey: 'pet_play_count' },
  clean: { label: '清洁', metricKey: 'pet_cleanliness', amount: 18, sideMetricKey: 'pet_mood', sideAmount: 3, countKey: 'pet_clean_count' }
};

const CLASS_PET_CARE_ACTIONS = {
  feed: { label: '喂养', metricKey: 'pet_satiety', amount: 22, sideMetricKey: 'pet_mood', sideAmount: 6, countKey: 'pet_feed_count', scoreCost: 3 },
  play: { label: '互动', metricKey: 'pet_mood', amount: 22, sideMetricKey: 'pet_cleanliness', sideAmount: -3, countKey: 'pet_play_count', scoreCost: 2 },
  clean: { label: '清洁', metricKey: 'pet_cleanliness', amount: 22, sideMetricKey: 'pet_mood', sideAmount: 5, countKey: 'pet_clean_count', scoreCost: 1 }
};

const CLASS_PET_ACTION_COSTS = {
  feed: CLASS_PET_CARE_ACTIONS.feed.scoreCost,
  play: CLASS_PET_CARE_ACTIONS.play.scoreCost,
  clean: CLASS_PET_CARE_ACTIONS.clean.scoreCost,
  hatch: 0,
  evolve: 0
};

const CLASS_PET_MINIMUM_CARE_COST = Math.min(
  ...Object.values(CLASS_PET_CARE_ACTIONS).map((action) => action.scoreCost || 0)
);

const CLASS_PET_WARNING_THRESHOLD = 48;
const CLASS_PET_CRITICAL_THRESHOLD = 24;
const CLASS_PET_MAX_LEVEL = 10;
const CLASS_PET_HATCH_SCORE_REQUIREMENT = 16;
const CLASS_PET_HATCH_CARE_ACTION_REQUIREMENT = 1;
const CLASS_PET_EVOLVE_GROWTH_REQUIREMENT = 930;
const CLASS_PET_EVOLVE_CARE_SCORE_REQUIREMENT = 66;
const CLASS_PET_EVOLVE_CARE_ACTION_REQUIREMENT = 10;
const CLASS_PET_CARE_GROWTH_WEIGHTS = {
  feed: 16,
  play: 14,
  clean: 12
};

const readPetNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampPetMetric = (value, min, max) => Math.min(max, Math.max(min, value));
const normalizePetStageSeedTimestamp = (value) => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

const getPetStateRank = (status) => {
  switch (sanitizeString(status || '', 20).toLowerCase()) {
    case 'evolved':
      return 3;
    case 'hatched':
      return 2;
    case 'egg':
      return 1;
    default:
      return 0;
  }
};

const calculateCareGrowthValue = (state = {}) => (
  state.feedCount * CLASS_PET_CARE_GROWTH_WEIGHTS.feed
  + state.playCount * CLASS_PET_CARE_GROWTH_WEIGHTS.play
  + state.cleanCount * CLASS_PET_CARE_GROWTH_WEIGHTS.clean
);

const getClassPetById = (petId, options = {}) => {
  const id = validateId(petId);
  if (!id) return null;
  const directPet = CLASS_PET_CATALOG.find((pet) => pet.id === id);
  if (directPet) return directPet;
  if (!options.allowLegacyAlias) return null;

  const normalizedId = ((id - 1) % CLASS_PET_CATALOG.length) + 1;
  return CLASS_PET_CATALOG.find((pet) => pet.id === normalizedId) || null;
};

const getClassPetStateSnapshot = (student) => {
  const storedStageLevel = Math.max(0, Math.floor(readPetNumber(student.pet_stage_level, CLASS_PET_DEFAULTS.pet_stage_level)));
  const legacyStatus = sanitizeString(student.pet_status || '', 20).toLowerCase();
  const inferredHatchedAt = student.pet_hatched_at
    || ((legacyStatus === 'hatched' || legacyStatus === 'evolved' || storedStageLevel > 0)
      ? (student.pet_claimed_at || student.pet_last_care_at || student.created_at || new Date().toISOString())
      : null);
  const inferredEvolvedAt = student.pet_evolved_at
    || ((legacyStatus === 'evolved' || storedStageLevel >= CLASS_PET_MAX_LEVEL)
      ? (student.pet_last_care_at || student.pet_claimed_at || student.created_at || new Date().toISOString())
      : null);
  const inferredStatus = student.pet_status || (
    student.pet_id
      ? (inferredEvolvedAt ? 'evolved' : (inferredHatchedAt ? 'hatched' : 'egg'))
      : 'unclaimed'
  );

  return {
    status: inferredStatus,
    satiety: clampPetMetric(readPetNumber(student.pet_satiety, CLASS_PET_DEFAULTS.pet_satiety), 0, 100),
    mood: clampPetMetric(readPetNumber(student.pet_mood, CLASS_PET_DEFAULTS.pet_mood), 0, 100),
    cleanliness: clampPetMetric(readPetNumber(student.pet_cleanliness, CLASS_PET_DEFAULTS.pet_cleanliness), 0, 100),
    feedCount: Math.max(0, Math.floor(readPetNumber(student.pet_feed_count, CLASS_PET_DEFAULTS.pet_feed_count))),
    playCount: Math.max(0, Math.floor(readPetNumber(student.pet_play_count, CLASS_PET_DEFAULTS.pet_play_count))),
    cleanCount: Math.max(0, Math.floor(readPetNumber(student.pet_clean_count, CLASS_PET_DEFAULTS.pet_clean_count))),
    lastScoreSync: normalizeScore(readPetNumber(student.pet_last_score_sync, 0)),
    lastCareAt: student.pet_last_care_at || null,
    hatchedAt: inferredHatchedAt,
    evolvedAt: inferredEvolvedAt,
    stageLevel: storedStageLevel
  };
};

const ensureClassPetState = (student) => {
  const snapshot = getClassPetStateSnapshot(student);
  student.pet_status = snapshot.status;
  student.pet_satiety = snapshot.satiety;
  student.pet_mood = snapshot.mood;
  student.pet_cleanliness = snapshot.cleanliness;
  student.pet_feed_count = snapshot.feedCount;
  student.pet_play_count = snapshot.playCount;
  student.pet_clean_count = snapshot.cleanCount;
  student.pet_last_score_sync = snapshot.lastScoreSync;
  student.pet_last_care_at = snapshot.lastCareAt;
  student.pet_hatched_at = snapshot.hatchedAt;
  student.pet_evolved_at = snapshot.evolvedAt;
  student.pet_stage_level = snapshot.stageLevel;
  return snapshot;
};

const getClassPetMetricsWithDecay = (student, now = new Date()) => {
  const snapshot = getClassPetStateSnapshot(student);
  const referenceTime = snapshot.lastCareAt || student.pet_claimed_at || student.created_at;
  const referenceDate = referenceTime ? new Date(referenceTime) : now;
  const hoursElapsed = Math.max(0, (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60));

  return {
    satiety: clampPetMetric(Math.round(snapshot.satiety - hoursElapsed * 1.6), 0, 100),
    mood: clampPetMetric(Math.round(snapshot.mood - hoursElapsed * 1.1), 0, 100),
    cleanliness: clampPetMetric(Math.round(snapshot.cleanliness - hoursElapsed * 1.4), 0, 100),
    hoursElapsed
  };
};

const syncClassPetMetrics = (student, now = new Date()) => {
  const metrics = getClassPetMetricsWithDecay(student, now);
  student.pet_satiety = metrics.satiety;
  student.pet_mood = metrics.mood;
  student.pet_cleanliness = metrics.cleanliness;
  return metrics;
};

const getStudentScoreDebt = (score) => {
  const normalized = normalizeScore(score);
  return normalized < 0 ? Math.abs(normalized) : 0;
};

const applyStudentDebtPressureToPetSlotV2 = (student, petSlot, now = new Date()) => {
  if (!student || !petSlot) {
    return { debtDelta: 0, currentDebt: 0 };
  }

  const currentScore = normalizeScore(student.score);
  const previousScoreSync = normalizeScore(readPetNumber(petSlot.pet_last_score_sync, currentScore));
  const previousDebt = getStudentScoreDebt(previousScoreSync);
  const currentDebt = getStudentScoreDebt(currentScore);
  const debtDelta = Math.max(0, currentDebt - previousDebt);

  petSlot.pet_last_score_sync = currentScore;

  if (!debtDelta) {
    return { debtDelta: 0, currentDebt };
  }

  syncClassPetMetrics(petSlot, now);
  petSlot.pet_satiety = clampPetMetric(readPetNumber(petSlot.pet_satiety, 0) - Math.round(debtDelta * 2.6), 0, 100);
  petSlot.pet_mood = clampPetMetric(readPetNumber(petSlot.pet_mood, 0) - Math.round(debtDelta * 2.2), 0, 100);
  petSlot.pet_cleanliness = clampPetMetric(readPetNumber(petSlot.pet_cleanliness, 0) - Math.round(debtDelta * 1.8), 0, 100);

  return { debtDelta, currentDebt };
};

const getClassPetCareSummary = (metrics, studentScore = 0) => {
  const careScore = Math.round((metrics.satiety + metrics.mood + metrics.cleanliness) / 3);
  const lowestMetric = Math.min(metrics.satiety, metrics.mood, metrics.cleanliness);
  const scoreDebt = getStudentScoreDebt(studentScore);
  const isDormant = lowestMetric <= 0;
  const isFragile = !isDormant && lowestMetric < CLASS_PET_CRITICAL_THRESHOLD;
  const isWarning = !isDormant && (lowestMetric < CLASS_PET_WARNING_THRESHOLD || scoreDebt > 0);

  if (isDormant) {
    return {
      careScore,
      badge: '进入沉睡',
      tip: scoreDebt > 0
        ? '积分已经透支，宠物把之前积累的状态吐出来了。先把积分补回正数，再安排照料唤醒。'
        : '状态已经掉到底了。先重新获得积分，再连续安排照料把它唤醒。',
      isDormant,
      isFragile: false,
      isWarning: false,
      scoreDebt,
      reviveHint: `至少准备 ${CLASS_PET_MINIMUM_CARE_COST} 积分，重新进行喂养、互动或清洁。`
    };
  }

  if (scoreDebt > 0) {
    return {
      careScore,
      badge: '积分透支',
      tip: '分数被扣成负数后，宠物会慢慢吐掉之前吃进去的状态。先追分，再继续照料。',
      isDormant,
      isFragile: true,
      isWarning: true,
      scoreDebt,
      reviveHint: `先把积分补回 0 分以上，再准备 ${CLASS_PET_MINIMUM_CARE_COST} 分继续照料。`
    };
  }

  if (isFragile) {
    return {
      careScore,
      badge: '状态告急',
      tip: '现在要优先补喂养、互动和清洁，别让它掉进沉睡状态。',
      isDormant,
      isFragile,
      isWarning: true,
      scoreDebt,
      reviveHint: null
    };
  }

  if (careScore >= 85) {
    return {
      careScore,
      badge: '状态超稳',
      tip: '当前状态很适合继续冲成长值，准备下一次高光仪式。',
      isDormant,
      isFragile: false,
      isWarning: false,
      scoreDebt,
      reviveHint: null
    };
  }

  if (careScore >= 65) {
    return {
      careScore,
      badge: '状态平稳',
      tip: '保持当前节奏，再照料几次就能明显长大。',
      isDormant,
      isFragile: false,
      isWarning,
      scoreDebt,
      reviveHint: null
    };
  }

  return {
    careScore,
    badge: isWarning ? '需要陪伴' : '稳步成长',
    tip: '最近互动有点少，补一补就会恢复活力。',
    isDormant,
    isFragile: false,
    isWarning,
    scoreDebt,
    reviveHint: null
  };
};

const buildClassPetJourneyEconomy = (student, metrics, careSummary) => {
  const scoreBalance = normalizeScore(student?.score);
  const scoreDebt = careSummary?.scoreDebt ?? getStudentScoreDebt(scoreBalance);

  return {
    score_balance: scoreBalance,
    score_debt: scoreDebt,
    is_dormant: Boolean(careSummary?.isDormant),
    is_fragile: Boolean(careSummary?.isFragile),
    is_warning: Boolean(careSummary?.isWarning),
    condition_label: careSummary?.badge || '等待领取',
    condition_tip: careSummary?.tip || '',
    revive_hint: careSummary?.reviveHint || '',
    action_costs: CLASS_PET_ACTION_COSTS,
    min_care_cost: CLASS_PET_MINIMUM_CARE_COST,
    score_needed_for_next_care: Math.max(0, CLASS_PET_MINIMUM_CARE_COST - scoreBalance),
    decay_hours: Number.isFinite(metrics?.hoursElapsed) ? Math.round(metrics.hoursElapsed * 10) / 10 : 0
  };
};

const getClassPetGrowthStage = (growthValue) => {
  return CLASS_PET_GROWTH_STAGES.find(
    (stage) => growthValue >= stage.minGrowth && growthValue < stage.maxGrowth
  ) || CLASS_PET_GROWTH_STAGES[CLASS_PET_GROWTH_STAGES.length - 1];
};

const getClassPetGrowthProgress = (growthValue, stage) => {
  if (!stage || stage.maxGrowth === Infinity) {
    return 100;
  }

  const span = stage.maxGrowth - stage.minGrowth;
  if (!span) return 100;

  return clampPetMetric(Math.round(((growthValue - stage.minGrowth) / span) * 100), 0, 100);
};

const getClassPetGrowthStageByLevel = (level) => {
  const normalizedLevel = Math.max(1, Math.min(CLASS_PET_MAX_LEVEL, Math.floor(Number(level) || 1)));
  return CLASS_PET_GROWTH_STAGES.find((stage) => stage.level === normalizedLevel)
    || CLASS_PET_GROWTH_STAGES[CLASS_PET_GROWTH_STAGES.length - 1];
};

const getNextClassPetGrowthStage = (level) => {
  const normalizedLevel = Math.max(0, Math.floor(Number(level) || 0));
  return CLASS_PET_GROWTH_STAGES.find((stage) => stage.level === normalizedLevel + 1) || null;
};

const inferManualPetStageLevel = (state = {}, growthValue = 0) => {
  if (!state?.hatchedAt) return 0;
  if (state?.evolvedAt) return CLASS_PET_MAX_LEVEL;

  const storedLevel = Math.floor(readPetNumber(state?.stageLevel, 0));
  if (storedLevel > 0) {
    return Math.max(1, Math.min(CLASS_PET_MAX_LEVEL - 1, storedLevel));
  }

  const derivedStage = getClassPetGrowthStage(growthValue);
  if (derivedStage?.level > 0) {
    return Math.max(1, Math.min(CLASS_PET_MAX_LEVEL - 1, derivedStage.level));
  }

  return 1;
};

const getClassPetStageUnlockProgress = (growthValue, stageLevel) => {
  if (stageLevel >= CLASS_PET_MAX_LEVEL) {
    return 100;
  }

  const currentStage = getClassPetGrowthStageByLevel(stageLevel);
  const nextStage = getNextClassPetGrowthStage(stageLevel);
  if (!currentStage || !nextStage) {
    return 100;
  }

  const span = Math.max(1, nextStage.minGrowth - currentStage.minGrowth);
  return clampPetMetric(
    Math.round(((growthValue - currentStage.minGrowth) / span) * 100),
    0,
    100
  );
};

const LEGACY_getClassPetCareSummary = (metrics) => {
  const careScore = Math.round((metrics.satiety + metrics.mood + metrics.cleanliness) / 3);
  const lowestMetric = Math.min(metrics.satiety, metrics.mood, metrics.cleanliness);

  if (lowestMetric < 45) {
    return { careScore, badge: '急需照料', tip: '先补喂养、互动或清洁，别让宠物状态掉下去。' };
  }

  if (careScore >= 85) {
    return { careScore, badge: '状态超好', tip: '现在很适合继续冲成长值，准备下一阶段。' };
  }

  if (careScore >= 65) {
    return { careScore, badge: '状态稳定', tip: '保持当前节奏，再补几次照料就能明显成长。' };
  }

  return { careScore, badge: '需要陪伴', tip: '最近互动有点少，补一补就会恢复活力。' };
};

const getClassEggProgress = (growthValue, totalCareActions) => {
  const growthProgress = clampPetMetric((growthValue / CLASS_PET_HATCH_SCORE_REQUIREMENT) * 70, 0, 70);
  const careProgress = clampPetMetric((totalCareActions / CLASS_PET_HATCH_CARE_ACTION_REQUIREMENT) * 30, 0, 30);
  return Math.round(growthProgress + careProgress);
};

const getClassEvolutionProgress = (growthValue, careScore, totalCareActions, options = {}) => {
  const growthProgress = clampPetMetric((growthValue / CLASS_PET_EVOLVE_GROWTH_REQUIREMENT) * 60, 0, 60);
  const careScoreProgress = clampPetMetric((careScore / CLASS_PET_EVOLVE_CARE_SCORE_REQUIREMENT) * 20, 0, 20);
  const careActionProgress = clampPetMetric((totalCareActions / CLASS_PET_EVOLVE_CARE_ACTION_REQUIREMENT) * 20, 0, 20);
  const total = Math.round(growthProgress + careScoreProgress + careActionProgress);
  if (options?.blocked) {
    return Math.min(95, total);
  }
  return total;
};

const buildStudentPetJourney = (student) => {
  const pet = getClassPetById(student.pet_id, { allowLegacyAlias: true });
  const scoreGrowth = normalizeScore(student.score);
  const state = getClassPetStateSnapshot(student);
  const metrics = getClassPetMetricsWithDecay(student);
  const totalCareActions = state.feedCount + state.playCount + state.cleanCount;
  const careGrowth = calculateCareGrowthValue(state);
  const growthValue = scoreGrowth + careGrowth;
  const careSummary = getClassPetCareSummary(metrics);

  if (!pet) {
    return {
      slot_state: 'empty',
      visual_state: 'egg',
      claimed: false,
      status_label: '等待领取',
      name: '宠物蛋',
      subtitle: '还没有选择宠物伙伴',
      selected_species: null,
      stage_name: '待领取',
      stage_level: 0,
      stage_description: '先在宠物中心为学生选择一只班级宠物，再开始成长计划。',
      stage_color: '#F59E0B',
      progress: 0,
      growth_value: 0,
      growth_from_score: scoreGrowth,
      growth_from_care: 0,
      care_score: 0,
      satiety: 0,
      mood: 0,
      cleanliness: 0,
      total_care_actions: 0,
      can_hatch: false,
      can_evolve: false,
      care_tip: '先完成宠物领取，学生卡片会从宠物蛋进入养成状态。',
      next_target: '领取一只宠物，开始班级养成',
      feed_count: 0,
      play_count: 0,
      clean_count: 0,
      accent: '#F59E0B',
      theme: '#FFF7ED'
    };
  }

  const canHatch = !state.hatchedAt
    && growthValue >= CLASS_PET_HATCH_SCORE_REQUIREMENT
    && totalCareActions >= CLASS_PET_HATCH_CARE_ACTION_REQUIREMENT;
  const canEvolve = Boolean(state.hatchedAt)
    && !state.evolvedAt
    && growthValue >= CLASS_PET_EVOLVE_GROWTH_REQUIREMENT
    && careSummary.careScore >= CLASS_PET_EVOLVE_CARE_SCORE_REQUIREMENT
    && totalCareActions >= CLASS_PET_EVOLVE_CARE_ACTION_REQUIREMENT;

  if (!state.hatchedAt) {
    const missingGrowth = Math.max(0, CLASS_PET_HATCH_SCORE_REQUIREMENT - growthValue);
    const missingCare = Math.max(0, CLASS_PET_HATCH_CARE_ACTION_REQUIREMENT - totalCareActions);

    return {
      slot_state: 'egg',
      visual_state: 'egg',
      claimed: true,
      status_label: canHatch ? '可以孵化' : '待孵化',
      name: `${pet.name}蛋`,
      subtitle: `已选定 ${pet.name}，现在只差一次完整孵化。`,
      selected_species: pet.name,
      stage_name: '孵化准备期',
      stage_level: 0,
      stage_description: '在乐启享的课堂里，积分和照料次数都会帮助宠物完成孵化。',
      stage_color: pet.accent,
      progress: getClassEggProgress(growthValue, totalCareActions),
      growth_value: growthValue,
      growth_from_score: scoreGrowth,
      growth_from_care: careGrowth,
      care_score: careSummary.careScore,
      satiety: metrics.satiety,
      mood: metrics.mood,
      cleanliness: metrics.cleanliness,
      total_care_actions: totalCareActions,
      can_hatch: canHatch,
      can_evolve: false,
      care_tip: canHatch
        ? '条件已经满足，现在可以点击孵化，让宠物正式出生。'
        : `当前成长值 ${growthValue}（课堂 ${scoreGrowth} + 照料 ${careGrowth}），还差 ${missingGrowth} 分成长值和 ${missingCare} 次照料，就能完成孵化。`,
      next_target: canHatch
        ? '点击“孵化”进入正式养成'
        : `累计 ${CLASS_PET_HATCH_SCORE_REQUIREMENT} 分总成长值（课堂积分+照料成长），并完成 ${CLASS_PET_HATCH_CARE_ACTION_REQUIREMENT} 次照料后孵化`,
      feed_count: state.feedCount,
      play_count: state.playCount,
      clean_count: state.cleanCount,
      accent: pet.accent,
      theme: pet.theme
    };
  }

  const stage = getClassPetGrowthStage(growthValue);
  const nextStage = CLASS_PET_GROWTH_STAGES.find((item) => item.minGrowth > growthValue) || null;

  if (state.evolvedAt) {
    return {
      slot_state: 'evolved',
      visual_state: 'pet',
      claimed: true,
      status_label: '守护进化',
      name: pet.name,
      subtitle: '已经完成进化，是班级里的核心守护宠物。',
      selected_species: pet.name,
      stage_name: '守护进化体',
      stage_level: CLASS_PET_MAX_LEVEL,
      stage_description: '进化后的宠物会长期保持高成长状态，适合作为班级展示亮点。',
      stage_color: '#F97316',
      progress: 100,
      growth_value: growthValue,
      growth_from_score: scoreGrowth,
      growth_from_care: careGrowth,
      care_score: careSummary.careScore,
      satiety: metrics.satiety,
      mood: metrics.mood,
      cleanliness: metrics.cleanliness,
      total_care_actions: totalCareActions,
      can_hatch: false,
      can_evolve: false,
      care_tip: careSummary.tip,
      next_target: '继续通过课堂积分和照料保持巅峰状态',
      feed_count: state.feedCount,
      play_count: state.playCount,
      clean_count: state.cleanCount,
      accent: pet.accent,
      theme: pet.theme
    };
  }

  return {
    slot_state: 'hatched',
    visual_state: 'pet',
    claimed: true,
    status_label: canEvolve ? '可进化' : careSummary.badge,
    name: pet.name,
    subtitle: canEvolve ? '成长值和照料评分都达标了，可以进入进化阶段。' : `课堂积分 ${scoreGrowth} + 照料成长 ${careGrowth}，正在稳步升级。`,
    selected_species: pet.name,
    stage_name: stage.name,
    stage_level: stage.level,
    stage_description: stage.description,
    stage_color: stage.color,
    progress: getClassEvolutionProgress(growthValue, careSummary.careScore, totalCareActions),
    growth_value: growthValue,
    growth_from_score: scoreGrowth,
    growth_from_care: careGrowth,
    care_score: careSummary.careScore,
    satiety: metrics.satiety,
    mood: metrics.mood,
    cleanliness: metrics.cleanliness,
    total_care_actions: totalCareActions,
    can_hatch: false,
    can_evolve: canEvolve,
    care_tip: careSummary.tip,
    next_target: canEvolve ? '点击“进化”，进入班级守护宠物形态' : nextStage ? `再成长 ${Math.max(0, nextStage.minGrowth - growthValue)} 点，进入${nextStage.name}` : '继续保持高成长状态，准备进化',
    feed_count: state.feedCount,
    play_count: state.playCount,
    clean_count: state.cleanCount,
    accent: pet.accent,
    theme: pet.theme
  };
};

const initializeClassPet = (student, petId) => {
  const pet = getClassPetById(petId);
  if (!pet) return null;

  const now = new Date().toISOString();
  student.pet_id = pet.id;
  student.pet_claimed_at = now;
  student.pet_status = 'egg';
  student.pet_satiety = 88;
  student.pet_mood = 86;
  student.pet_cleanliness = 90;
  student.pet_feed_count = 0;
  student.pet_play_count = 0;
  student.pet_clean_count = 0;
  student.pet_last_score_sync = normalizeScore(student.score);
  student.pet_last_care_at = now;
  student.pet_hatched_at = null;
  student.pet_evolved_at = null;
  student.pet_stage_level = 0;
  return pet;
};

const decorateStudentWithPetJourney = (student) => {
  const team = db.teams.find((item) => item.id === student.team_id);
  const pet = getClassPetById(student.pet_id, { allowLegacyAlias: true });
  const petJourney = buildStudentPetJourney(student);

  return {
    ...student,
    score: normalizeScore(student.score),
    team_name: team?.name || null,
    team_color: team?.color || null,
    pet_id: student.pet_id || null,
    pet_claimed_at: student.pet_claimed_at || null,
    pet_status: student.pet_status || petJourney.slot_state,
    pet_feed_count: readPetNumber(student.pet_feed_count, 0),
    pet_play_count: readPetNumber(student.pet_play_count, 0),
    pet_clean_count: readPetNumber(student.pet_clean_count, 0),
    pet_bonus_growth: readPetNumber(student.pet_bonus_growth, 0),
    pet_last_care_at: student.pet_last_care_at || null,
    pet_hatched_at: student.pet_hatched_at || null,
    pet_evolved_at: student.pet_evolved_at || null,
    pet_journey: petJourney,
    pet: pet ? {
      ...pet,
      status_label: petJourney.status_label,
      stage_name: petJourney.stage_name,
      stage_description: petJourney.stage_description,
      stage_level: petJourney.stage_level,
      stage_color: petJourney.stage_color,
      progress: petJourney.progress,
      care_score: petJourney.care_score,
      growth_value: petJourney.growth_value,
      visual_state: petJourney.visual_state
    } : null
  };
};

const MAX_CLASS_PET_SLOTS_V2 = 3;

const createClassPetSlotV2 = (petId, claimedAt = new Date().toISOString(), scoreSnapshot = 0) => ({
  slot_id: uuidv4(),
  pet_id: petId,
  pet_claimed_at: claimedAt,
  pet_status: 'egg',
  pet_satiety: 88,
  pet_mood: 86,
  pet_cleanliness: 90,
  pet_feed_count: 0,
  pet_play_count: 0,
  pet_clean_count: 0,
  pet_bonus_growth: 0,
  pet_last_score_sync: normalizeScore(scoreSnapshot),
  pet_last_care_at: claimedAt,
  pet_hatched_at: null,
  pet_evolved_at: null,
  pet_stage_level: 0,
  pet_stage_seeded_at: null
});

const normalizeClassPetSlotV2 = (slot, fallbackClaimedAt = null) => {
  const petId = validateId(slot?.pet_id);
  if (!petId) return null;

  const claimedAt = slot.pet_claimed_at || fallbackClaimedAt || new Date().toISOString();
  const normalized = {
    ...createClassPetSlotV2(petId, claimedAt, slot?.pet_last_score_sync || 0),
    ...slot,
    slot_id: slot?.slot_id || uuidv4(),
    pet_id: petId,
    pet_claimed_at: claimedAt
  };

  normalized.pet_status = normalized.pet_status || (
    normalized.pet_evolved_at ? 'evolved' : (normalized.pet_hatched_at ? 'hatched' : 'egg')
  );
  normalized.pet_satiety = clampPetMetric(readPetNumber(normalized.pet_satiety, CLASS_PET_DEFAULTS.pet_satiety), 0, 100);
  normalized.pet_mood = clampPetMetric(readPetNumber(normalized.pet_mood, CLASS_PET_DEFAULTS.pet_mood), 0, 100);
  normalized.pet_cleanliness = clampPetMetric(readPetNumber(normalized.pet_cleanliness, CLASS_PET_DEFAULTS.pet_cleanliness), 0, 100);
  normalized.pet_feed_count = Math.max(0, Math.floor(readPetNumber(normalized.pet_feed_count, 0)));
  normalized.pet_play_count = Math.max(0, Math.floor(readPetNumber(normalized.pet_play_count, 0)));
  normalized.pet_clean_count = Math.max(0, Math.floor(readPetNumber(normalized.pet_clean_count, 0)));
  normalized.pet_bonus_growth = Math.max(0, Math.round(readPetNumber(normalized.pet_bonus_growth, 0)));
  normalized.pet_last_score_sync = normalizeScore(readPetNumber(normalized.pet_last_score_sync, 0));
  normalized.pet_stage_level = Math.max(0, Math.min(
    CLASS_PET_MAX_LEVEL,
    Math.floor(readPetNumber(normalized.pet_stage_level, 0))
  ));
  normalized.pet_stage_seeded_at = normalizePetStageSeedTimestamp(normalized.pet_stage_seeded_at);
  const normalizedLegacyStatus = sanitizeString(normalized.pet_status || '', 20).toLowerCase();
  if (!normalized.pet_hatched_at && (normalizedLegacyStatus === 'hatched' || normalizedLegacyStatus === 'evolved' || normalized.pet_stage_level > 0)) {
    normalized.pet_hatched_at = normalized.pet_claimed_at || normalized.pet_last_care_at || new Date().toISOString();
  }
  if (!normalized.pet_evolved_at && (normalizedLegacyStatus === 'evolved' || normalized.pet_stage_level >= CLASS_PET_MAX_LEVEL)) {
    normalized.pet_evolved_at = normalized.pet_last_care_at || normalized.pet_hatched_at || normalized.pet_claimed_at || new Date().toISOString();
  }
  if (normalized.pet_evolved_at) {
    normalized.pet_stage_level = CLASS_PET_MAX_LEVEL;
  } else if (normalized.pet_hatched_at && normalized.pet_stage_level < 1) {
    normalized.pet_stage_level = 1;
  }

  return normalized;
};

const syncStudentActivePetFieldsV2 = (student, activeSlot) => {
  if (!activeSlot) {
    student.pet_id = null;
    student.pet_claimed_at = null;
    student.pet_status = 'unclaimed';
    student.pet_satiety = CLASS_PET_DEFAULTS.pet_satiety;
    student.pet_mood = CLASS_PET_DEFAULTS.pet_mood;
    student.pet_cleanliness = CLASS_PET_DEFAULTS.pet_cleanliness;
    student.pet_feed_count = 0;
    student.pet_play_count = 0;
    student.pet_clean_count = 0;
    student.pet_bonus_growth = 0;
    student.pet_last_score_sync = 0;
    student.pet_last_care_at = null;
    student.pet_hatched_at = null;
    student.pet_evolved_at = null;
    student.pet_stage_level = 0;
    student.pet_stage_seeded_at = null;
    return;
  }

  student.pet_id = activeSlot.pet_id;
  student.pet_claimed_at = activeSlot.pet_claimed_at || null;
  student.pet_status = activeSlot.pet_status || 'egg';
  student.pet_satiety = activeSlot.pet_satiety;
  student.pet_mood = activeSlot.pet_mood;
  student.pet_cleanliness = activeSlot.pet_cleanliness;
  student.pet_feed_count = activeSlot.pet_feed_count;
  student.pet_play_count = activeSlot.pet_play_count;
  student.pet_clean_count = activeSlot.pet_clean_count;
  student.pet_bonus_growth = Math.max(0, Math.round(readPetNumber(activeSlot.pet_bonus_growth, 0)));
  student.pet_last_score_sync = normalizeScore(readPetNumber(activeSlot.pet_last_score_sync, 0));
  student.pet_last_care_at = activeSlot.pet_last_care_at || null;
  student.pet_hatched_at = activeSlot.pet_hatched_at || null;
  student.pet_evolved_at = activeSlot.pet_evolved_at || null;
  student.pet_stage_level = Math.max(0, Math.min(
    CLASS_PET_MAX_LEVEL,
    Math.floor(readPetNumber(activeSlot.pet_stage_level, 0))
  ));
  student.pet_stage_seeded_at = normalizePetStageSeedTimestamp(activeSlot.pet_stage_seeded_at);
};

const mergeStudentLegacyPetStateIntoSlotV2 = (student, activeSlot) => {
  if (!student || !activeSlot) return false;

  const studentPetId = validateId(student.pet_id);
  if (!studentPetId || studentPetId !== activeSlot.pet_id) {
    return false;
  }

  const studentState = getClassPetStateSnapshot(student);
  const slotState = getClassPetStateSnapshot(activeSlot);
  const studentStageLevel = Math.max(0, Math.floor(readPetNumber(student.pet_stage_level, 0)));
  const slotStageLevel = Math.max(0, Math.floor(readPetNumber(activeSlot.pet_stage_level, 0)));
  const studentTotalCare = Math.max(0, Math.floor(readPetNumber(student.pet_feed_count, 0)))
    + Math.max(0, Math.floor(readPetNumber(student.pet_play_count, 0)))
    + Math.max(0, Math.floor(readPetNumber(student.pet_clean_count, 0)));
  const slotTotalCare = Math.max(0, Math.floor(readPetNumber(activeSlot.pet_feed_count, 0)))
    + Math.max(0, Math.floor(readPetNumber(activeSlot.pet_play_count, 0)))
    + Math.max(0, Math.floor(readPetNumber(activeSlot.pet_clean_count, 0)));
  let changed = false;

  if (!activeSlot.pet_claimed_at && student.pet_claimed_at) {
    activeSlot.pet_claimed_at = student.pet_claimed_at;
    changed = true;
  }

  if (getPetStateRank(student.pet_status) > getPetStateRank(activeSlot.pet_status)) {
    activeSlot.pet_status = student.pet_status;
    changed = true;
  }

  if (!activeSlot.pet_hatched_at && studentState.hatchedAt) {
    activeSlot.pet_hatched_at = studentState.hatchedAt;
    changed = true;
  }

  if (!activeSlot.pet_evolved_at && studentState.evolvedAt) {
    activeSlot.pet_evolved_at = studentState.evolvedAt;
    changed = true;
  }

  if (studentStageLevel > slotStageLevel) {
    activeSlot.pet_stage_level = studentStageLevel;
    changed = true;
  }

  if (!activeSlot.pet_stage_seeded_at && student.pet_stage_seeded_at) {
    activeSlot.pet_stage_seeded_at = normalizePetStageSeedTimestamp(student.pet_stage_seeded_at);
    changed = true;
  }

  if (studentTotalCare > slotTotalCare) {
    activeSlot.pet_feed_count = Math.max(
      Math.floor(readPetNumber(activeSlot.pet_feed_count, 0)),
      Math.floor(readPetNumber(student.pet_feed_count, 0))
    );
    activeSlot.pet_play_count = Math.max(
      Math.floor(readPetNumber(activeSlot.pet_play_count, 0)),
      Math.floor(readPetNumber(student.pet_play_count, 0))
    );
    activeSlot.pet_clean_count = Math.max(
      Math.floor(readPetNumber(activeSlot.pet_clean_count, 0)),
      Math.floor(readPetNumber(student.pet_clean_count, 0))
    );
    activeSlot.pet_bonus_growth = Math.max(
      Math.round(readPetNumber(activeSlot.pet_bonus_growth, 0)),
      Math.round(readPetNumber(student.pet_bonus_growth, 0))
    );
    activeSlot.pet_last_care_at = student.pet_last_care_at || activeSlot.pet_last_care_at;
    changed = true;
  }

  return changed;
};

const ensureStudentPetCollectionV2 = (student) => {
  const rawSlots = Array.isArray(student.pet_collection) ? student.pet_collection : [];
  let slots = rawSlots
    .map((slot) => normalizeClassPetSlotV2(slot, student.pet_claimed_at))
    .filter(Boolean);

  if (!slots.length && student.pet_id) {
    const legacySlot = normalizeClassPetSlotV2({
      slot_id: student.active_pet_slot_id || uuidv4(),
      pet_id: student.pet_id,
      pet_claimed_at: student.pet_claimed_at || student.created_at || new Date().toISOString(),
      pet_status: student.pet_status,
      pet_satiety: student.pet_satiety,
      pet_mood: student.pet_mood,
      pet_cleanliness: student.pet_cleanliness,
      pet_feed_count: student.pet_feed_count,
      pet_play_count: student.pet_play_count,
      pet_clean_count: student.pet_clean_count,
      pet_last_score_sync: student.pet_last_score_sync,
      pet_last_care_at: student.pet_last_care_at,
      pet_hatched_at: student.pet_hatched_at,
      pet_evolved_at: student.pet_evolved_at,
      pet_stage_level: student.pet_stage_level,
      pet_stage_seeded_at: student.pet_stage_seeded_at
    });

    if (legacySlot) {
      slots = [legacySlot];
    }
  }

  const dedupedSlots = [];
  const seenPetIds = new Set();

  slots.forEach((slot) => {
    if (seenPetIds.has(slot.pet_id)) return;
    seenPetIds.add(slot.pet_id);
    dedupedSlots.push(slot);
  });

  const normalizedSlots = dedupedSlots.slice(0, MAX_CLASS_PET_SLOTS_V2);
  const activeSlot =
    normalizedSlots.find((slot) => slot.slot_id === student.active_pet_slot_id) ||
    normalizedSlots[0] ||
    null;

  if (mergeStudentLegacyPetStateIntoSlotV2(student, activeSlot)) {
    student.pet_collection = normalizedSlots;
  }

  student.pet_collection = normalizedSlots;
  student.active_pet_slot_id = activeSlot?.slot_id || null;
  syncStudentActivePetFieldsV2(student, activeSlot);

  return {
    slots: normalizedSlots,
    activeSlot
  };
};

const getStudentPetBonusSlotsV2 = (student) => (
  Math.max(0, Math.min(MAX_CLASS_PET_SLOTS_V2 - 1, Math.floor(Number(student?.pet_bonus_slots) || 0)))
);

const getStudentPetCapacityV2 = (student) => {
  const { slots } = ensureStudentPetCollectionV2(student);
  const evolvedCount = slots.filter((slot) => Boolean(slot.pet_evolved_at)).length;
  const bonusSlots = getStudentPetBonusSlotsV2(student);
  return Math.max(1, Math.min(MAX_CLASS_PET_SLOTS_V2, 1 + evolvedCount + bonusSlots));
};

const canStudentClaimAnotherPetV2 = (student) => {
  const { slots } = ensureStudentPetCollectionV2(student);
  return slots.length < getStudentPetCapacityV2(student);
};

const getStudentNextPetSlotHintV2 = (student) => {
  const { slots } = ensureStudentPetCollectionV2(student);
  const capacity = getStudentPetCapacityV2(student);

  if (!slots.length) {
    return '领取第一只宠物后，就会正式开启宠物培养线。';
  }

  if (slots.length < capacity) {
    return `已解锁第 ${slots.length + 1} 宠物位，可以继续领取孩子喜欢的新宠物。`;
  }

  if (capacity >= MAX_CLASS_PET_SLOTS_V2) {
    return '全部宠物位都已解锁，后续可以在收藏宠物之间自由切换培养。';
  }

  return `先让当前收藏中的任意 1 只宠物完成进化，即可解锁第 ${slots.length + 1} 宠物位。`;
};

const getStudentPetScoreGrowthV2 = (student, petSlot) => {
  const claimedAt = petSlot?.pet_claimed_at ? new Date(petSlot.pet_claimed_at).getTime() : null;
  if (!claimedAt || Number.isNaN(claimedAt)) {
    return Math.max(0, normalizeScore(student.score));
  }

  const scoreGrowth = db.scoreLogs
    .filter((log) => log.type === 'student' && log.student_id === student.id)
    .filter((log) => {
      const createdAt = new Date(log.created_at).getTime();
      return Number.isFinite(createdAt) && createdAt >= claimedAt;
    })
    .reduce((sum, log) => sum + Number(log.delta || 0), 0);

  return Math.max(0, normalizeScore(scoreGrowth));
};

const getUnlockedPetStageLevelFromGrowthV2 = (student, petSlot) => {
  const state = getClassPetStateSnapshot(petSlot || {});
  if (!state.hatchedAt) return 0;
  if (state.evolvedAt) return CLASS_PET_MAX_LEVEL;

  const scoreGrowth = getStudentPetScoreGrowthV2(student, petSlot);
  const careGrowth = calculateCareGrowthValue(state);
  const bonusGrowth = Math.max(0, Math.round(readPetNumber(petSlot?.pet_bonus_growth, 0)));
  const growthValue = Math.max(0, scoreGrowth + careGrowth + bonusGrowth);
  const derivedStage = getClassPetGrowthStage(growthValue);

  return Math.max(1, Math.min(CLASS_PET_MAX_LEVEL - 1, derivedStage?.level || 1));
};

const seedLegacyPetStageProgressFromGrowthV2 = (student, petSlot, nowIso = new Date().toISOString()) => {
  if (!student || !petSlot) return false;

  const currentStageLevel = Math.max(0, Math.min(
    CLASS_PET_MAX_LEVEL,
    Math.floor(readPetNumber(petSlot.pet_stage_level, 0))
  ));
  const seededAt = normalizePetStageSeedTimestamp(petSlot.pet_stage_seeded_at);
  const state = getClassPetStateSnapshot(petSlot);
  let changed = false;

  if (state.evolvedAt) {
    if (currentStageLevel !== CLASS_PET_MAX_LEVEL) {
      petSlot.pet_stage_level = CLASS_PET_MAX_LEVEL;
      changed = true;
    }
    if (!seededAt) {
      petSlot.pet_stage_seeded_at = petSlot.pet_evolved_at || petSlot.pet_hatched_at || nowIso;
      changed = true;
    }
    return changed;
  }

  if (!state.hatchedAt) {
    return changed;
  }

  if (!seededAt) {
    const unlockedStageLevel = getUnlockedPetStageLevelFromGrowthV2(student, petSlot);
    const seededStageLevel = Math.max(1, Math.max(currentStageLevel, unlockedStageLevel));
    if (seededStageLevel !== currentStageLevel) {
      petSlot.pet_stage_level = seededStageLevel;
      changed = true;
    }
    petSlot.pet_stage_seeded_at = petSlot.pet_hatched_at || petSlot.pet_claimed_at || nowIso;
    changed = true;
    return changed;
  }

  if (currentStageLevel < 1) {
    petSlot.pet_stage_level = 1;
    changed = true;
  }

  return changed;
};

const LEGACY_buildPetJourneyFromSlotV2 = (student, petSlot) => {
  const pet = getClassPetById(petSlot?.pet_id, { allowLegacyAlias: true });
  const scoreGrowth = getStudentPetScoreGrowthV2(student, petSlot);
  const state = getClassPetStateSnapshot(petSlot || {});
  const metrics = getClassPetMetricsWithDecay(petSlot || {});
  const totalCareActions = state.feedCount + state.playCount + state.cleanCount;
  const careGrowth = calculateCareGrowthValue(state);
  const growthValue = scoreGrowth + careGrowth;
  const careSummary = getClassPetCareSummary(metrics);
  const { slots } = ensureStudentPetCollectionV2(student);
  const petCapacity = getStudentPetCapacityV2(student);
  const canClaimNextPet = slots.length < petCapacity;

  if (!pet) {
    return {
      slot_state: 'empty',
      visual_state: 'egg',
      claimed: false,
      status_label: '等待领取',
      name: '宠物蛋',
      subtitle: '还没有选择宠物伙伴',
      selected_species: null,
      stage_name: '待领取',
      stage_level: 0,
      stage_description: '先在宠物中心为学生选择一只班级宠物，再开始成长计划。',
      stage_color: '#F59E0B',
      progress: 0,
      growth_value: 0,
      growth_from_score: 0,
      growth_from_care: 0,
      care_score: 0,
      satiety: 0,
      mood: 0,
      cleanliness: 0,
      total_care_actions: 0,
      can_hatch: false,
      can_evolve: false,
      care_tip: '先完成宠物领取，学生卡片会从宠物蛋进入养成状态。',
      next_target: '领取一只宠物，开始班级养成',
      feed_count: 0,
      play_count: 0,
      clean_count: 0,
      accent: '#F59E0B',
      theme: '#FFF7ED'
    };
  }

  const canHatch = !state.hatchedAt
    && growthValue >= CLASS_PET_HATCH_SCORE_REQUIREMENT
    && totalCareActions >= CLASS_PET_HATCH_CARE_ACTION_REQUIREMENT;
  const canEvolve = Boolean(state.hatchedAt)
    && !state.evolvedAt
    && growthValue >= CLASS_PET_EVOLVE_GROWTH_REQUIREMENT
    && careSummary.careScore >= CLASS_PET_EVOLVE_CARE_SCORE_REQUIREMENT
    && totalCareActions >= CLASS_PET_EVOLVE_CARE_ACTION_REQUIREMENT;

  if (!state.hatchedAt) {
    const missingGrowth = Math.max(0, CLASS_PET_HATCH_SCORE_REQUIREMENT - growthValue);
    const missingCare = Math.max(0, CLASS_PET_HATCH_CARE_ACTION_REQUIREMENT - totalCareActions);

    return {
      slot_state: 'egg',
      visual_state: 'egg',
      claimed: true,
      status_label: canHatch ? '可以孵化' : '待孵化',
      name: `${pet.name}蛋`,
      subtitle: `已选定 ${pet.name}，现在只差一次完整孵化。`,
      selected_species: pet.name,
      stage_name: '孵化准备期',
      stage_level: 0,
      stage_description: '在乐启享的课堂里，积分和照料次数都会帮助宠物完成孵化。',
      stage_color: pet.accent,
      progress: getClassEggProgress(growthValue, totalCareActions),
      growth_value: growthValue,
      growth_from_score: scoreGrowth,
      growth_from_care: careGrowth,
      care_score: careSummary.careScore,
      satiety: metrics.satiety,
      mood: metrics.mood,
      cleanliness: metrics.cleanliness,
      total_care_actions: totalCareActions,
      can_hatch: canHatch,
      can_evolve: false,
      care_tip: canHatch
        ? '条件已经满足，现在可以点击孵化，让宠物正式出生。'
        : `当前成长值 ${growthValue}（课堂 ${scoreGrowth} + 照料 ${careGrowth}），还差 ${missingGrowth} 分成长值和 ${missingCare} 次照料，就能完成孵化。`,
      next_target: canHatch
        ? '点击“孵化”进入正式养成'
        : `累计 ${CLASS_PET_HATCH_SCORE_REQUIREMENT} 分总成长值（课堂积分+照料成长），并完成 ${CLASS_PET_HATCH_CARE_ACTION_REQUIREMENT} 次照料后孵化`,
      feed_count: state.feedCount,
      play_count: state.playCount,
      clean_count: state.cleanCount,
      accent: pet.accent,
      theme: pet.theme
    };
  }

  const stage = getClassPetGrowthStage(growthValue);
  const nextStage = CLASS_PET_GROWTH_STAGES.find((item) => item.minGrowth > growthValue) || null;

  if (state.evolvedAt) {
    return {
      slot_state: 'evolved',
      visual_state: 'pet',
      claimed: true,
      status_label: '守护进化',
      name: pet.name,
      subtitle: '已经完成进化，是班级里的核心守护宠物。',
      selected_species: pet.name,
      stage_name: '守护进化体',
      stage_level: CLASS_PET_MAX_LEVEL,
      stage_description: '进化后的宠物会长期保持高成长状态，适合作为班级展示亮点。',
      stage_color: '#F97316',
      progress: 100,
      growth_value: growthValue,
      growth_from_score: scoreGrowth,
      growth_from_care: careGrowth,
      care_score: careSummary.careScore,
      satiety: metrics.satiety,
      mood: metrics.mood,
      cleanliness: metrics.cleanliness,
      total_care_actions: totalCareActions,
      can_hatch: false,
      can_evolve: false,
      care_tip: careSummary.tip,
      next_target: canClaimNextPet
        ? `已解锁第 ${slots.length + 1} 宠物位，可以继续领取新的喜欢宠物。`
        : '继续通过课堂积分和照料保持巅峰状态',
      feed_count: state.feedCount,
      play_count: state.playCount,
      clean_count: state.cleanCount,
      accent: pet.accent,
      theme: pet.theme
    };
  }

  return {
    slot_state: 'hatched',
    visual_state: 'pet',
    claimed: true,
    status_label: canEvolve ? '可进化' : careSummary.badge,
    name: pet.name,
    subtitle: canEvolve ? '成长值和照料评分都达标了，可以进入进化阶段。' : `课堂积分 ${scoreGrowth} + 照料成长 ${careGrowth}，正在稳步升级。`,
    selected_species: pet.name,
    stage_name: stage.name,
    stage_level: stage.level,
    stage_description: stage.description,
    stage_color: stage.color,
    progress: getClassEvolutionProgress(growthValue, careSummary.careScore, totalCareActions),
    growth_value: growthValue,
    growth_from_score: scoreGrowth,
    growth_from_care: careGrowth,
    care_score: careSummary.careScore,
    satiety: metrics.satiety,
    mood: metrics.mood,
    cleanliness: metrics.cleanliness,
    total_care_actions: totalCareActions,
    can_hatch: false,
    can_evolve: canEvolve,
    care_tip: careSummary.tip,
    next_target: canEvolve
      ? '点击“进化”，进入班级守护宠物形态'
      : nextStage
        ? `再成长 ${Math.max(0, nextStage.minGrowth - growthValue)} 点，进入${nextStage.name}`
        : '继续保持高成长状态，准备进化',
    feed_count: state.feedCount,
    play_count: state.playCount,
    clean_count: state.cleanCount,
    accent: pet.accent,
    theme: pet.theme
  };
};

const buildPetJourneyFromSlotV2 = (student, petSlot) => {
  const pet = getClassPetById(petSlot?.pet_id, { allowLegacyAlias: true });
  const scoreGrowth = getStudentPetScoreGrowthV2(student, petSlot);
  const state = getClassPetStateSnapshot(petSlot || {});
  const metrics = getClassPetMetricsWithDecay(petSlot || {});
  const totalCareActions = state.feedCount + state.playCount + state.cleanCount;
  const careGrowth = calculateCareGrowthValue(state);
  const bonusGrowth = Math.max(0, Math.round(readPetNumber(petSlot?.pet_bonus_growth, 0)));
  const growthValue = scoreGrowth + careGrowth + bonusGrowth;
  const careSummary = getClassPetCareSummary(metrics, student?.score);
  const journeyEconomy = buildClassPetJourneyEconomy(student, metrics, careSummary);
  const { slots } = ensureStudentPetCollectionV2(student);
  const petCapacity = getStudentPetCapacityV2(student);
  const canClaimNextPet = slots.length < petCapacity;

  if (!pet) {
    return {
      slot_state: 'empty',
      visual_state: 'egg',
      claimed: false,
      status_label: '等待领取',
      name: '宠物蛋',
      subtitle: '还没有选择宠物伙伴',
      selected_species: null,
      stage_name: '待领取',
      stage_level: 0,
      stage_description: '先在宠物中心为学生选择一只班级宠物，再开始成长计划。',
      stage_color: '#F59E0B',
      progress: 0,
      growth_value: 0,
      growth_from_score: 0,
      growth_from_care: 0,
      growth_from_bonus: 0,
      care_score: 0,
      satiety: 0,
      mood: 0,
      cleanliness: 0,
      total_care_actions: 0,
      can_hatch: false,
      can_evolve: false,
      care_tip: '先完成宠物领取，学生卡片才会进入养成状态。',
      next_target: '领取一只宠物，开始班级养成。',
      feed_count: 0,
      play_count: 0,
      clean_count: 0,
      accent: '#F59E0B',
      theme: '#FFF7ED',
      ...journeyEconomy
    };
  }

  const canHatch = !state.hatchedAt
    && !careSummary.isDormant
    && growthValue >= CLASS_PET_HATCH_SCORE_REQUIREMENT
    && totalCareActions >= CLASS_PET_HATCH_CARE_ACTION_REQUIREMENT;
  const stageLevel = inferManualPetStageLevel(state, growthValue);
  const currentStage = stageLevel > 0 ? getClassPetGrowthStageByLevel(stageLevel) : null;
  const nextStage = stageLevel > 0 ? getNextClassPetGrowthStage(stageLevel) : null;
  const remainingGrowthToNextStage = nextStage ? Math.max(0, nextStage.minGrowth - growthValue) : 0;
  const rawStageProgress = stageLevel > 0 ? getClassPetStageUnlockProgress(growthValue, stageLevel) : 0;
  const stageProgress = careSummary.isDormant ? Math.min(96, rawStageProgress) : rawStageProgress;
  const canEvolve = Boolean(state.hatchedAt)
    && !state.evolvedAt
    && !careSummary.isDormant
    && Boolean(nextStage)
    && growthValue >= nextStage.minGrowth;
  const nextActionLabel = nextStage?.level === CLASS_PET_MAX_LEVEL ? '最终进化' : '阶段进化';

  if (!state.hatchedAt) {
    const missingGrowth = Math.max(0, CLASS_PET_HATCH_SCORE_REQUIREMENT - growthValue);
    const missingCare = Math.max(0, CLASS_PET_HATCH_CARE_ACTION_REQUIREMENT - totalCareActions);
    const growthStatusText = `当前成长值 ${growthValue}（课堂 ${scoreGrowth} + 照料 ${careGrowth}${bonusGrowth > 0 ? ` + 加成 ${bonusGrowth}` : ''}）`;

    return {
      slot_state: 'egg',
      visual_state: 'egg',
      claimed: true,
      status_label: careSummary.isDormant ? '沉睡宠物蛋' : (canHatch ? '可以孵化' : '等待孵化'),
      name: `${pet.name}蛋`,
      subtitle: careSummary.isDormant
        ? `${pet.name}蛋现在缩成一团了，需要重新赚到积分后继续照料。`
        : `已经选定 ${pet.name}，再补齐成长值和照料次数就能孵化。`,
      selected_species: pet.name,
      stage_name: '孵化准备期',
      stage_level: 0,
      stage_description: '在乐启享的课堂里，积分和照料次数都会帮助宠物完成孵化。',
      stage_color: pet.accent,
      progress: getClassEggProgress(growthValue, totalCareActions),
      growth_value: growthValue,
      growth_from_score: scoreGrowth,
      growth_from_care: careGrowth,
      growth_from_bonus: bonusGrowth,
      care_score: careSummary.careScore,
      satiety: metrics.satiety,
      mood: metrics.mood,
      cleanliness: metrics.cleanliness,
      total_care_actions: totalCareActions,
      can_hatch: canHatch,
      can_evolve: false,
      stage_unlock_level: 0,
      next_stage_level: 1,
      next_stage_name: '孵化后解锁第一阶段',
      next_action_label: '',
      stage_growth_start: 0,
      stage_growth_target: CLASS_PET_HATCH_SCORE_REQUIREMENT,
      stage_growth_progress: getClassEggProgress(growthValue, totalCareActions),
      remaining_growth_to_next_stage: missingGrowth,
      care_tip: careSummary.isDormant
        ? careSummary.tip
        : (canHatch
          ? '条件已经满足，现在可以点击孵化，让宠物正式出生。'
          : `${growthStatusText}；还差 ${missingGrowth} 点成长值和 ${missingCare} 次照料，就能完成孵化。`),
      next_target: careSummary.isDormant
        ? (careSummary.reviveHint || '先赚到积分，再用喂养、互动或清洁把它重新叫醒。')
        : (canHatch
          ? '点击“孵化”进入正式养成。'
          : `累计 ${CLASS_PET_HATCH_SCORE_REQUIREMENT} 点总成长值（课堂积分+照料成长+加成），并完成 ${CLASS_PET_HATCH_CARE_ACTION_REQUIREMENT} 次照料后孵化。`),
      feed_count: state.feedCount,
      play_count: state.playCount,
      clean_count: state.cleanCount,
      accent: pet.accent,
      theme: pet.theme,
      ...journeyEconomy
    };
  }

  if (state.evolvedAt) {
    return {
      slot_state: 'evolved',
      visual_state: 'pet',
      claimed: true,
      status_label: careSummary.isDormant ? '守护沉睡' : '守护进化',
      name: pet.name,
      subtitle: careSummary.isDormant
        ? '它已经完成进化，但最近状态见底，正在沉睡等待被重新照料。'
        : '已经完成进化，是班级里的核心守护宠物。',
      selected_species: pet.name,
      stage_name: '守护进化体',
      stage_level: CLASS_PET_MAX_LEVEL,
      stage_description: '进化后的宠物会长期保持高成长上限，适合作为班级展示亮点。',
      stage_color: '#F97316',
      progress: 100,
      growth_value: growthValue,
      growth_from_score: scoreGrowth,
      growth_from_care: careGrowth,
      growth_from_bonus: bonusGrowth,
      care_score: careSummary.careScore,
      satiety: metrics.satiety,
      mood: metrics.mood,
      cleanliness: metrics.cleanliness,
      total_care_actions: totalCareActions,
      can_hatch: false,
      can_evolve: false,
      stage_unlock_level: CLASS_PET_MAX_LEVEL,
      next_stage_level: null,
      next_stage_name: null,
      next_action_label: '',
      stage_growth_start: CLASS_PET_EVOLVE_GROWTH_REQUIREMENT,
      stage_growth_target: CLASS_PET_EVOLVE_GROWTH_REQUIREMENT,
      stage_growth_progress: 100,
      remaining_growth_to_next_stage: 0,
      care_tip: careSummary.tip,
      next_target: careSummary.isDormant
        ? (careSummary.reviveHint || '先把积分补回来，再用照料动作把它唤醒。')
        : (canClaimNextPet
          ? `已解锁第 ${slots.length + 1} 宠物位，可以继续领取新的喜欢宠物。`
          : '继续通过课堂积分和照料保持巅峰状态。'),
      feed_count: state.feedCount,
      play_count: state.playCount,
      clean_count: state.cleanCount,
      accent: pet.accent,
      theme: pet.theme,
      ...journeyEconomy
    };
  }

  const displayStage = currentStage || CLASS_PET_GROWTH_STAGES[0];

  return {
    slot_state: 'hatched',
    visual_state: 'pet',
    claimed: true,
    status_label: careSummary.isDormant ? '进入沉睡' : (canEvolve ? '可以进化' : careSummary.badge),
    name: pet.name,
    subtitle: careSummary.isDormant
      ? '它现在已经缩进沉睡状态，需要重新通过积分和照料把它叫醒。'
      : (canEvolve
        ? (nextStage?.level === CLASS_PET_MAX_LEVEL
          ? '已经满足最终进化条件，点击后才会解锁最后形态和新的收藏位。'
          : `下一阶段 ${nextStage?.name || ''} 已经准备好，点击进化后才会真正展示新形态。`)
        : `课堂积分 ${scoreGrowth} + 照料成长 ${careGrowth}，正在稳步升级。`),
    selected_species: pet.name,
    stage_name: displayStage.name,
    stage_level: displayStage.level,
    stage_description: displayStage.description,
    stage_color: displayStage.color,
    progress: stageProgress,
    growth_value: growthValue,
    growth_from_score: scoreGrowth,
    growth_from_care: careGrowth,
    growth_from_bonus: bonusGrowth,
    care_score: careSummary.careScore,
    satiety: metrics.satiety,
    mood: metrics.mood,
    cleanliness: metrics.cleanliness,
    total_care_actions: totalCareActions,
    can_hatch: false,
    can_evolve: canEvolve,
    stage_unlock_level: stageLevel,
    next_stage_level: nextStage?.level || null,
    next_stage_name: nextStage?.name || null,
    next_action_label: canEvolve ? nextActionLabel : '',
    stage_growth_start: displayStage.minGrowth,
    stage_growth_target: nextStage?.minGrowth || displayStage.maxGrowth || growthValue,
    stage_growth_progress: stageProgress,
    remaining_growth_to_next_stage: remainingGrowthToNextStage,
    care_tip: careSummary.tip,
    next_target: careSummary.isDormant
      ? (careSummary.reviveHint || '先赚到积分，再安排照料唤醒它。')
      : (canEvolve
        ? (nextStage?.level === CLASS_PET_MAX_LEVEL
          ? '点击“进化”，完成最终守护形态，并解锁新的收藏位。'
          : `点击“进化”，把当前形态推进到 ${nextStage?.name || '下一阶段'}。`)
        : (nextStage
          ? `当前阶段先累计到 ${nextStage.minGrowth} 点成长值，再点击“进化”解锁 ${nextStage.name}。`
          : '继续保持高成长状态，准备进化。')),
    feed_count: state.feedCount,
    play_count: state.playCount,
    clean_count: state.cleanCount,
    accent: pet.accent,
    theme: pet.theme,
    ...journeyEconomy
  };
};

const decorateStudentPetCollectionV2 = (student) => {
  const { slots, activeSlot } = ensureStudentPetCollectionV2(student);

  return slots.map((slot, index) => {
    const pet = getClassPetById(slot.pet_id, { allowLegacyAlias: true });
    const journey = buildPetJourneyFromSlotV2(student, slot);

    return {
      ...slot,
      slot_index: index + 1,
      is_active: activeSlot?.slot_id === slot.slot_id,
      pet,
      journey
    };
  });
};

const decorateStudentWithPetJourneyV2 = (student) => {
  const { activeSlot } = ensureStudentPetCollectionV2(student);
  const team = db.teams.find((item) => item.id === student.team_id);
  const pet = getClassPetById(activeSlot?.pet_id || student.pet_id, { allowLegacyAlias: true });
  const petJourney = buildPetJourneyFromSlotV2(student, activeSlot);
  const petCollection = decorateStudentPetCollectionV2(student);
  const petCapacity = getStudentPetCapacityV2(student);

  return {
    ...student,
    score: normalizeScore(student.score),
    team_name: team?.name || null,
    team_color: team?.color || null,
    pet_id: student.pet_id || null,
    pet_claimed_at: student.pet_claimed_at || null,
    pet_status: student.pet_status || petJourney.slot_state,
    pet_feed_count: readPetNumber(student.pet_feed_count, 0),
    pet_play_count: readPetNumber(student.pet_play_count, 0),
    pet_clean_count: readPetNumber(student.pet_clean_count, 0),
    pet_last_care_at: student.pet_last_care_at || null,
    pet_hatched_at: student.pet_hatched_at || null,
    pet_evolved_at: student.pet_evolved_at || null,
    pet_stage_level: Math.max(0, Math.floor(readPetNumber(student.pet_stage_level, 0))),
    active_pet_slot_id: student.active_pet_slot_id || null,
    pet_collection: petCollection,
    pet_capacity: petCapacity,
    pet_bonus_slots: getStudentPetBonusSlotsV2(student),
    pet_total_collected: petCollection.length,
    can_claim_more_pets: canStudentClaimAnotherPetV2(student),
    next_pet_slot_hint: getStudentNextPetSlotHintV2(student),
    pet_journey: petJourney,
    pet: pet ? {
      ...pet,
      status_label: petJourney.status_label,
      stage_name: petJourney.stage_name,
      stage_description: petJourney.stage_description,
      stage_level: petJourney.stage_level,
      stage_color: petJourney.stage_color,
      progress: petJourney.progress,
      care_score: petJourney.care_score,
      growth_value: petJourney.growth_value,
      visual_state: petJourney.visual_state
    } : null
  };
};

const repairLegacyManualPetStagesInDb = () => {
  let studentFixes = 0;
  let slotFixes = 0;
  const nowIso = new Date().toISOString();

  (db.students || []).forEach((student) => {
    const { slots, activeSlot } = ensureStudentPetCollectionV2(student);
    let studentChanged = false;

    slots.forEach((slot) => {
      if (seedLegacyPetStageProgressFromGrowthV2(student, slot, nowIso)) {
        slotFixes += 1;
        studentChanged = true;
      }
    });

    const nextActiveSlot =
      slots.find((slot) => slot.slot_id === student.active_pet_slot_id)
      || activeSlot
      || slots[0]
      || null;

    if (mergeStudentLegacyPetStateIntoSlotV2(student, nextActiveSlot)) {
      studentChanged = true;
    }

    if (studentChanged) {
      student.pet_collection = slots;
      syncStudentActivePetFieldsV2(student, nextActiveSlot);
      studentFixes += 1;
    }
  });

  if (studentFixes || slotFixes) {
    console.log(`[pet-stage-repair] seeded legacy manual stages for ${studentFixes} students / ${slotFixes} slots`);
    saveDbSync();
  }
};

repairLegacyManualPetStagesInDb();

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
  
  // 清理评分数据
  const cleanup = deleteClassArtifacts(id);
  saveDb();
  res.json({ success: true, cleanup });
});

// ============ 战队管理 API ============

app.get('/api/classes/:classId/teams', (req, res) => {
  const classId = validateId(req.params.classId);
  if (!classId) return res.status(400).json({ error: '无效的班级ID' });
  
  const teams = db.teams
    .filter(t => t.class_id === classId)
    .map(t => ({ ...t, score: normalizeScore(t.score) }));
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
    team.score = normalizeScore(team.score + delta);
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
  
  const reassignedStudents = db.students.filter((student) => student.team_id === id).length;
  db.students.forEach((student) => {
    if (student.team_id === id) student.team_id = null;
  });
  db.teams = db.teams.filter(t => t.id !== id);
  saveDb();
  res.json({ success: true, reassigned_students: reassignedStudents });
});

// ============ 学员管理 API ============

app.get('/api/classes/:classId/students', (req, res) => {
  const classId = validateId(req.params.classId);
  if (!classId) return res.status(400).json({ error: '无效的班级ID' });
  
  const students = db.students
    .filter(s => s.class_id === classId)
    .map(decorateStudentWithPetJourneyV2)
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
    pet_id: null,
    pet_claimed_at: null,
    pet_status: 'unclaimed',
    pet_satiety: CLASS_PET_DEFAULTS.pet_satiety,
    pet_mood: CLASS_PET_DEFAULTS.pet_mood,
    pet_cleanliness: CLASS_PET_DEFAULTS.pet_cleanliness,
    pet_feed_count: 0,
    pet_play_count: 0,
    pet_clean_count: 0,
    pet_bonus_growth: 0,
    pet_last_care_at: null,
    pet_hatched_at: null,
    pet_evolved_at: null,
    pet_collection: [],
    active_pet_slot_id: null,
    created_at: new Date().toISOString()
  };
  db.students.push(newStudent);
  saveDb();
  res.json(decorateStudentWithPetJourneyV2(newStudent));
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
    res.status(404).json({ error: '学员不存在' });
  }
});

app.get('/api/pets', (req, res) => {
  res.json(CLASS_PET_CATALOG);
});

/*
app.post('/api/students/:id/claim-pet', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '鏃犳晥鐨勫鍛業D' });

  const petId = validateId(req.body.pet_id);
  const overwrite = Boolean(req.body.overwrite);
  const student = db.students.find((item) => item.id === id);
  const pet = getClassPetById(petId);

  if (!student) {
    return res.status(404).json({ error: '瀛﹀憳涓嶅瓨鍦? });
  }

  if (!pet) {
    return res.status(400).json({ error: '瀹犵墿涓嶅瓨鍦? });
  }

  if (student.pet_id && student.pet_id !== pet.id && !overwrite) {
    return res.status(409).json({ error: '璇ュ鐢熷凡缁忛鍙栧叾浠栧疇鐗╋紝闇€瑕佺‘璁ゆ槸鍚︽洿鎹? });
  }

  initializeClassPet(student, pet.id);

  saveDb();
  res.json(decorateStudentWithPetJourney(student));
});

*/

app.post('/api/students/:id/claim-pet', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '学员ID无效' });

  const petId = validateId(req.body.pet_id);
  const student = db.students.find((item) => item.id === id);
  const pet = getClassPetById(petId, { allowLegacyAlias: true });

  if (!student) {
    return res.status(404).json({ error: '学员不存在' });
  }

  if (!pet) {
    return res.status(400).json({ error: '宠物不存在' });
  }

  const { slots } = ensureStudentPetCollectionV2(student);
  const existingSlot = slots.find((slot) => slot.pet_id === pet.id);

  if (existingSlot) {
    student.pet_collection = slots;
    student.active_pet_slot_id = existingSlot.slot_id;
    syncStudentActivePetFieldsV2(student, existingSlot);
    saveDb();
    return res.json(decorateStudentWithPetJourneyV2(student));
  }

  if (!canStudentClaimAnotherPetV2(student)) {
    return res.status(409).json({ error: getStudentNextPetSlotHintV2(student) });
  }

  const claimedAt = new Date().toISOString();
  const nextSlot = createClassPetSlotV2(pet.id, claimedAt, student.score);
  nextSlot.pet_stage_seeded_at = claimedAt;
  slots.push(nextSlot);
  student.pet_collection = slots;
  student.active_pet_slot_id = nextSlot.slot_id;
  syncStudentActivePetFieldsV2(student, nextSlot);

  saveDb();
  return res.json(decorateStudentWithPetJourneyV2(student));
});

app.post('/api/students/:id/pet-slots/:slotId/activate', (req, res) => {
  const id = validateId(req.params.id);
  const slotId = sanitizeString(req.params.slotId, 120);

  if (!id) {
    return res.status(400).json({ error: '学员ID无效' });
  }

  if (!slotId) {
    return res.status(400).json({ error: '宠物展台ID无效' });
  }

  const student = db.students.find((item) => item.id === id);
  if (!student) {
    return res.status(404).json({ error: '学员不存在' });
  }

  const { slots } = ensureStudentPetCollectionV2(student);
  const nextActiveSlot = slots.find((slot) => slot.slot_id === slotId);

  if (!nextActiveSlot) {
    return res.status(404).json({ error: '宠物展台不存在' });
  }

  student.pet_collection = slots;
  student.active_pet_slot_id = nextActiveSlot.slot_id;
  syncStudentActivePetFieldsV2(student, nextActiveSlot);

  saveDb();
  return res.json(decorateStudentWithPetJourneyV2(student));
});

app.post('/api/students/:id/pet/:action', (req, res) => {
  const id = validateId(req.params.id);
  const action = sanitizeString(req.params.action, 20);

  if (!id) {
    return res.status(400).json({ error: '学员ID无效' });
  }

  const student = db.students.find((item) => item.id === id);
  if (!student) {
    return res.status(404).json({ error: '学员不存在' });
  }

  const { slots, activeSlot } = ensureStudentPetCollectionV2(student);
  if (!activeSlot) {
    return res.status(400).json({ error: '该学员尚未领取宠物' });
  }

  const now = new Date();
  const persistStudent = () => {
    student.pet_collection = slots;
    syncStudentActivePetFieldsV2(student, activeSlot);
  };

  if (action === 'hatch') {
    const petJourney = buildPetJourneyFromSlotV2(student, activeSlot);
    if (activeSlot.pet_hatched_at) {
      return res.status(409).json({ error: '该宠物已完成孵化' });
    }
    if (!petJourney.can_hatch) {
      return res.status(400).json({ error: '当前未达到孵化条件，请继续培养' });
    }

    syncClassPetMetrics(activeSlot, now);
    activeSlot.pet_status = 'hatched';
    activeSlot.pet_hatched_at = now.toISOString();
    activeSlot.pet_last_care_at = now.toISOString();
    activeSlot.pet_stage_level = 1;
    activeSlot.pet_stage_seeded_at = activeSlot.pet_stage_seeded_at || now.toISOString();

    persistStudent();
    saveDb();
    return res.json(decorateStudentWithPetJourneyV2(student));
  }

  if (action === 'evolve') {
    const petJourney = buildPetJourneyFromSlotV2(student, activeSlot);
    if (!activeSlot.pet_hatched_at) {
      return res.status(400).json({ error: '宠物尚未孵化，暂时不能进化' });
    }
    if (activeSlot.pet_evolved_at) {
      return res.status(409).json({ error: '该宠物已完成进化' });
    }
    if (!petJourney.can_evolve) {
      return res.status(400).json({ error: '当前未达到进化条件，请继续培养' });
    }

    syncClassPetMetrics(activeSlot, now);
    const currentStageLevel = inferManualPetStageLevel(getClassPetStateSnapshot(activeSlot), petJourney.growth_value);
    const unlockedStage = getNextClassPetGrowthStage(currentStageLevel);
    if (!unlockedStage) {
      return res.status(409).json({ error: '当前阶段已经全部解锁' });
    }

    activeSlot.pet_stage_level = unlockedStage.level;
    activeSlot.pet_status = unlockedStage.level >= CLASS_PET_MAX_LEVEL ? 'evolved' : 'hatched';
    if (unlockedStage.level >= CLASS_PET_MAX_LEVEL) {
      activeSlot.pet_evolved_at = now.toISOString();
    }
    activeSlot.pet_last_care_at = now.toISOString();
    activeSlot.pet_stage_seeded_at = activeSlot.pet_stage_seeded_at || now.toISOString();

    persistStudent();
    saveDb();
    return res.json(decorateStudentWithPetJourneyV2(student));
  }

  const actionConfig = CLASS_PET_CARE_ACTIONS[action];
  if (!actionConfig) {
    return res.status(404).json({ error: '未找到该宠物操作' });
  }

  const currentJourney = buildPetJourneyFromSlotV2(student, activeSlot);
  const actionCost = actionConfig.scoreCost || 0;
  const currentScore = normalizeScore(student.score);

  if (currentScore < actionCost) {
    return res.status(400).json({
      error: currentJourney.is_dormant
        ? `宠物已经进入沉睡，至少先获得 ${actionCost} 积分再来唤醒。`
        : `${actionConfig.label}需要消耗 ${actionCost} 积分，当前积分不足。`
    });
  }

  syncClassPetMetrics(activeSlot, now);
  student.score = normalizeScore(currentScore - actionCost);
  activeSlot.pet_last_score_sync = student.score;
  db.scoreLogs.push({
    id: db.nextId.scoreLogs++,
    student_id: id,
    delta: -actionCost,
    reason: `宠物${actionConfig.label}`,
    type: 'pet-care',
    created_at: now.toISOString()
  });

  if (student.team_id) {
    const team = db.teams.find((item) => item.id === student.team_id);
    if (team) {
      team.score = normalizeScore(team.score - actionCost);
    }
  }

  activeSlot[actionConfig.metricKey] = clampPetMetric(
    readPetNumber(activeSlot[actionConfig.metricKey], 0) + actionConfig.amount,
    0,
    100
  );
  activeSlot[actionConfig.sideMetricKey] = clampPetMetric(
    readPetNumber(activeSlot[actionConfig.sideMetricKey], 0) + actionConfig.sideAmount,
    0,
    100
  );
  activeSlot[actionConfig.countKey] = readPetNumber(activeSlot[actionConfig.countKey], 0) + 1;
  activeSlot.pet_last_care_at = now.toISOString();
  if (!activeSlot.pet_status || activeSlot.pet_status === 'unclaimed') {
    activeSlot.pet_status = 'egg';
  }

  persistStudent();
  saveDb();
  return res.json(decorateStudentWithPetJourneyV2(student));
});

app.post('/api/students/:id/claim-pet', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的学生 ID' });

  const petId = validateId(req.body.pet_id);
  const overwrite = Boolean(req.body.overwrite);
  const student = db.students.find((item) => item.id === id);
  const pet = getClassPetById(petId);

  if (!student) {
    return res.status(404).json({ error: '未找到该学生' });
  }

  if (!pet) {
    return res.status(400).json({ error: '未找到该宠物' });
  }

  if (student.pet_id && student.pet_id !== pet.id && !overwrite) {
    return res.status(409).json({ error: '该学生已经领取过宠物，请先确认是否覆盖。' });
  }

  initializeClassPet(student, pet.id);

  saveDb();
  res.json(decorateStudentWithPetJourney(student));
});

app.post('/api/students/:id/pet/:action', (req, res) => {
  const id = validateId(req.params.id);
  const action = sanitizeString(req.params.action, 20);

  if (!id) {
    return res.status(400).json({ error: '无效的学生 ID' });
  }

  const student = db.students.find((item) => item.id === id);
  if (!student) {
    return res.status(404).json({ error: '未找到该学生' });
  }

  if (!student.pet_id) {
    return res.status(400).json({ error: '该学生还没有领取宠物' });
  }

  ensureClassPetState(student);
  const now = new Date();

  if (action === 'hatch') {
    const petJourney = buildStudentPetJourney(student);
    if (student.pet_hatched_at) {
      return res.status(409).json({ error: '该宠物已经孵化，不需要重复操作。' });
    }
    if (!petJourney.can_hatch) {
      return res.status(400).json({ error: '当前还没有达到孵化条件，请先补课堂成长值和照料次数。' });
    }

    syncClassPetMetrics(student, now);
    student.pet_status = 'hatched';
    student.pet_hatched_at = now.toISOString();
    student.pet_last_care_at = now.toISOString();

    saveDb();
    return res.json(decorateStudentWithPetJourney(student));
  }

  if (action === 'evolve') {
    const petJourney = buildStudentPetJourney(student);
    if (!student.pet_hatched_at) {
      return res.status(400).json({ error: '宠物还没有孵化，暂时不能进化。' });
    }
    if (student.pet_evolved_at) {
      return res.status(409).json({ error: '该宠物已经完成进化。' });
    }
    if (!petJourney.can_evolve) {
      return res.status(400).json({ error: '还没有达到进化条件，请继续提升成长值和照料评分。' });
    }

    syncClassPetMetrics(student, now);
    student.pet_status = 'evolved';
    student.pet_evolved_at = now.toISOString();
    student.pet_last_care_at = now.toISOString();

    saveDb();
    return res.json(decorateStudentWithPetJourney(student));
  }

  const actionConfig = CLASS_PET_CARE_ACTIONS[action];
  if (!actionConfig) {
    return res.status(404).json({ error: '未找到该宠物操作' });
  }

  syncClassPetMetrics(student, now);
  student[actionConfig.metricKey] = clampPetMetric(
    readPetNumber(student[actionConfig.metricKey], 0) + actionConfig.amount,
    0,
    100
  );
  student[actionConfig.sideMetricKey] = clampPetMetric(
    readPetNumber(student[actionConfig.sideMetricKey], 0) + actionConfig.sideAmount,
    0,
    100
  );
  student[actionConfig.countKey] = readPetNumber(student[actionConfig.countKey], 0) + 1;
  student.pet_last_care_at = now.toISOString();
  if (!student.pet_status || student.pet_status === 'unclaimed') {
    student.pet_status = 'egg';
  }

  saveDb();
  return res.json(decorateStudentWithPetJourney(student));
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
    const now = new Date();
    const nowIso = now.toISOString();
    student.score = normalizeScore(student.score + delta);
    
    db.scoreLogs.push({
      id: db.nextId.scoreLogs++,
      student_id: id,
      delta,
      reason,
      type: 'student',
      created_at: nowIso
    });
    
    // 同步更新战队积分
    if (student.team_id) {
      const team = db.teams.find(t => t.id === student.team_id);
      if (team) {
        team.score = normalizeScore(team.score + delta);
      }
    }

    const { slots, activeSlot } = ensureStudentPetCollectionV2(student);
    if (activeSlot) {
      applyStudentDebtPressureToPetSlotV2(student, activeSlot, now);
      student.pet_collection = slots;
      syncStudentActivePetFieldsV2(student, activeSlot);
    }
    
    saveDb();
    res.json(decorateStudentWithPetJourneyV2(student));
  } else {
    res.status(404).json({ error: '学员不存在' });
  }
});

app.delete('/api/students/:id', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的学员ID' });
  
  const student = db.students.find(s => s.id === id);
  if (!student) {
    return res.status(404).json({ error: '学员不存在' });
  }
  
  // 检查是否有进行中的评分会话涉及该学生
  const activeSession = db.ratingSessions.find(s => 
    s.student_id === id && s.status === 'active'
  );
  if (activeSession) {
    return res.status(400).json({ error: '该学员正在接受评分，请先结束评分后再删除' });
  }
  
  const cleanup = deleteStudentArtifacts(id);
  db.students = db.students.filter(s => s.id !== id);
  saveDb();
  res.json({ success: true, cleanup });
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
        score: normalizeScore(s.score),
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
      score: normalizeScore(t.score),
      member_count: db.students.filter(s => s.team_id === t.id).length
    }))
    .sort((a, b) => b.score - a.score);
  res.json(teams);
});

// ============ 展示评分 API ============

// 创建评分会话（发起对某学生的打分）
app.post('/api/rating-sessions', (req, res) => {
  const class_id = validateId(req.body.class_id);
  const student_id = validateId(req.body.student_id);
  
  if (!class_id || !student_id) {
    return res.status(400).json({ error: '缺少班级ID或学员ID' });
  }
  
  // 检查是否已有进行中的会话
  const activeSession = db.ratingSessions.find(s => s.class_id === class_id && s.status === 'active');
  if (activeSession) {
    return res.status(400).json({ error: '当前班级已有进行中的评分，请先结束' });
  }
  
  const student = db.students.find(s => s.id === student_id);
  if (!student) {
    return res.status(404).json({ error: '学员不存在' });
  }
  
  const newSession = {
    id: db.nextId.ratingSessions++,
    class_id,
    student_id,
    student_name: student.name,
    student_avatar: student.avatar,
    status: 'active',
    created_at: new Date().toISOString(),
    closed_at: null,
    total_score: 0,
    avg_score: 0,
    applied_to_student: false
  };
  
  db.ratingSessions.push(newSession);
  saveDb();
  res.json(newSession);
});

// 获取班级所有评分会话
app.get('/api/classes/:classId/rating-sessions', (req, res) => {
  const classId = validateId(req.params.classId);
  if (!classId) return res.status(400).json({ error: '无效的班级ID' });
  
  const sessions = db.ratingSessions
    .filter(s => s.class_id === classId)
    .map(s => {
      const votes = db.ratingVotes.filter(v => v.session_id === s.id);
      return {
        ...s,
        vote_count: votes.length
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json(sessions);
});

// 获取当前进行中的评分会话
app.get('/api/classes/:classId/active-session', (req, res) => {
  const classId = validateId(req.params.classId);
  if (!classId) return res.status(400).json({ error: '无效的班级ID' });
  
  const session = db.ratingSessions.find(s => s.class_id === classId && s.status === 'active');
  
  if (!session) {
    return res.json(null);
  }
  
  // 获取所有打分记录（不包含打分者姓名，匿名展示）
  const votes = db.ratingVotes
    .filter(v => v.session_id === session.id)
    .map(v => ({
      id: v.id,
      score: v.score,
      created_at: v.created_at
    }));
  
  res.json({
    ...session,
    votes,
    vote_count: votes.length
  });
});

// 获取会话详情（含所有打分，管理员用）
app.get('/api/rating-sessions/:id', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的会话ID' });
  
  const session = db.ratingSessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  // 获取所有打分记录（包含打分者姓名，供管理员查看）
  const votes = db.ratingVotes
    .filter(v => v.session_id === id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  // 获取班级学员数量（用于显示打分进度）
  const totalStudents = db.students.filter(s => s.class_id === session.class_id).length;
  
  res.json({
    ...session,
    votes,
    vote_count: votes.length,
    total_students: totalStudents
  });
});

// 提交打分
app.post('/api/rating-sessions/:id/vote', (req, res) => {
  const sessionId = validateId(req.params.id);
  if (!sessionId) return res.status(400).json({ error: '无效的会话ID' });
  
  const voter_name = sanitizeString(req.body.voter_name, 20);
  const score = parseInt(req.body.score);
  
  if (!voter_name) {
    return res.status(400).json({ error: '请选择你的姓名' });
  }
  
  if (isNaN(score) || score < 0 || score > 10) {
    return res.status(400).json({ error: '分数必须在0-10之间' });
  }
  
  const session = db.ratingSessions.find(s => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: '评分会话不存在' });
  }
  
  if (session.status !== 'active') {
    return res.status(400).json({ error: '评分已结束' });
  }
  
  // 验证打分者是否在本班学员名单中
  const voter = db.students.find(s => s.class_id === session.class_id && s.name === voter_name);
  if (!voter) {
    return res.status(400).json({ error: '你不在本班学员名单中' });
  }
  
  // 不允许给自己打分
  if (voter_name === session.student_name) {
    return res.status(400).json({ error: '不能给自己打分' });
  }
  
  // 检查是否已经打过分
  const existingVote = db.ratingVotes.find(v => v.session_id === sessionId && v.voter_name === voter_name);
  if (existingVote) {
    return res.status(400).json({ error: '你已经打过分了', voted: true, your_score: existingVote.score });
  }
  
  const newVote = {
    id: db.nextId.ratingVotes++,
    session_id: sessionId,
    voter_name,
    score,
    created_at: new Date().toISOString(),
    is_excluded: false
  };
  
  db.ratingVotes.push(newVote);
  saveDb();
  
  res.json({ success: true, vote: { id: newVote.id, score: newVote.score } });
});

// 检查用户是否已打分
app.get('/api/rating-sessions/:id/check-voted', (req, res) => {
  const sessionId = validateId(req.params.id);
  const voter_name = sanitizeString(req.query.voter_name, 20);
  
  if (!sessionId || !voter_name) {
    return res.status(400).json({ error: '参数不完整' });
  }
  
  const vote = db.ratingVotes.find(v => v.session_id === sessionId && v.voter_name === voter_name);
  
  res.json({
    voted: !!vote,
    your_score: vote?.score || null
  });
});

// 删除打分记录（管理员用）
app.delete('/api/rating-votes/:id', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的记录ID' });
  
  const vote = db.ratingVotes.find(v => v.id === id);
  if (!vote) {
    return res.status(404).json({ error: '记录不存在' });
  }
  
  // 检查会话是否已结束
  const session = db.ratingSessions.find(s => s.id === vote.session_id);
  if (session && session.status === 'closed') {
    return res.status(400).json({ error: '评分已结束，无法删除' });
  }
  
  db.ratingVotes = db.ratingVotes.filter(v => v.id !== id);
  saveDb();
  res.json({ success: true });
});

// 编辑打分记录（管理员用）
app.patch('/api/rating-votes/:id', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的记录ID' });
  
  const score = parseInt(req.body.score);
  if (isNaN(score) || score < 0 || score > 10) {
    return res.status(400).json({ error: '分数必须在0-10之间' });
  }
  
  const vote = db.ratingVotes.find(v => v.id === id);
  if (!vote) {
    return res.status(404).json({ error: '记录不存在' });
  }
  
  // 检查会话是否已结束
  const session = db.ratingSessions.find(s => s.id === vote.session_id);
  if (session && session.status === 'closed') {
    return res.status(400).json({ error: '评分已结束，无法编辑' });
  }
  
  vote.score = score;
  saveDb();
  res.json({ success: true, vote });
});

// 结束评分会话并计算最终分数
app.patch('/api/rating-sessions/:id/close', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的会话ID' });
  
  const session = db.ratingSessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }

  // 获取所有打分记录
  const votes = db.ratingVotes.filter(v => v.session_id === id);
  const buildSessionPayload = (extra = {}) => ({
    ...session,
    ...extra,
    votes: votes.map(v => ({ id: v.id, score: v.score, is_excluded: Boolean(v.is_excluded) })),
    vote_count: votes.length,
    total_students: db.students.filter((student) => student.class_id === session.class_id).length
  });

  if (session.status === 'closed') {
    return res.json(buildSessionPayload({ already_closed: true }));
  }
  
  if (votes.length === 0) {
    return res.status(400).json({ error: '还没有人打分，无法结束' });
  }
  
  // 计算总分
  const scores = votes.map(v => v.score);
  const totalScore = scores.reduce((a, b) => a + b, 0);
  
  // 计算平均分（去掉最高最低）
  let avgScore;
  votes.forEach((vote) => {
    vote.is_excluded = false;
  });
  if (votes.length <= 2) {
    // 人数不足，直接取平均
    avgScore = totalScore / votes.length;
  } else {
    // 排序并标记最高最低
    const sortedVotes = [...votes].sort((a, b) => a.score - b.score);
    const minVote = sortedVotes[0];
    const maxVote = sortedVotes[sortedVotes.length - 1];
    
    // 标记被排除的打分
    minVote.is_excluded = true;
    maxVote.is_excluded = true;
    
    // 计算去掉最高最低后的平均分
    const validScores = sortedVotes.slice(1, -1).map(v => v.score);
    avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
  }
  
  // 四舍五入保留一位小数
  avgScore = normalizeScore(avgScore);
  
  // 更新会话状态
  session.status = 'closed';
  session.closed_at = new Date().toISOString();
  session.total_score = normalizeScore(totalScore);
  session.avg_score = avgScore;
  
  // 将平均分累加到学生积分
  const student = db.students.find(s => s.id === session.student_id);
  if (student && !session.applied_to_student) {
    student.score = normalizeScore(student.score + avgScore);
    session.applied_to_student = true;
    
    // 记录到积分日志
    db.scoreLogs.push({
      id: db.nextId.scoreLogs++,
      student_id: session.student_id,
      delta: avgScore,
      reason: '展示评分',
      type: 'rating',
      created_at: new Date().toISOString()
    });
    
    // 同步更新战队积分
    if (student.team_id) {
      const team = db.teams.find(t => t.id === student.team_id);
      if (team) {
        team.score = normalizeScore(team.score + avgScore);
      }
    }
  }
  
  saveDb();
  
  res.json(buildSessionPayload());
});

// 获取展示评分排行榜
app.get('/api/classes/:classId/rating-leaderboard', (req, res) => {
  const classId = validateId(req.params.classId);
  if (!classId) return res.status(400).json({ error: '无效的班级ID' });
  
  // 获取所有已结束的评分会话
  const closedSessions = db.ratingSessions
    .filter(s => s.class_id === classId && s.status === 'closed')
    .map(s => {
      const votes = db.ratingVotes.filter(v => v.session_id === s.id);
      return {
        id: s.id,
        student_id: s.student_id,
        student_name: s.student_name,
        student_avatar: s.student_avatar,
        total_score: normalizeScore(s.total_score),
        avg_score: normalizeScore(s.avg_score),
        vote_count: votes.length,
        created_at: s.created_at
      };
    })
    .sort((a, b) => b.avg_score - a.avg_score);
  
  res.json(closedSessions);
});

// 取消评分会话（不计分，直接删除）
app.patch('/api/rating-sessions/:id/cancel', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的会话ID' });
  
  const session = db.ratingSessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  if (session.status === 'closed') {
    return res.status(400).json({ error: '评分已结束，无法取消' });
  }
  
  // 删除相关打分记录
  db.ratingVotes = db.ratingVotes.filter(v => v.session_id !== id);
  // 删除会话
  db.ratingSessions = db.ratingSessions.filter(s => s.id !== id);
  
  saveDb();
  res.json({ success: true, message: '评分已取消' });
});

// 删除评分会话（管理员用）
app.delete('/api/rating-sessions/:id', (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的会话ID' });
  
  const session = db.ratingSessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  // 删除相关打分记录
  db.ratingVotes = db.ratingVotes.filter(v => v.session_id !== id);
  // 删除会话
  db.ratingSessions = db.ratingSessions.filter(s => s.id !== id);
  
  saveDb();
  res.json({ success: true });
});

// ============ 奖惩配置 API ============

app.get('/api/rewards', (req, res) => {
  res.json(db.rewards.filter(r => r.is_active));
});

app.get('/api/punishments', (req, res) => {
  res.json(db.punishments.filter(p => p.is_active));
});

const normalizeLotteryTargetType = (targetType) => (targetType === 'team' ? 'team' : 'student');

const getLotteryEffectValues = (item = {}) => ({
  score_delta: normalizeScore(Number(item?.score_delta) || 0),
  pet_growth_delta: Math.round(Number(item?.pet_growth_delta) || 0),
  pet_satiety_delta: Math.round(Number(item?.pet_satiety_delta) || 0),
  pet_mood_delta: Math.round(Number(item?.pet_mood_delta) || 0),
  pet_cleanliness_delta: Math.round(Number(item?.pet_cleanliness_delta) || 0),
  pet_bonus_slot_delta: Math.round(Number(item?.pet_bonus_slot_delta) || 0)
});

const hasLotteryPetMetricEffects = (effects = {}) => (
  LOTTERY_PET_EFFECT_FIELDS.some((field) => Number(effects?.[field] || 0) !== 0)
);

const formatSignedValue = (value) => {
  const numericValue = normalizeScore(value);
  if (!numericValue) return '0';
  return numericValue > 0 ? `+${numericValue}` : `${numericValue}`;
};

const createScoreLogEntry = ({
  studentId = null,
  teamId = null,
  delta = 0,
  reason = '',
  type = 'student',
  createdAt = new Date().toISOString()
}) => ({
  id: db.nextId.scoreLogs++,
  ...(studentId ? { student_id: studentId } : {}),
  ...(teamId ? { team_id: teamId } : {}),
  delta: normalizeScore(delta),
  reason,
  type,
  created_at: createdAt
});

const applyStudentScoreDelta = (student, delta, reason, createdAt) => {
  const normalizedDelta = normalizeScore(delta);
  if (!student || !normalizedDelta) {
    return { team: null, delta: 0 };
  }

  student.score = normalizeScore(student.score + normalizedDelta);
  db.scoreLogs.push(createScoreLogEntry({
    studentId: student.id,
    delta: normalizedDelta,
    reason,
    type: 'student',
    createdAt
  }));

  let team = null;
  if (student.team_id) {
    team = db.teams.find((item) => item.id === student.team_id) || null;
    if (team) {
      team.score = normalizeScore(team.score + normalizedDelta);
    }
  }

  return { team, delta: normalizedDelta };
};

const applyTeamScoreDelta = (team, delta, reason, createdAt) => {
  const normalizedDelta = normalizeScore(delta);
  if (!team || !normalizedDelta) {
    return 0;
  }

  team.score = normalizeScore(team.score + normalizedDelta);
  db.scoreLogs.push(createScoreLogEntry({
    teamId: team.id,
    delta: normalizedDelta,
    reason,
    type: 'team',
    createdAt
  }));

  return normalizedDelta;
};

const applyPetEffectsToActiveSlot = (activeSlot, effectSource, now = new Date()) => {
  const requestedEffects = getLotteryEffectValues(effectSource);
  const requested = hasLotteryPetMetricEffects(requestedEffects);

  const result = {
    requested,
    applied: false,
    pet_growth_delta: 0,
    pet_satiety_delta: 0,
    pet_mood_delta: 0,
    pet_cleanliness_delta: 0
  };

  if (!activeSlot || !requested) {
    return result;
  }

  syncClassPetMetrics(activeSlot, now);

  const previousBonusGrowth = Math.max(0, Math.round(readPetNumber(activeSlot.pet_bonus_growth, 0)));
  const previousSatiety = clampPetMetric(readPetNumber(activeSlot.pet_satiety, CLASS_PET_DEFAULTS.pet_satiety), 0, 100);
  const previousMood = clampPetMetric(readPetNumber(activeSlot.pet_mood, CLASS_PET_DEFAULTS.pet_mood), 0, 100);
  const previousCleanliness = clampPetMetric(readPetNumber(activeSlot.pet_cleanliness, CLASS_PET_DEFAULTS.pet_cleanliness), 0, 100);

  const nextBonusGrowth = Math.max(0, previousBonusGrowth + requestedEffects.pet_growth_delta);
  const nextSatiety = clampPetMetric(previousSatiety + requestedEffects.pet_satiety_delta, 0, 100);
  const nextMood = clampPetMetric(previousMood + requestedEffects.pet_mood_delta, 0, 100);
  const nextCleanliness = clampPetMetric(previousCleanliness + requestedEffects.pet_cleanliness_delta, 0, 100);

  activeSlot.pet_bonus_growth = nextBonusGrowth;
  activeSlot.pet_satiety = nextSatiety;
  activeSlot.pet_mood = nextMood;
  activeSlot.pet_cleanliness = nextCleanliness;

  result.pet_growth_delta = nextBonusGrowth - previousBonusGrowth;
  result.pet_satiety_delta = nextSatiety - previousSatiety;
  result.pet_mood_delta = nextMood - previousMood;
  result.pet_cleanliness_delta = nextCleanliness - previousCleanliness;

  if (hasLotteryPetMetricEffects(result)) {
    result.applied = true;
    activeSlot.pet_last_care_at = now.toISOString();
    if (!activeSlot.pet_status || activeSlot.pet_status === 'unclaimed') {
      activeSlot.pet_status = 'egg';
    }
  }

  return result;
};

const applyPetBonusSlotEffectToStudent = (student, effectSource) => {
  const requestedEffects = getLotteryEffectValues(effectSource);
  const requestedDelta = Math.round(Number(requestedEffects.pet_bonus_slot_delta || 0));
  const result = {
    requested: requestedDelta !== 0,
    applied: false,
    pet_bonus_slot_delta: 0
  };

  if (!student || !requestedDelta) {
    return result;
  }

  const previousBonusSlots = getStudentPetBonusSlotsV2(student);
  const nextBonusSlots = Math.max(0, Math.min(MAX_CLASS_PET_SLOTS_V2 - 1, previousBonusSlots + requestedDelta));
  student.pet_bonus_slots = nextBonusSlots;
  result.pet_bonus_slot_delta = nextBonusSlots - previousBonusSlots;
  result.applied = result.pet_bonus_slot_delta !== 0;
  return result;
};

const buildLotteryEffectSummary = ({
  targetType = 'student',
  effects = {},
  petEffectRequested = false,
  petEffectTargets = 0
}) => {
  const normalizedTargetType = normalizeLotteryTargetType(targetType);
  const effectValues = getLotteryEffectValues(effects);
  const summaryParts = [];

  if (effectValues.score_delta) {
    summaryParts.push(`${normalizedTargetType === 'team' ? '战队积分' : '学员积分'} ${formatSignedValue(effectValues.score_delta)}`);
  }
  if (effectValues.pet_growth_delta) {
    summaryParts.push(`宠物成长 ${formatSignedValue(effectValues.pet_growth_delta)}`);
  }
  if (effectValues.pet_satiety_delta) {
    summaryParts.push(`饱腹 ${formatSignedValue(effectValues.pet_satiety_delta)}`);
  }
  if (effectValues.pet_mood_delta) {
    summaryParts.push(`心情 ${formatSignedValue(effectValues.pet_mood_delta)}`);
  }
  if (effectValues.pet_cleanliness_delta) {
    summaryParts.push(`清洁 ${formatSignedValue(effectValues.pet_cleanliness_delta)}`);
  }
  if (effectValues.pet_bonus_slot_delta) {
    summaryParts.push(`宠物位 ${formatSignedValue(effectValues.pet_bonus_slot_delta)}`);
  }

  if (petEffectRequested) {
    if (petEffectTargets <= 0) {
      summaryParts.push(
        normalizedTargetType === 'team'
          ? '宠物效果未生效（队员暂无激活宠物）'
          : '宠物效果未生效（暂无激活宠物）'
      );
    } else if (normalizedTargetType === 'team') {
      summaryParts.push(`已影响 ${petEffectTargets} 只激活宠物`);
    }
  }

  return uniqueStrings(summaryParts).join(' · ');
};

const createLotteryLogEntry = ({
  classId,
  targetType = 'student',
  targetId = null,
  targetName = '',
  teamId = null,
  teamName = '',
  type = 'reward',
  item = {},
  effectSummary = '',
  effects = {},
  petAffectedCount = 0,
  createdAt = new Date().toISOString()
}) => {
  const normalizedTargetType = normalizeLotteryTargetType(targetType);
  const normalizedEffects = getLotteryEffectValues(effects && Object.keys(effects).length ? effects : item);
  const normalizedTeamId = validateId(teamId);
  const normalizedTargetId = validateId(targetId);
  const normalizedTargetName = sanitizeString(
    targetName || teamName || (normalizedTargetType === 'team' ? '未指定战队' : '未指定学员'),
    60
  );
  const normalizedTeamName = sanitizeString(teamName || (normalizedTargetType === 'team' ? normalizedTargetName : ''), 60);

  return {
    id: db.nextId.lotteryLogs++,
    class_id: classId,
    target_type: normalizedTargetType,
    target_id: normalizedTargetId,
    target_name: normalizedTargetName,
    team_id: normalizedTeamId || (normalizedTargetType === 'team' ? normalizedTargetId : null),
    team_name: normalizedTeamName || null,
    type,
    item_id: validateId(item?.id),
    item_name: sanitizeString(item?.name || '未命名奖惩', 80),
    item_icon: sanitizeString(item?.icon || (type === 'reward' ? '🎁' : '🎭'), 12),
    score_delta: normalizedEffects.score_delta,
    pet_growth_delta: normalizedEffects.pet_growth_delta,
    pet_satiety_delta: normalizedEffects.pet_satiety_delta,
    pet_mood_delta: normalizedEffects.pet_mood_delta,
    pet_cleanliness_delta: normalizedEffects.pet_cleanliness_delta,
    pet_bonus_slot_delta: normalizedEffects.pet_bonus_slot_delta,
    pet_affected_count: Math.max(0, Math.floor(Number(petAffectedCount) || 0)),
    effect_summary: sanitizeString(effectSummary, 200),
    created_at: createdAt
  };
};

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

app.post('/api/lottery/execute', (req, res) => {
  const classId = validateId(req.body.class_id);
  const targetId = validateId(req.body.target_id);
  const itemId = validateId(req.body.item_id);
  const targetType = normalizeLotteryTargetType(req.body.target_type);
  const type = req.body.type === 'punishment' ? 'punishment' : 'reward';

  if (!classId) {
    return res.status(400).json({ error: '无效的班级ID' });
  }
  if (!targetId) {
    return res.status(400).json({ error: '无效的抽奖对象ID' });
  }
  if (!itemId) {
    return res.status(400).json({ error: '无效的奖惩项ID' });
  }

  const catalog = type === 'reward' ? db.rewards : db.punishments;
  const item = catalog.find((entry) => entry.id === itemId && entry.is_active !== false);
  if (!item) {
    return res.status(404).json({ error: type === 'reward' ? '未找到奖励配置' : '未找到惩罚配置' });
  }

  const configuredEffects = getLotteryEffectValues(item);
  const reason = `抽奖${type === 'reward' ? '奖励' : '惩罚'}：${item.name}`;
  const now = new Date();
  const createdAt = now.toISOString();

  if (targetType === 'student') {
    const student = db.students.find((entry) => entry.id === targetId && entry.class_id === classId);
    if (!student) {
      return res.status(404).json({ error: '未找到该学员' });
    }

    const scoreResult = applyStudentScoreDelta(student, configuredEffects.score_delta, reason, createdAt);
    const { slots, activeSlot } = ensureStudentPetCollectionV2(student);

    if (activeSlot && configuredEffects.score_delta) {
      applyStudentDebtPressureToPetSlotV2(student, activeSlot, now);
    }

    const appliedPetEffects = applyPetEffectsToActiveSlot(activeSlot, configuredEffects, now);
    const appliedPetSlotEffect = applyPetBonusSlotEffectToStudent(student, configuredEffects);

    student.pet_collection = slots;
    if (activeSlot) {
      syncStudentActivePetFieldsV2(student, activeSlot);
    }

    const appliedEffects = {
      score_delta: scoreResult.delta,
      pet_growth_delta: appliedPetEffects.pet_growth_delta,
      pet_satiety_delta: appliedPetEffects.pet_satiety_delta,
      pet_mood_delta: appliedPetEffects.pet_mood_delta,
      pet_cleanliness_delta: appliedPetEffects.pet_cleanliness_delta,
      pet_bonus_slot_delta: appliedPetSlotEffect.pet_bonus_slot_delta
    };

    const effectSummary = buildLotteryEffectSummary({
      targetType,
      effects: appliedEffects,
      petEffectRequested: appliedPetEffects.requested,
      petEffectTargets: appliedPetEffects.applied ? 1 : 0
    });

    const log = createLotteryLogEntry({
      classId,
      targetType,
      targetId: student.id,
      targetName: student.name,
      teamId: student.team_id,
      teamName: scoreResult.team?.name || db.teams.find((entry) => entry.id === student.team_id)?.name || '',
      type,
      item,
      effectSummary,
      effects: appliedEffects,
      petAffectedCount: appliedPetEffects.applied ? 1 : 0,
      createdAt
    });

    db.lotteryLogs.push(log);
    saveDb();

    return res.json({
      success: true,
      item,
      log,
      student: decorateStudentWithPetJourneyV2(student),
      team: scoreResult.team || null
    });
  }

  const team = db.teams.find((entry) => entry.id === targetId && entry.class_id === classId);
  if (!team) {
    return res.status(404).json({ error: '未找到该战队' });
  }

  const appliedScoreDelta = applyTeamScoreDelta(team, configuredEffects.score_delta, reason, createdAt);
  const teamStudents = db.students.filter((entry) => entry.class_id === classId && entry.team_id === team.id);

  const accumulatedPetEffects = {
    pet_growth_delta: 0,
    pet_satiety_delta: 0,
    pet_mood_delta: 0,
    pet_cleanliness_delta: 0
  };
  let affectedPetCount = 0;

  teamStudents.forEach((student) => {
    const { slots, activeSlot } = ensureStudentPetCollectionV2(student);
    const appliedPetEffects = applyPetEffectsToActiveSlot(activeSlot, configuredEffects, now);

    if (activeSlot) {
      student.pet_collection = slots;
      syncStudentActivePetFieldsV2(student, activeSlot);
    }

    if (appliedPetEffects.applied) {
      affectedPetCount += 1;
    }

    accumulatedPetEffects.pet_growth_delta += appliedPetEffects.pet_growth_delta;
    accumulatedPetEffects.pet_satiety_delta += appliedPetEffects.pet_satiety_delta;
    accumulatedPetEffects.pet_mood_delta += appliedPetEffects.pet_mood_delta;
    accumulatedPetEffects.pet_cleanliness_delta += appliedPetEffects.pet_cleanliness_delta;
  });

  const appliedEffects = {
    score_delta: appliedScoreDelta,
    pet_growth_delta: accumulatedPetEffects.pet_growth_delta,
    pet_satiety_delta: accumulatedPetEffects.pet_satiety_delta,
    pet_mood_delta: accumulatedPetEffects.pet_mood_delta,
    pet_cleanliness_delta: accumulatedPetEffects.pet_cleanliness_delta,
    pet_bonus_slot_delta: 0
  };

  const effectSummary = buildLotteryEffectSummary({
    targetType,
    effects: appliedEffects,
    petEffectRequested: hasLotteryPetMetricEffects(configuredEffects),
    petEffectTargets: affectedPetCount
  });

  const log = createLotteryLogEntry({
    classId,
    targetType,
    targetId: team.id,
    targetName: team.name,
    teamId: team.id,
    teamName: team.name,
    type,
    item,
    effectSummary,
    effects: appliedEffects,
    petAffectedCount: affectedPetCount,
    createdAt
  });

  db.lotteryLogs.push(log);
  saveDb();

  return res.json({
    success: true,
    item,
    log,
    team,
    affected_pet_count: affectedPetCount
  });
});

// 添加抽奖记录
app.post('/api/lottery-logs', (req, res) => {
  const classId = validateId(req.body.class_id);
  const targetType = normalizeLotteryTargetType(req.body.target_type || (req.body.team_id ? 'team' : 'student'));
  const teamId = validateId(req.body.team_id);
  const targetId = validateId(req.body.target_id) || teamId;
  const type = req.body.type === 'punishment' ? 'punishment' : 'reward';

  if (!classId) {
    return res.status(400).json({ error: '无效的班级ID' });
  }

  const newLog = createLotteryLogEntry({
    classId,
    targetType,
    targetId,
    targetName: req.body.target_name || req.body.team_name || '',
    teamId,
    teamName: req.body.team_name || '',
    type,
      item: {
        id: req.body.item_id,
        name: req.body.item_name,
        icon: req.body.item_icon,
        score_delta: req.body.score_delta,
        pet_growth_delta: req.body.pet_growth_delta,
        pet_satiety_delta: req.body.pet_satiety_delta,
        pet_mood_delta: req.body.pet_mood_delta,
        pet_cleanliness_delta: req.body.pet_cleanliness_delta,
        pet_bonus_slot_delta: req.body.pet_bonus_slot_delta
      },
      effectSummary: req.body.effect_summary || '',
      effects: {
        score_delta: req.body.score_delta,
        pet_growth_delta: req.body.pet_growth_delta,
        pet_satiety_delta: req.body.pet_satiety_delta,
        pet_mood_delta: req.body.pet_mood_delta,
        pet_cleanliness_delta: req.body.pet_cleanliness_delta,
        pet_bonus_slot_delta: req.body.pet_bonus_slot_delta
      },
    petAffectedCount: req.body.pet_affected_count
  });

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
  const plainPin = getAdminPinCandidate();
  
  // 使用哈希验证（防止时序攻击）
  let isValid = false;
  
  if (secureConfig.ADMIN_PIN_HASH) {
    // 使用哈希验证
    isValid = security.verifyPassword(pin, secureConfig.ADMIN_PIN_HASH);
  } else if (plainPin) {
    // 兼容旧配置：直接比较后升级为哈希
    isValid = pin === plainPin;
    
    // 首次验证成功后，升级为哈希存储
    if (isValid && !secureConfig.ADMIN_PIN_HASH) {
      secureConfig.ADMIN_PIN_HASH = security.hashPassword(plainPin);
      secureConfig.ADMIN_PIN = null;
      security.saveSecureConfig(secureConfig);
      console.log('✅ 管理员密码已升级为安全哈希存储');
    }
  }
  
  // 添加随机延迟（50-150ms），进一步防止时序攻击
  const delay = 50 + Math.random() * 100;
  setTimeout(() => {
    if (!isValid) {
      return res.json({ success: false });
    }

    const token = createAdminSessionToken();
    return res.json({
      success: true,
      token,
      expires_at: Date.now() + ADMIN_SESSION_TTL_MS
    });
  }, delay);
});

// 修改管理员密码
app.get('/api/admin/session', (req, res) => {
  res.json({
    success: true,
    expires_at: req.adminSession?.expires_at || null
  });
});

app.post('/api/admin/change-password', adminLimiter, (req, res) => {
  const { currentPin, newPin } = req.body;
  const current = sanitizeString(currentPin, 20);
  const newPassword = sanitizeString(newPin, 20);

  if (isAdminPinManagedByEnv()) {
    return res.status(409).json({ error: '当前管理员密码由 ADMIN_PIN 环境变量固定，请先修改服务器环境变量后再重启服务。' });
  }
  
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
    isValid = current === getAdminPinCandidate();
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

const resolvePkMatchTeams = (classCtx, leftTeamId, rightTeamId) => {
  const leftTeam = classCtx.teams.find((team) => team.id === leftTeamId) || classCtx.teams[0];
  let rightTeam = classCtx.teams.find((team) => team.id === rightTeamId && team.id !== leftTeam?.id);
  if (!rightTeam) {
    rightTeam = classCtx.teams.find((team) => team.id !== leftTeam?.id) || classCtx.teams[1] || null;
  }
  return { leftTeam: leftTeam || null, rightTeam };
};

const getPkAiProviderStatus = () => {
  const miniReady = Boolean(MINIMAX_API_KEY);
  const deepseekReady = Boolean(DEEPSEEK_API_KEY);
  return {
    minimax: {
      enabled: miniReady,
      model: 'MiniMax-M2.7'
    },
    deepseek: {
      enabled: deepseekReady,
      model: 'deepseek-chat'
    },
    can_generate_ai: miniReady || deepseekReady
  };
};

// 拔河答题赛配置选项
app.get('/api/pk/options', (req, res) => {
  res.json({
    subjects: SUBJECT_OPTIONS,
    grades: GRADE_OPTIONS,
    question_types: QUESTION_TYPE_OPTIONS,
    templates: QUICK_TEMPLATES,
    defaults: {
      duration_sec: TUG_OF_WAR_DURATION_SEC,
      question_count: DEFAULT_QUESTION_COUNT,
      min_question_count: MIN_QUESTION_COUNT,
      max_question_count: MAX_QUESTION_COUNT
    },
    ai_providers: getPkAiProviderStatus()
  });
});

// 拔河答题赛：班级战队上下文
app.get('/api/pk/classes/:classId/context', (req, res) => {
  const classCtx = buildTugClassTeams(req.params.classId);
  if (!classCtx) {
    return res.status(404).json({ error: '未找到班级信息' });
  }

  res.json({
    class_id: classCtx.classId,
    class_name: classCtx.className,
    teams: classCtx.teams,
    ready: classCtx.teams.length >= 2,
    message: classCtx.teams.length >= 2
      ? 'ok'
      : '该班级战队数量不足，请先创建至少两个战队'
  });
});

// 题库列表（支持搜索和筛选）
app.get('/api/pk/question-banks', (req, res) => {
  const classId = validateId(req.query.class_id || req.query.classId);
  const keyword = sanitizeString(req.query.keyword || req.query.q || '', 60);
  const subject = sanitizeString(req.query.subject || '', 40);
  const grade = sanitizeString(req.query.grade || '', 20);
  const questionType = sanitizeString(req.query.question_type || req.query.questionType || '', 30);
  const source = sanitizeString(req.query.source || '', 60);

  const banks = queryPkQuestionBanks({
    classId,
    keyword,
    subject,
    grade,
    questionType,
    source
  });

  res.json({
    class_id: classId || null,
    keyword,
    total: banks.length,
    items: banks.map((item) => summarizePkQuestionBank(item)),
    filters: buildPkQuestionBankFilterMeta(banks)
  });
});

// 单个题库详情
app.get('/api/pk/question-banks/:id', (req, res) => {
  const bank = getPkQuestionBankById(req.params.id);
  if (!bank) {
    return res.status(404).json({ error: '题库不存在' });
  }

  const classId = validateId(req.query.class_id || req.query.classId);
  if (bank.scope === 'class' && Number(bank.class_id) !== Number(classId)) {
    return res.status(404).json({ error: '题库不存在或不属于该班级' });
  }

  const safeBank = buildDisplayReadyPkQuestionBank(bank) || bank;
  return res.json({
    ...summarizePkQuestionBank(safeBank),
    questions: Array.isArray(safeBank.questions) ? safeBank.questions : []
  });
});

// 编辑并保存题库（支持手动二次修订）
app.put('/api/pk/question-banks/:id', (req, res) => {
  const classId = validateId(req.body.class_id || req.body.classId || req.query.class_id || req.query.classId);
  const bank = getPkQuestionBankById(req.params.id);
  if (!bank) {
    return res.status(404).json({ error: '题库不存在' });
  }
  if (bank.scope === 'class' && Number(bank.class_id) !== Number(classId)) {
    return res.status(403).json({ error: '不能编辑其他班级的私有题库' });
  }

  try {
    if (req.body.title !== undefined || req.body.description !== undefined) {
      updatePkQuestionBankMeta(bank, {
        title: req.body.title,
        description: req.body.description
      });
    }

    if (req.body.questions !== undefined) {
      replacePkQuestionBankQuestions(
        bank,
        req.body.questions,
        req.body.source_provider || bank.source_provider || 'manual'
      );
      bank.generated_by = sanitizeString(req.body.generated_by || 'manual', 40) || 'manual';
    }

    saveDb();
    return res.json({
      message: '题库保存成功',
      bank: {
        ...summarizePkQuestionBank(bank),
        questions: Array.isArray(bank.questions) ? bank.questions : []
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || '题库保存失败' });
  }
});

// 删除题库（仅允许删除当前班级私有题库）
app.delete('/api/pk/question-banks/:id', (req, res) => {
  const classId = validateId(req.body?.class_id || req.body?.classId || req.query.class_id || req.query.classId);
  const bank = getPkQuestionBankById(req.params.id);
  if (!bank) {
    return res.status(404).json({ error: '题库不存在' });
  }

  const scope = bank.scope || (validateId(bank.class_id) ? 'class' : 'global');
  if (scope !== 'class') {
    return res.status(403).json({ error: '系统标准题库不支持删除' });
  }
  if (Number(bank.class_id) !== Number(classId)) {
    return res.status(403).json({ error: '不能删除其他班级的题库' });
  }

  const removed = deletePkQuestionBank(bank.id);
  if (!removed) {
    return res.status(404).json({ error: '题库不存在或已删除' });
  }

  return res.json({
    message: '题库已删除',
    deleted_id: removed.id
  });
});

app.post('/api/pk/question-banks/:id/questions/:index/regenerate', aiLimiter, async (req, res) => {
  const classId = validateId(req.body.class_id || req.body.classId || req.query.class_id || req.query.classId);
  const bank = getPkQuestionBankById(req.params.id);
  if (!bank) {
    return res.status(404).json({ error: '题库不存在' });
  }
  if (bank.scope === 'class' && Number(bank.class_id) !== Number(classId)) {
    return res.status(403).json({ error: '不能编辑其他班级的私有题库' });
  }

  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0 || index >= Number(bank.question_count || 0)) {
    return res.status(400).json({ error: '题目索引无效' });
  }

  const originQuestion = Array.isArray(bank.questions) ? bank.questions[index] : null;
  if (!originQuestion) {
    return res.status(404).json({ error: '原题不存在' });
  }

  try {
    const generated = await generateSingleAiQuestion({
      subject: bank.subject || 'math',
      grade: bank.grade || 'g3',
      questionType: bank.question_type || originQuestion.question_type || 'single_choice',
      originalPrompt: originQuestion.prompt || '',
      rewriteHint: sanitizeString(req.body.rewrite_hint || req.body.hint || '', 220)
    });

    const normalized = normalizePkQuestion(
      generated.question,
      generated.provider,
      bank.question_type || originQuestion.question_type || 'single_choice'
    );
    if (!normalized) {
      return res.status(500).json({ error: '重写结果无效，请重试' });
    }

    bank.questions[index] = normalized;
    bank.updated_at = new Date().toISOString();
    bank.provider_diagnostics = {
      ...(bank.provider_diagnostics || {}),
      last_regenerate: {
        index,
        provider: generated.provider,
        diagnostics: generated.diagnostics || null,
        at: bank.updated_at
      }
    };
    saveDb();

    return res.json({
      message: generated.provider === 'preset:fallback'
        ? 'AI重写失败，已使用预制题目替换'
        : '题目重写成功',
      provider: generated.provider,
      diagnostics: generated.diagnostics || null,
      question: normalized,
      index
    });
  } catch (error) {
    console.error('[TugGame] Failed to regenerate question:', error);
    return res.status(500).json({ error: '题目重写失败，请稍后重试' });
  }
});

// 异步生成题库任务（主用 MiniMax，失败即时切换 DeepSeek）
app.post('/api/pk/question-banks/generate', aiLimiter, async (req, res) => {
  const classId = validateId(req.body.class_id || req.body.classId);
  if (!classId) {
    return res.status(400).json({ error: '缺少有效班级 ID' });
  }

  const classCtx = buildTugClassTeams(classId);
  if (!classCtx) {
    return res.status(404).json({ error: '班级不存在' });
  }
  if (classCtx.teams.length < 2) {
    return res.status(400).json({ error: '战队数量不足，请先创建至少两个战队' });
  }

  const subject = sanitizeString(req.body.subject || 'math', 40) || 'math';
  const grade = sanitizeString(req.body.grade || 'g3', 12) || 'g3';
  const questionType = sanitizeString(req.body.question_type || req.body.questionType || 'single_choice', 30) || 'single_choice';
  const questionCount = clampQuestionCount(req.body.question_count ?? req.body.questionCount);
  const templateId = sanitizeString(req.body.template_id || req.body.templateId || '', 60) || null;
  const description = sanitizeString(req.body.description || '', 240);
  const preferPreset = parseBoolean(req.body.prefer_preset ?? req.body.preferPreset);

  try {
    const job = await startPkQuestionBankGeneration({
      classId,
      subject,
      grade,
      questionType,
      questionCount,
      templateId,
      description,
      preferPreset
    });

    return res.json({
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      created_at: job.created_at
    });
  } catch (error) {
    console.error('[TugGame] Failed to start question bank generation job:', error);
    return res.status(500).json({ error: '题库任务创建失败，请稍后重试' });
  }
});

// 轮询生成任务进度
app.get('/api/pk/question-banks/jobs/:jobId', (req, res) => {
  const jobId = sanitizeString(req.params.jobId || '', 120);
  const job = pkQuestionBankJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: '任务不存在或已过期' });
  }
  return res.json({
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    bank: job.bank,
    error: job.error || null,
    created_at: job.created_at,
    updated_at: job.updated_at
  });
});

// 按已选题库开始比赛
app.post('/api/pk/matches/start', async (req, res) => {
  const classId = validateId(req.body.class_id || req.body.classId);
  const questionBankId = validateId(req.body.question_bank_id || req.body.questionBankId);
  if (!classId || !questionBankId) {
    return res.status(400).json({ error: '缺少班级或题库参数' });
  }

  const classCtx = buildTugClassTeams(classId);
  if (!classCtx) {
    return res.status(404).json({ error: '班级不存在' });
  }
  if (classCtx.teams.length < 2) {
    return res.status(400).json({ error: '战队数量不足，请先创建至少两个战队' });
  }

  const bank = getPkQuestionBankById(questionBankId);
  if (!bank) {
    return res.status(404).json({ error: '题库不存在' });
  }
  if (bank.scope === 'class' && Number(bank.class_id) !== Number(classId)) {
    return res.status(403).json({ error: '不能使用其他班级的私有题库' });
  }

  const { leftTeam, rightTeam } = resolvePkMatchTeams(
    classCtx,
    validateId(req.body.left_team_id || req.body.leftTeamId),
    validateId(req.body.right_team_id || req.body.rightTeamId)
  );
  if (!leftTeam || !rightTeam || leftTeam.id === rightTeam.id) {
    return res.status(400).json({ error: '请先选择两个不同的战队' });
  }

  const safeBank = buildDisplayReadyPkQuestionBank(bank) || bank;
  const normalizedQuestions = normalizePkQuestionList(
    Array.isArray(safeBank.questions) ? safeBank.questions : [],
    safeBank.source_provider || 'preset',
    safeBank.question_type || 'single_choice'
  );
  if (!normalizedQuestions.length && false) { // runtime AI top-up below handles empty banks
    return res.status(400).json({ error: '题库为空，请重新选择题库' });
  }

  const battlePrepared = buildBattleReadyQuestions(normalizedQuestions);
  const targetBattleCount = Math.max(DEFAULT_QUESTION_COUNT, normalizedQuestions.length || 0);
  const topUpResult = await topUpBattleQuestionsWithAi({
    safeBank,
    existingQuestions: battlePrepared.questions,
    targetCount: targetBattleCount || DEFAULT_QUESTION_COUNT
  });
  const questions = Array.isArray(topUpResult?.questions) ? topUpResult.questions : [];
  if (!questions.length) {
    return res.status(500).json({ error: '比赛题目准备失败，请重新选择题库后再试' });
  }

  res.json({
    provider: safeBank.source_provider || 'preset',
    class_id: classCtx.classId,
    class_name: classCtx.className,
    teams: {
      left: leftTeam,
      right: rightTeam,
      all: classCtx.teams
    },
    bank: summarizePkQuestionBank(safeBank),
    game: {
      duration_sec: TUG_OF_WAR_DURATION_SEC,
      answer_mode: 'mixed_click_numeric',
      adapted_question_count: battlePrepared.adaptedCount
    },
    questions
  });
});

// 兼容旧流程：直接生成并开赛，同时会持久化生成题库
app.post('/api/pk/questions', aiLimiter, async (req, res) => {
  const classId = validateId(req.body.class_id || req.body.classId);
  if (!classId) {
    return res.status(400).json({ error: '缺少有效班级 ID' });
  }

  const classCtx = buildTugClassTeams(classId);
  if (!classCtx) {
    return res.status(404).json({ error: '班级不存在' });
  }
  if (classCtx.teams.length < 2) {
    return res.status(400).json({ error: '战队数量不足，请先创建至少两个战队' });
  }

  const subject = sanitizeString(req.body.subject || 'math', 40) || 'math';
  const grade = sanitizeString(req.body.grade || 'g3', 12) || 'g3';
  const questionType = sanitizeString(req.body.question_type || req.body.questionType || 'single_choice', 30) || 'single_choice';
  const count = clampQuestionCount(req.body.question_count ?? req.body.questionCount);
  const description = sanitizeString(req.body.description || '', 240);
  const templateId = sanitizeString(req.body.template_id || req.body.templateId || '', 60) || null;
  const preferPreset = parseBoolean(req.body.prefer_preset ?? req.body.preferPreset);

  const { leftTeam, rightTeam } = resolvePkMatchTeams(
    classCtx,
    validateId(req.body.left_team_id || req.body.leftTeamId),
    validateId(req.body.right_team_id || req.body.rightTeamId)
  );
  if (!leftTeam || !rightTeam || leftTeam.id === rightTeam.id) {
    return res.status(400).json({ error: '请先选择两个不同的战队' });
  }

  try {
    const generated = await generateTugQuestions({
      subject,
      grade,
      questionType,
      questionCount: count,
      templateId,
      description,
      preferPreset
    });

    let questions = normalizePkQuestionList(generated.questions || [], generated.provider, questionType);
    if (questions.length < count) {
      const fallback = normalizePkQuestionList(generatePresetQuestions({
        templateId: findTemplate(templateId)?.id || null,
        subject,
        grade,
        questionType,
        questionCount: count
      }), 'preset:fallback', questionType);
      questions = dedupeQuestionsByPrompt(questions.concat(fallback));
    }

    questions = shuffleTugItems(questions).slice(0, count);
    const battlePrepared = buildBattleReadyQuestions(questions);
    questions = ensureBattleQuestionCount({
      questions: battlePrepared.questions,
      targetCount: count,
      subject,
      grade,
      templateId,
      questionType
    });
    if (!questions.length) {
      return res.status(500).json({ error: '题库生成结果为空，请调整配置后重试' });
    }

    const bank = createPkQuestionBankRecord({
      classId,
      description,
      sourceProvider: generated.provider,
      subject,
      grade,
      questionType,
      templateId,
      generatedBy: generated.provider.startsWith('preset') ? 'preset' : 'ai',
      providerDiagnostics: {
        ...(generated.diagnostics || {}),
        battle_answer_mode: 'mixed_click_numeric',
        battle_adapted_count: battlePrepared.adaptedCount
      },
      questions
    });

    return res.json({
      provider: generated.provider,
      class_id: classCtx.classId,
      class_name: classCtx.className,
      teams: {
        left: leftTeam,
        right: rightTeam,
        all: classCtx.teams
      },
      options: {
        subject,
        grade,
        question_type: questionType,
        template_id: templateId,
        question_count: count,
        description
      },
      bank: summarizePkQuestionBank(bank),
      diagnostics: generated.diagnostics || null,
      game: {
        duration_sec: TUG_OF_WAR_DURATION_SEC,
        answer_mode: 'mixed_click_numeric',
        adapted_question_count: battlePrepared.adaptedCount
      },
      questions
    });
  } catch (error) {
    console.error('[TugGame] Failed to generate questions:', error);
    return res.status(500).json({ error: '题库生成失败，请稍后重试' });
  }
});

// AI生成老师寄语（添加频率限制）

app.post('/api/ai/generate-comment', aiLimiter, async (req, res) => {
  const { studentInfo, customPrompt } = req.body;
  
  if (!studentInfo || !studentInfo.name) {
    return res.status(400).json({ error: '缺少学员信息' });
  }

  if (!DEEPSEEK_API_KEY) {
    return res.status(503).json({ error: 'AI 寄语服务未配置，请先设置 DEEPSEEK_API_KEY' });
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

// 上传报告照片（最多9张）
app.post('/api/reports/upload', (req, res) => {
  upload.array('photos', 9)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '单张图片不能超过10MB' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: '最多上传9张图片' });
        }
      }
      return res.status(400).json({ error: err.message || '上传失败' });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: '请先选择图片' });
    }

    const items = files.map(file => ({
      id: db.nextId.photos++,
      filename: file.filename,
      url: `/uploads/photos/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
      created_at: new Date().toISOString()
    }));

    db.photos.push(...items);
    saveDb();

    res.json({
      photos: items.map(i => i.url),
      items
    });
  });
});

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

  const team = student.team_id ? db.teams.find(t => t.id === student.team_id) : null;

  if (Array.isArray(photos) && photos.length > 9) {
    return res.status(400).json({ error: '报告图片最多9张' });
  }

  const reportPhotos = Array.isArray(photos)
    ? photos.filter(p => typeof p === 'string').slice(0, 9)
    : [];

  const shortId = generateShortId();
  const newReport = {
    id: db.nextId.reports++,
    short_id: shortId,
    student_id,
    class_id,
    student_name: student.name,
    student_avatar: student.avatar,
    student_score: normalizeScore(student.score),
    team_id: student.team_id,
    team_name: team?.name || null,
    photos: reportPhotos,
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

// 获取班级报告列表（管理员）
app.get('/api/classes/:classId/reports', (req, res) => {
  const classId = validateId(req.params.classId);
  if (!classId) return res.status(400).json({ error: '无效的班级ID' });

  const reports = db.reports
    .filter(r => r.class_id === classId)
    .map(r => ({
      short_id: r.short_id,
      student_id: r.student_id,
      student_name: r.student_name,
      student_avatar: r.student_avatar,
      student_score: normalizeScore(r.student_score),
      team_name: r.team_name || '',
      teacher_name: r.teacher_name || '老师',
      created_at: r.created_at
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(reports);
});

// 生成奖状
app.post('/api/certificates', (req, res) => {
  const student_id = validateId(req.body.student_id);
  const class_id = validateId(req.body.class_id);
  const title = sanitizeString(req.body.title || '优秀学员奖状', 50);
  const subtitle = sanitizeString(req.body.subtitle || '在创赛营中表现优异，特发此状以资鼓励。', 120);
  const teacher_name = sanitizeString(req.body.teacher_name || '老师', 20) || '老师';

  if (!student_id || !class_id) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const student = db.students.find(s => s.id === student_id);
  if (!student) {
    return res.status(404).json({ error: '学员不存在' });
  }

  if (student.class_id !== class_id) {
    return res.status(400).json({ error: '学员不属于该班级' });
  }

  const team = student.team_id ? db.teams.find(t => t.id === student.team_id) : null;
  const classInfo = db.classes.find(c => c.id === class_id);

  const shortId = generateShortId();
  const certificate = {
    id: db.nextId.certificates++,
    short_id: shortId,
    student_id,
    class_id,
    class_name: classInfo?.name || '',
    student_name: student.name,
    student_avatar: student.avatar,
    student_score: normalizeScore(student.score),
    team_name: team?.name || '',
    title,
    subtitle,
    teacher_name,
    issued_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  db.certificates.push(certificate);
  saveDb();

  res.json({ id: shortId, certificate });
});

// 获取班级奖状列表（管理员）
app.get('/api/classes/:classId/certificates', (req, res) => {
  const classId = validateId(req.params.classId);
  if (!classId) return res.status(400).json({ error: '无效的班级ID' });

  const certificates = db.certificates
    .filter(c => c.class_id === classId)
    .map(c => ({
      short_id: c.short_id,
      student_id: c.student_id,
      student_name: c.student_name,
      student_avatar: c.student_avatar,
      student_score: normalizeScore(c.student_score),
      team_name: c.team_name || '',
      title: c.title,
      teacher_name: c.teacher_name,
      issued_at: c.issued_at,
      created_at: c.created_at
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(certificates);
});

// 获取奖状详情
app.get('/api/certificates/:shortId', (req, res) => {
  const { shortId } = req.params;
  const certificate = db.certificates.find(c => c.short_id === shortId);

  if (!certificate) {
    return res.status(404).json({ error: '奖状不存在' });
  }

  const classInfo = db.classes.find(c => c.id === certificate.class_id);

  res.json({
    ...certificate,
    student_score: normalizeScore(certificate.student_score),
    class_name: classInfo?.name || certificate.class_name || ''
  });
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
    student_score: normalizeScore(report.student_score),
    class_name: classInfo?.name || ''
  });
});

// 版本检查接口（用于调试）
app.get('/api/version', (req, res) => {
  try {
    const html = fs.readFileSync(clientIndexPath, 'utf-8');
    const jsMatch = html.match(/index-([^.]+)\.js/);
    const cssMatch = html.match(/index-([^.]+)\.css/);
    res.json({
      jsFile: jsMatch ? jsMatch[0] : 'not found',
      cssFile: cssMatch ? cssMatch[0] : 'not found',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA路由处理
app.get('*', (req, res) => {
  sendSpaShell(res);
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
  console.log('🐾 乐享宠物已启动！');
  console.log(`📍 环境: ${isProduction ? '生产' : '开发'}`);
  console.log('');
  console.log(`📺 大屏展示: http://${localIP}:${PORT}`);
  console.log(`🔧 管理后台: http://${localIP}:${PORT}/admin`);
  console.log(`💻 本机访问: http://localhost:${PORT}`);
  console.log('');
});
