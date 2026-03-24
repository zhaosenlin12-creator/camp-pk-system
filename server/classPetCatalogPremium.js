const baseCatalog = require('./classPetCatalog');
const snapshotCatalog = require('./classPetCatalogSnapshot.json');

const BUCKET = 'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk';

const REMOTE_META_BY_KEY = {
  dbhu: { name: '东北虎', species: '雪林虎王', family: 'wild', emoji: '🐯', rarity: 'legendary', badge: '森林王者' },
  yincsu: { name: '银簇灵猫', species: '月光灵猫', family: 'cat', emoji: '🐱', rarity: 'rare', badge: '月光收藏' },
  boshimoa: { name: '波斯猫', species: '绒云波斯猫', family: 'cat', emoji: '🐱', rarity: 'epic', badge: '宫廷主角' },
  zhongxiong: { name: '棕熊', species: '山野守护熊', family: 'bear', emoji: '🐻', rarity: 'epic', badge: '山野守护' },
  zhuruotu: { name: '侏儒兔', species: '奶油侏儒兔', family: 'rabbit', emoji: '🐰', rarity: 'rare', badge: '掌心萌宠' },
  orgen: { name: '橘猫', species: '暖阳橘猫', family: 'cat', emoji: '🐱', rarity: 'rare', badge: '暖心治愈' },
  banliegou: { name: '斑猎犬', species: '疾风斑猎犬', family: 'dog', emoji: '🐶', rarity: 'epic', badge: '冲刺搭档' },
  feizhoushi: { name: '非洲狮', species: '草原狮王', family: 'wild', emoji: '🦁', rarity: 'legendary', badge: '草原王者' },
  jinpeng: { name: '金鹏', species: '苍穹金鹏', family: 'bird', emoji: '🦅', rarity: 'legendary', badge: '天穹主角' },
  zixansgu: { name: '紫霞松鼠', species: '暮色松鼠', family: 'small', emoji: '🐿️', rarity: 'rare', badge: '暮色收藏' },
  julang: { name: '巨狼', species: '极地巨狼', family: 'wilddog', emoji: '🐺', rarity: 'epic', badge: '猎场压制' },
  taowu: { name: '梼杌', species: '上古凶兽', family: 'myth', emoji: '🐲', rarity: 'legendary', badge: '上古传说' },
  huban: { name: '虎斑猫', species: '琥珀虎斑猫', family: 'cat', emoji: '🐱', rarity: 'rare', badge: '琥珀斑纹' },
  LBLD: { name: '拉布拉多', species: '阳光拉布拉多', family: 'dog', emoji: '🐶', rarity: 'rare', badge: '暖场冠军' },
  maotu: { name: '毛兔', species: '绒球毛兔', family: 'rabbit', emoji: '🐰', rarity: 'rare', badge: '云朵陪伴' },
  feizhouq: { name: '非洲野犬', species: '荒野猎犬', family: 'wilddog', emoji: '🐺', rarity: 'epic', badge: '追击核心' },
  jinsixs: { name: '金丝熊', species: '奶油金丝熊', family: 'small', emoji: '🐹', rarity: 'rare', badge: '治愈收藏' },
  taidi: { name: '泰迪', species: '焦糖泰迪', family: 'dog', emoji: '🐶', rarity: 'rare', badge: '甜心主角' },
  miniciw: { name: '迷你刺猬', species: '星点刺猬', family: 'small', emoji: '🦔', rarity: 'rare', badge: '掌心守护' },
  helanzhu: { name: '荷兰猪', species: '奶糖荷兰猪', family: 'small', emoji: '🐹', rarity: 'rare', badge: '超萌陪伴' },
  glodmao: { name: '金毛', species: '晨光金毛', family: 'dog', emoji: '🐶', rarity: 'epic', badge: '暖阳队长' },
  shm: { name: '三花猫', species: '三花幸运猫', family: 'cat', emoji: '🐱', rarity: 'rare', badge: '幸运收藏' },
  hashiqi: { name: '哈士奇', species: '雪原哈士奇', family: 'dog', emoji: '🐶', rarity: 'epic', badge: '活力担当' },
  aijiaomao: { name: '矮脚猫', species: '奶团矮脚猫', family: 'cat', emoji: '🐱', rarity: 'rare', badge: '人气爆棚' },
  qiongqi: { name: '穷奇', species: '上古凶兽', family: 'myth', emoji: '🐲', rarity: 'legendary', badge: '禁区主角' },
  honfus: { name: '红腹松鼠', species: '枫糖松鼠', family: 'small', emoji: '🐿️', rarity: 'rare', badge: '林间灵感' },
  midaishu: { name: '蜜袋鼯', species: '夜空滑翔兽', family: 'small', emoji: '🐿️', rarity: 'epic', badge: '夜空滑翔' },
  meizhoubao: { name: '美洲豹', species: '雨林猎影', family: 'wild', emoji: '🐆', rarity: 'legendary', badge: '雨林猎影' }
};

const PALETTES = {
  common: [
    { theme: '#FFF8EA', accent: '#F59E0B' },
    { theme: '#EEFBF4', accent: '#22C55E' },
    { theme: '#F7F3FF', accent: '#A855F7' }
  ],
  rare: [
    { theme: '#EEF6FF', accent: '#60A5FA' },
    { theme: '#FFF1F7', accent: '#F472B6' },
    { theme: '#F0FDFA', accent: '#14B8A6' },
    { theme: '#F5F3FF', accent: '#8B5CF6' }
  ],
  epic: [
    { theme: '#FFF4E8', accent: '#F97316' },
    { theme: '#EEF4FF', accent: '#4F46E5' },
    { theme: '#FFF1F2', accent: '#EC4899' },
    { theme: '#ECFEFF', accent: '#06B6D4' }
  ],
  legendary: [
    { theme: '#FFF7E8', accent: '#F59E0B' },
    { theme: '#EFF6FF', accent: '#2563EB' },
    { theme: '#FDF2FF', accent: '#A855F7' },
    { theme: '#FEF2F2', accent: '#EF4444' }
  ]
};

function toHttps(url) {
  if (typeof url !== 'string') return null;
  return url.replace(/^http:\/\//i, 'https://');
}

function normalizeStages(stages, image) {
  const normalizedStages = Array.isArray(stages)
    ? stages.map(toHttps).filter((stage) => typeof stage === 'string' && stage.trim())
    : [];

  if (normalizedStages.length > 0) {
    return normalizedStages;
  }

  return image ? [image] : [];
}

function extractPetAssetKey(pet) {
  const candidates = [pet.assetKey, pet.image, ...(pet.evolutionStages || [])];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const match = candidate.match(/cwk\/([^/]+)\//i);
    if (match) return match[1];
  }

  return null;
}

function normalizePet(pet) {
  const image = toHttps(pet.image);

  return {
    ...pet,
    image,
    assetKey: pet.assetKey || extractPetAssetKey(pet),
    evolutionStages: normalizeStages(pet.evolutionStages, image)
  };
}

function createPet({
  id,
  name,
  species,
  emoji,
  rarity,
  badge,
  theme,
  accent,
  quote,
  vibe,
  image,
  evolutionStages,
  assetKey
}) {
  return normalizePet({
    id,
    name,
    species,
    emoji,
    rarity,
    badge,
    theme,
    accent,
    quote,
    vibe,
    image,
    evolutionStages,
    assetKey
  });
}

function hashString(value) {
  const input = String(value || '');
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function selectPalette(rarity, key) {
  const paletteGroup = PALETTES[rarity] || PALETTES.rare;
  return paletteGroup[hashString(key) % paletteGroup.length];
}

function buildRemoteQuote(meta) {
  switch (meta.family) {
    case 'cat':
      return `像把课堂里的高光时刻揉进了一团柔软云朵里，越看越想继续养。`;
    case 'dog':
      return `一出场就自带“我们继续冲”的节奏感，很适合做课堂奖励的推进器。`;
    case 'rabbit':
      return `轻轻一蹦就把仪式感拉满，特别适合给低龄学员带来“我真的拥有了宠物”的惊喜。`;
    case 'small':
      return `小小一只却特别容易让人产生陪伴感，是最能提供情绪价值的收藏系伙伴。`;
    case 'bird':
      return `从低阶到高阶都像在展开一组天空史诗，非常适合做班级高光时刻的视觉主角。`;
    case 'bear':
      return `气场稳、形象厚重，特别适合奖励那些能把课堂节奏带稳的学生。`;
    case 'wilddog':
      return `压迫感和速度感都很强，后期会很适合接入班级对战和追击玩法。`;
    case 'myth':
      return `它不是普通宠物，而是会让“进化成功”这件事瞬间拥有传奇感的压轴角色。`;
    case 'wild':
    default:
      return `高阶形态会明显更有王者感，特别适合在公开表扬时刻制造“全班哇一下”的效果。`;
  }
}

function buildRemoteVibe(meta) {
  switch (meta.family) {
    case 'cat':
      return `适合奖励认真、稳定、审美敏感的学生，成长过程会持续强化收藏欲和展示欲。`;
    case 'dog':
      return `适合绑定课堂参与度高、互动积极的学生，学生会更愿意为了它继续攒积分。`;
    case 'rabbit':
      return `低龄孩子会很容易对它产生“想照顾、想继续孵化、想继续升级”的陪伴心态。`;
    case 'small':
      return `虽然体型小，但最适合做长期养成线，能持续给学生稳定的反馈和满足感。`;
    case 'bird':
      return `它的成长线很适合配合进化动画和音效，会让进阶时刻更像一次正式加冕。`;
    case 'bear':
      return `更偏稳重型主角，适合做班级展示页里的战力门面和队伍压轴。`;
    case 'wilddog':
      return `这类宠物会天然带来竞技感，后续加入班级混战和吃鸡玩法时会非常顺手。`;
    case 'myth':
      return `是最适合放进高等级收藏线的宠物类型，能持续制造“我想把它养满”的长期动力。`;
    case 'wild':
    default:
      return `成长后会非常适合做展示页主视觉，也能为后续战斗系统提供更强的代入感。`;
  }
}

function humanizeAssetKey(key) {
  return String(key || '课堂伙伴')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function buildFallbackRemoteMeta(key) {
  return {
    name: humanizeAssetKey(key),
    species: '课堂收藏伙伴',
    family: 'small',
    emoji: '🐾',
    rarity: 'rare',
    badge: '课堂收藏'
  };
}

function enrichRemotePet(snapshotPet, id) {
  const key = extractPetAssetKey(snapshotPet);
  const meta = REMOTE_META_BY_KEY[key] || buildFallbackRemoteMeta(key);
  const palette = selectPalette(meta.rarity, key);

  return createPet({
    id,
    name: meta.name,
    species: meta.species,
    emoji: meta.emoji,
    rarity: meta.rarity,
    badge: meta.badge,
    theme: palette.theme,
    accent: palette.accent,
    quote: buildRemoteQuote(meta),
    vibe: buildRemoteVibe(meta),
    image: snapshotPet.image,
    evolutionStages: snapshotPet.evolutionStages,
    assetKey: key
  });
}

// Preserve the current 1-19 ids exactly so existing classroom records keep pointing at the same pets.
const legacyCatalog = [
  ...baseCatalog.filter((pet) => pet.id < 10).map(normalizePet),
  createPet({
    id: 10,
    name: '萨摩耶',
    species: '微笑雪球犬',
    emoji: '🐶',
    rarity: 'epic',
    badge: '云团高光',
    theme: '#F4FBFF',
    accent: '#78C8FF',
    quote: '像一团会摇尾巴的白云，天生就是班级气氛组。',
    vibe: '每次出场都像把“今天表现真不错”写在学生脸上，情绪价值特别足。',
    image: `${BUCKET}/smye/100000000.jpg`,
    evolutionStages: [
      `${BUCKET}/smye/100000000.jpg`,
      `${BUCKET}/smye/100001477.jpg`,
      `${BUCKET}/smye/100001485.jpg`,
      `${BUCKET}/smye/100001493.jpg`,
      `${BUCKET}/smye/100001501.jpg`,
      `${BUCKET}/smye/100001509.jpg`,
      `${BUCKET}/smye/100001517.jpg`,
      `${BUCKET}/smye/100001525.jpg`,
      `${BUCKET}/smye/100001533.jpg`,
      `${BUCKET}/smye/100001541.jpg`
    ],
    assetKey: 'smye'
  }),
  createPet({
    id: 11,
    name: '银渐层',
    species: '银月主角猫',
    emoji: '🐱',
    rarity: 'epic',
    badge: '银月主角',
    theme: '#F4F7FB',
    accent: '#97A6C7',
    quote: '像把奖章做成了软乎乎的猫咪，越长大越有高级感。',
    vibe: '很适合课堂里那种稳稳发力的学生，成长过程会越来越像主角立绘。',
    image: `${BUCKET}/yinjian/1200000175.jpg`,
    evolutionStages: [
      `${BUCKET}/yinjian/1200000175.jpg`,
      `${BUCKET}/yinjian/12000001725.jpg`,
      `${BUCKET}/yinjian/12000001733.jpg`,
      `${BUCKET}/yinjian/12000001741.jpg`,
      `${BUCKET}/yinjian/12000001749.jpg`,
      `${BUCKET}/yinjian/12000001757.jpg`,
      `${BUCKET}/yinjian/12000001765.jpg`,
      `${BUCKET}/yinjian/12000001773.jpg`,
      `${BUCKET}/yinjian/12000001781.jpg`,
      `${BUCKET}/yinjian/12000001789.jpg`
    ],
    assetKey: 'yinjian'
  }),
  createPet({
    id: 12,
    name: '加菲猫',
    species: '奶咖主角猫',
    emoji: '🐱',
    rarity: 'epic',
    badge: '奶咖主角',
    theme: '#FFF5EE',
    accent: '#F2A66E',
    quote: '圆脸、奶咖色、慢半拍的可爱感，特别适合做成长展示的主视觉。',
    vibe: '它不是那种凶猛型宠物，而是“你一眼就会喜欢”的故事型宠物。',
    image: `${BUCKET}/coffeecat/100000264.jpg`,
    evolutionStages: [
      `${BUCKET}/coffeecat/100000264.jpg`,
      `${BUCKET}/coffeecat/10500000143.jpg`,
      `${BUCKET}/coffeecat/10500000151.jpg`,
      `${BUCKET}/coffeecat/10500000159.jpg`,
      `${BUCKET}/coffeecat/10500000167.jpg`,
      `${BUCKET}/coffeecat/10500000175.jpg`,
      `${BUCKET}/coffeecat/10500000183.jpg`,
      `${BUCKET}/coffeecat/10500000191.jpg`,
      `${BUCKET}/coffeecat/10500000199.jpg`,
      `${BUCKET}/coffeecat/10500000207.jpg`
    ],
    assetKey: 'coffeecat'
  }),
  createPet({
    id: 13,
    name: '安哥拉兔',
    species: '长毛安哥拉兔',
    emoji: '🐰',
    rarity: 'legendary',
    badge: '棉云仪式',
    theme: '#FFF7FC',
    accent: '#E79BCF',
    quote: '像会发光的棉花糖，特别适合拿来做“终于进化了”的仪式时刻。',
    vibe: '终阶形态很有梦幻感，学生会明显感觉到“我的宠物真的变高级了”。',
    image: `${BUCKET}/angenla/1200000217.jpg`,
    evolutionStages: [
      `${BUCKET}/angenla/1200000217.jpg`,
      `${BUCKET}/angenla/12000002177.jpg`,
      `${BUCKET}/angenla/12000002185.jpg`,
      `${BUCKET}/angenla/12000002193.jpg`,
      `${BUCKET}/angenla/12000002201.jpg`,
      `${BUCKET}/angenla/12000002209.jpg`,
      `${BUCKET}/angenla/12000002217.jpg`,
      `${BUCKET}/angenla/12000002225.jpg`,
      `${BUCKET}/angenla/12000002233.jpg`,
      `${BUCKET}/angenla/12000002241.jpg`
    ],
    assetKey: 'angenla'
  }),
  createPet({
    id: 14,
    name: '博美',
    species: '博美',
    emoji: '🐶',
    rarity: 'legendary',
    badge: '舞台甜心',
    theme: '#FFF7EF',
    accent: '#FFAE74',
    quote: '小小一只却自带主角感，特别像孩子会想反复点开的明星宠物。',
    vibe: '很适合作为班级后期的高光宠物，进化后会明显更有“展示舞台感”。',
    image: `${BUCKET}/bomei/1200000039.jpg`,
    evolutionStages: [
      `${BUCKET}/bomei/1200000039.jpg`,
      `${BUCKET}/bomei/12000000369.jpg`,
      `${BUCKET}/bomei/12000000377.jpg`,
      `${BUCKET}/bomei/12000000385.jpg`,
      `${BUCKET}/bomei/12000000393.jpg`,
      `${BUCKET}/bomei/12000000401.jpg`,
      `${BUCKET}/bomei/12000000409.jpg`,
      `${BUCKET}/bomei/12000000417.jpg`,
      `${BUCKET}/bomei/12000000425.jpg`,
      `${BUCKET}/bomei/12000000433.jpg`
    ],
    assetKey: 'bomei'
  }),
  ...baseCatalog
    .filter((pet) => pet.id >= 10)
    .map((pet, index) => normalizePet({
      ...pet,
      id: 15 + index
    }))
];

const legacyKeySet = new Set(legacyCatalog.map((pet) => pet.assetKey).filter(Boolean));
const legacyNameSet = new Set(legacyCatalog.map((pet) => String(pet.name || '').trim()));

const remoteExtras = snapshotCatalog
  .map(normalizePet)
  .filter((pet) => {
    const assetKey = extractPetAssetKey(pet);
    const name = REMOTE_META_BY_KEY[assetKey]?.name || String(pet.name || '').trim();
    return assetKey && !legacyKeySet.has(assetKey) && !legacyNameSet.has(name);
  })
  .map((pet, index) => enrichRemotePet(pet, legacyCatalog.length + index + 1));

module.exports = [...legacyCatalog, ...remoteExtras];
