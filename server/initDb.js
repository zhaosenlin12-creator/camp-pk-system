const fs = require('fs');
const path = require('path');

// 数据文件路径
const dbDir = path.join(__dirname, '../database');
const dbPath = path.join(dbDir, 'data.json');

// 确保目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 初始化数据
const initialData = {
  classes: [],
  teams: [],
  students: [],
  scoreLogs: [],
  rewards: [
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
  ],
  punishments: [
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
  ],
  nextId: { classes: 1, teams: 1, students: 1, scoreLogs: 1 }
};

// 写入文件
fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf-8');

console.log('');
console.log('🎉 数据库初始化完成！');
console.log(`📁 数据文件: ${dbPath}`);
console.log('');
