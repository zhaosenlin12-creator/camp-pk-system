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

const SERIES_META = {
  classic: {
    key: 'classic',
    order: 0,
    label: '课堂经典伙伴系列',
    badge: '原版主线',
    description: '延续当前课堂宠物的柔和主角风格，适合作为学生最先接触的日常培养主线。'
  },
  healing: {
    key: 'healing',
    order: 1,
    label: '治愈陪伴系列',
    badge: '陪伴收藏',
    description: '主打软萌、亲和和持续陪伴感，适合低门槛领取和长期养成。'
  },
  wild: {
    key: 'wild',
    order: 2,
    label: '冒险王者系列',
    badge: '气场收藏',
    description: '强调速度感、王者感和舞台压场能力，适合做高光奖励和展示位主角。'
  },
  myth: {
    key: 'myth',
    order: 3,
    label: '神话传说系列',
    badge: '传奇压轴',
    description: '用于承接高阶成长线和进化仪式，视觉与文案都会更偏传奇终章感。'
  },
  engineering: {
    key: 'engineering',
    order: 4,
    label: '工程车萌宠系列',
    badge: '工程萌宠',
    description: '保持原本宠物体系的圆润可爱比例，同时加入工程车识别度，适合奖励执行力和动手力。'
  },
  mecha: {
    key: 'mecha',
    order: 5,
    label: '特勤机甲伙伴系列',
    badge: '机甲守护',
    description: '沿用现有主角宠物的精致舞台感，再叠加轻机甲外甲与战术守护气质。'
  }
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
  const seriesPet = applyPetSeriesMeta(pet, pet.seriesKey || 'classic');

  return {
    ...seriesPet,
    image,
    assetKey: seriesPet.assetKey || extractPetAssetKey(seriesPet),
    seriesRole: seriesPet.seriesRole || seriesPet.role || null,
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
  assetKey,
  seriesKey = null,
  seriesRole = null
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
    assetKey,
    seriesKey,
    seriesRole
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

function applyPetSeriesMeta(pet, seriesKey = 'classic') {
  const meta = SERIES_META[seriesKey] || SERIES_META.classic;

  return {
    ...pet,
    seriesKey: pet.seriesKey || meta.key,
    seriesLabel: pet.seriesLabel || meta.label,
    seriesBadge: pet.seriesBadge || meta.badge,
    seriesDescription: pet.seriesDescription || meta.description,
    seriesOrder: Number.isFinite(Number(pet.seriesOrder)) ? Number(pet.seriesOrder) : meta.order
  };
}

function resolveSeriesKeyFromFamily(family) {
  switch (family) {
    case 'cat':
    case 'dog':
    case 'rabbit':
    case 'small':
      return 'healing';
    case 'wild':
    case 'bear':
    case 'wilddog':
    case 'bird':
      return 'wild';
    case 'myth':
      return 'myth';
    default:
      return 'classic';
  }
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

function hexToRgb(hex) {
  const normalized = String(hex || '#000000').replace('#', '').trim();
  const value = normalized.length === 3
    ? normalized.split('').map((item) => item + item).join('')
    : normalized.padStart(6, '0').slice(0, 6);

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixHex(hex, ratio = 0) {
  const { r, g, b } = hexToRgb(hex);
  const mixTarget = ratio >= 0 ? 255 : 0;
  const amount = Math.min(1, Math.max(0, Math.abs(ratio)));
  const nextChannel = (value) => Math.round(value + (mixTarget - value) * amount);

  return `#${[nextChannel(r), nextChannel(g), nextChannel(b)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

function svgToDataUri(svg) {
  const normalized = String(svg || '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
  return `data:image/svg+xml;base64,${Buffer.from(normalized).toString('base64')}`;
}

function buildEngineeringHead(role, config) {
  switch (role) {
    case 'excavator':
      return `
        <path d="M118 118 Q106 88 124 72 L146 108" fill="${config.trim}" />
        <path d="M202 118 Q214 88 196 72 L174 108" fill="${config.trim}" />
        <path d="M124 72 L140 60 Q148 68 146 108" fill="${mixHex(config.trim, 0.15)}" />
        <circle cx="130" cy="76" r="5" fill="${mixHex(config.body, 0.2)}" />
        <circle cx="190" cy="76" r="5" fill="${mixHex(config.body, 0.2)}" />
      `;
    case 'bulldozer':
      return `
        <path d="M112 130 Q94 100 110 84 Q138 86 148 120" fill="${mixHex(config.trim, 0.12)}" />
        <path d="M208 130 Q226 100 210 84 Q182 86 172 120" fill="${mixHex(config.trim, 0.12)}" />
        <ellipse cx="122" cy="92" rx="10" ry="8" fill="${mixHex(config.body, 0.18)}" />
        <ellipse cx="198" cy="92" rx="10" ry="8" fill="${mixHex(config.body, 0.18)}" />
        <circle cx="118" cy="90" r="4" fill="${mixHex(config.accent, 0.3)}" />
        <circle cx="202" cy="90" r="4" fill="${mixHex(config.accent, 0.3)}" />
      `;
    case 'crane':
      return `
        <path d="M130 116 L118 58 L140 50 L152 116" fill="${config.trim}" />
        <path d="M190 116 L202 58 L180 50 L168 116" fill="${config.trim}" />
        <path d="M118 58 L140 50 Q150 62 152 116" fill="${mixHex(config.trim, 0.2)}" />
        <ellipse cx="128" cy="62" rx="6" ry="4" fill="${mixHex(config.body, 0.15)}" />
        <ellipse cx="192" cy="62" rx="6" ry="4" fill="${mixHex(config.body, 0.15)}" />
        <path d="M140 50 L156 42 Q162 52 152 70" fill="${mixHex(config.accent, 0.1)}" />
      `;
    case 'mixer':
      return `
        <path d="M134 104 Q120 72 138 56 Q158 74 154 106" fill="${config.trim}" />
        <path d="M186 104 Q200 72 182 56 Q162 74 166 106" fill="${config.trim}" />
        <ellipse cx="140" cy="74" rx="12" ry="10" fill="${mixHex(config.body, 0.15)}" />
        <ellipse cx="180" cy="74" rx="12" ry="10" fill="${mixHex(config.body, 0.15)}" />
        <circle cx="136" cy="72" r="5" fill="${config.detail}" />
        <circle cx="184" cy="72" r="5" fill="${config.detail}" />
        <circle cx="136" cy="72" r="2.5" fill="${mixHex(config.accent, 0.4)}" />
        <circle cx="184" cy="72" r="2.5" fill="${mixHex(config.accent, 0.4)}" />
      `;
    case 'roller':
      return `
        <ellipse cx="130" cy="100" rx="20" ry="18" fill="${config.trim}" />
        <ellipse cx="190" cy="100" rx="20" ry="18" fill="${config.trim}" />
        <ellipse cx="130" cy="100" rx="12" ry="10" fill="${mixHex(config.trim, 0.2)}" />
        <ellipse cx="190" cy="100" rx="12" ry="10" fill="${mixHex(config.trim, 0.2)}" />
        <circle cx="130" cy="100" r="5" fill="${config.detail}" />
        <circle cx="190" cy="100" r="5" fill="${config.detail}" />
        <circle cx="130" cy="100" r="2" fill="${mixHex(config.accent, 0.5)}" />
        <circle cx="190" cy="100" r="2" fill="${mixHex(config.accent, 0.5)}" />
      `;
    default:
      return '';
  }
}

function buildEngineeringAccessory(role, config, stage) {
  const metal = config.metal || '#D7E1EC';
  const trim = config.trim || mixHex(config.accent, -0.18);
  const detail = config.detail || mixHex(config.accent, 0.16);
  const glow = hexToRgba(config.accent, 0.25 + stage * 0.04);
  const glowStrong = hexToRgba(config.accent, 0.4 + stage * 0.05);
  const sparkle = hexToRgba('#ffffff', 0.6 + stage * 0.08);

  switch (role) {
    case 'excavator':
      return `
        <path d="M216 178 L242 138 L262 146 L236 186" fill="${trim}" />
        <path d="M242 138 L282 118 L294 134 L260 156" fill="${metal}" />
        <path d="M282 118 Q300 122 298 138 Q288 154 270 150 L260 138 Q274 130 282 118Z" fill="${detail}" />
        <path d="M222 174 L208 162" stroke="${metal}" stroke-width="6" stroke-linecap="round" />
        <circle cx="244" cy="140" r="9" fill="${glow}" />
        <circle cx="244" cy="140" r="4" fill="${sparkle}" />
        ${stage >= 3 ? `<path d="M234 148 L226 160" stroke="${glowStrong}" stroke-width="3" stroke-linecap="round" />` : ''}
        ${stage >= 4 ? `<circle cx="270" cy="130" r="5" fill="${sparkle}" />` : ''}
      `;
    case 'bulldozer':
      return `
        <path d="M226 184 L290 172 L294 210 L220 218 Q206 198 226 184Z" fill="${detail}" />
        <path d="M234 184 L286 176" stroke="${mixHex(detail, 0.32)}" stroke-width="8" stroke-linecap="round" />
        <path d="M244 172 L256 146 L276 146 L266 178" fill="${trim}" />
        <path d="M234 214 H290" stroke="${hexToRgba('#ffffff', 0.52)}" stroke-width="5" stroke-linecap="round" />
        <path d="M240 180 L250 172 L260 180" stroke="${metal}" stroke-width="3" stroke-linecap="round" fill="none" />
        ${stage >= 3 ? `<rect x="248" y="156" width="16" height="8" rx="4" fill="${glow}" />` : ''}
        ${stage >= 4 ? `<path d="M236 196 L230 206 M286 196 L292 206" stroke="${sparkle}" stroke-width="3" stroke-linecap="round" />` : ''}
      `;
    case 'crane':
      return `
        <path d="M188 126 L268 84 L280 100 L200 140" fill="${trim}" />
        <path d="M264 90 L276 156" stroke="${metal}" stroke-width="8" stroke-linecap="round" />
        <path d="M276 156 V198" stroke="${metal}" stroke-width="5" stroke-linecap="round" />
        <path d="M264 198 Q276 216 288 198" fill="none" stroke="${detail}" stroke-width="7" stroke-linecap="round" />
        <circle cx="276" cy="154" r="9" fill="${glow}" />
        <circle cx="276" cy="154" r="4" fill="${sparkle}" />
        ${stage >= 3 ? `<path d="M270 180 L282 180" stroke="${metal}" stroke-width="4" stroke-linecap="round" />` : ''}
        ${stage >= 4 ? `<circle cx="290" cy="118" r="6" fill="${detail}" /><circle cx="290" cy="118" r="3" fill="${sparkle}" />` : ''}
        ${stage >= 5 ? `<path d="M258 96 L250 86 L262 82 L268 94" fill="${sparkle}" />` : ''}
      `;
    case 'mixer':
      return `
        <g transform="translate(230 182)">
          <circle cx="0" cy="0" r="38" fill="${detail}" />
          <circle cx="0" cy="0" r="28" fill="${mixHex(config.theme, -0.08)}" />
          <path d="M-22 -8 Q0 -28 22 -8" stroke="${metal}" stroke-width="10" stroke-linecap="round" fill="none" />
          <path d="M-20 12 Q0 -10 20 12" stroke="${metal}" stroke-width="10" stroke-linecap="round" fill="none" />
          <path d="M-14 -26 L22 20" stroke="${hexToRgba('#ffffff', 0.48)}" stroke-width="5" stroke-linecap="round" />
          <circle cx="0" cy="0" r="8" fill="${glow}" />
          <circle cx="0" cy="0" r="4" fill="${sparkle}" />
          ${stage >= 3 ? `<circle cx="-16" cy="-16" r="4" fill="${sparkle}" />` : ''}
          ${stage >= 4 ? `<circle cx="18" cy="18" r="4" fill="${sparkle}" />` : ''}
        </g>
      `;
    case 'roller':
      return `
        <rect x="214" y="174" width="48" height="16" rx="8" fill="${trim}" />
        <ellipse cx="254" cy="214" rx="52" ry="38" fill="${detail}" />
        <ellipse cx="254" cy="214" rx="36" ry="26" fill="${mixHex(detail, 0.26)}" />
        <ellipse cx="254" cy="214" rx="20" ry="14" fill="${hexToRgba('#ffffff', 0.32)}" />
        <path d="M216 188 L202 166" stroke="${metal}" stroke-width="8" stroke-linecap="round" />
        ${stage >= 3 ? `<circle cx="254" cy="214" r="8" fill="${glow}" />` : ''}
        ${stage >= 4 ? `<circle cx="228" cy="200" r="5" fill="${sparkle}" /><circle cx="280" cy="200" r="5" fill="${sparkle}" />` : ''}
      `;
    default:
      return '';
  }
}

function buildEngineeringPetSvg(config, stage) {
  const scale = 0.88 + stage * 0.045;
  const body = config.body || config.accent;
  const canopy = config.canopy || mixHex(config.theme, -0.08);
  const trim = config.trim || mixHex(body, -0.22);
  const detail = config.detail || mixHex(config.accent, 0.22);
  const metal = config.metal || '#F0F8FF';
  const rim = config.rim || '#1E293B';
  const halo = hexToRgba(config.accent, 0.18 + stage * 0.05);
  const glow = hexToRgba(config.accent, 0.28 + stage * 0.06);
  const glowStrong = hexToRgba(config.accent, 0.55 + stage * 0.06);
  const sparkle = hexToRgba('#ffffff', 0.78 + stage * 0.04);
  const goldStar = hexToRgba('#FFD700', 0.6 + stage * 0.07);
  const pinkGlow = hexToRgba('#FF69B4', 0.45 + stage * 0.06);
  
  const starParticles = Array.from({ length: 10 + stage * 3 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / (10 + stage * 3);
    const x = 160 + Math.cos(angle) * (75 + stage * 8);
    const y = 145 + Math.sin(angle) * (55 + stage * 6);
    const size = 3 + (index % 4) * 1.5;
    const opacity = 0.35 + (index % 5) * 0.13;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size}" fill="${index % 3 === 0 ? goldStar : sparkle}" opacity="${opacity}" />`;
  }).join('');
  
  const floatingStars = Array.from({ length: 8 + stage * 2 }, (_, index) => {
    const x = 35 + index * 38;
    const y = 28 + (index % 4) * 28;
    const size = 4 + (index % 3) * 2.5;
    return `<circle cx="${x}" cy="${y}" r="${size}" fill="${index % 2 === 0 ? sparkle : goldStar}" opacity="0.75" />`;
  }).join('');
  
  const heartParticles = stage >= 2 ? Array.from({ length: 4 + stage }, (_, index) => {
    const x = 50 + index * 60;
    const y = 45 + (index % 3) * 20;
    return `<circle cx="${x}" cy="${y}" r="${5 + index}" fill="${pinkGlow}" opacity="0.5" />`;
  }).join('') : '';
  
  const workshopPanels = Array.from({ length: 3 }, (_, index) => {
    const offset = 48 + index * 74;
    return `
      <rect x="${offset}" y="${36 + index * 15}" width="56" height="24" rx="12" fill="${hexToRgba('#ffffff', 0.45)}" />
      <circle cx="${offset + 18}" cy="${48 + index * 15}" r="6" fill="${hexToRgba(config.accent, 0.65)}" />
      <circle cx="${offset + 18}" cy="${48 + index * 15}" r="3" fill="${sparkle}" />
      <rect x="${offset + 28}" y="${42 + index * 15}" width="20" height="12" rx="6" fill="${hexToRgba('#ffffff', 0.75)}" />
    `;
  }).join('');
  
  const mobility = config.role === 'bulldozer'
    ? `
      <rect x="82" y="208" width="156" height="50" rx="24" fill="${rim}" />
      <rect x="94" y="218" width="132" height="30" rx="15" fill="${mixHex(rim, 0.22)}" />
      ${Array.from({ length: 8 }, (_, index) => `<rect x="${100 + index * 15}" y="222" width="14" height="22" rx="6" fill="${metal}" opacity="0.92" />`).join('')}
      ${stage >= 3 ? `<rect x="94" y="252" width="132" height="6" rx="3" fill="${glowStrong}" />` : ''}
      ${stage >= 5 ? `<ellipse cx="160" cy="265" rx="60" ry="8" fill="${goldStar}" opacity="0.4" />` : ''}
    `
    : config.role === 'roller'
      ? `
        <circle cx="114" cy="238" r="38" fill="${rim}" />
        <circle cx="114" cy="238" r="22" fill="${metal}" />
        <circle cx="114" cy="238" r="10" fill="${glow}" />
        <ellipse cx="210" cy="234" rx="54" ry="42" fill="${detail}" />
        <ellipse cx="210" cy="234" rx="38" ry="28" fill="${mixHex(detail, 0.35)}" />
        <ellipse cx="210" cy="234" rx="20" ry="14" fill="${hexToRgba('#ffffff', 0.42)}" />
        ${stage >= 3 ? `<circle cx="114" cy="238" r="14" fill="${glowStrong}" />` : ''}
        ${stage >= 5 ? `<ellipse cx="114" cy="238" rx="28" ry="20" fill="${goldStar}" opacity="0.5" />` : ''}
      `
      : `
        <circle cx="112" cy="238" r="38" fill="${rim}" />
        <circle cx="112" cy="238" r="20" fill="${metal}" />
        <circle cx="112" cy="238" r="8" fill="${glow}" />
        <circle cx="216" cy="238" r="38" fill="${rim}" />
        <circle cx="216" cy="238" r="20" fill="${metal}" />
        <circle cx="216" cy="238" r="8" fill="${glow}" />
        ${stage >= 2 ? `
          <circle cx="112" cy="238" r="14" fill="none" stroke="${glowStrong}" stroke-width="3" />
          <circle cx="216" cy="238" r="14" fill="none" stroke="${glowStrong}" stroke-width="3" />
        ` : ''}
        ${stage >= 4 ? `
          <ellipse cx="112" cy="238" rx="24" ry="18" fill="${goldStar}" opacity="0.35" />
          <ellipse cx="216" cy="238" rx="24" ry="18" fill="${goldStar}" opacity="0.35" />
        ` : ''}
      `;
  
  const crown = stage >= 5
    ? `
      <path d="M114 72 L138 36 L160 66 L182 36 L206 72 L188 90 H132Z" fill="${mixHex(config.accent, 0.55)}" stroke="${mixHex(config.accent, -0.08)}" stroke-width="7" />
      <circle cx="138" cy="44" r="10" fill="${sparkle}" />
      <circle cx="182" cy="44" r="10" fill="${sparkle}" />
      <circle cx="160" cy="56" r="9" fill="${sparkle}" />
      <circle cx="138" cy="44" r="5" fill="${goldStar}" />
      <circle cx="182" cy="44" r="5" fill="${goldStar}" />
      <circle cx="160" cy="56" r="4.5" fill="${goldStar}" />
      <path d="M126 66 L114 52" stroke="${glowStrong}" stroke-width="6" stroke-linecap="round" />
      <path d="M194 66 L206 52" stroke="${glowStrong}" stroke-width="6" stroke-linecap="round" />
      <path d="M160 36 L160 24" stroke="${goldStar}" stroke-width="4" stroke-linecap="round" />
    `
    : stage >= 4
    ? `
      <path d="M120 78 L140 48 L160 74 L180 48 L200 78 H120Z" fill="${mixHex(config.accent, 0.45)}" stroke="${mixHex(config.accent, -0.06)}" stroke-width="5" />
      <circle cx="140" cy="54" r="8" fill="${sparkle}" />
      <circle cx="180" cy="54" r="8" fill="${sparkle}" />
      <circle cx="140" cy="54" r="4" fill="${goldStar}" />
      <circle cx="180" cy="54" r="4" fill="${goldStar}" />
    `
    : '';
  
  const ribbon = stage >= 4
    ? `
      <path d="M216 92 L236 122 L268 130 L244 152 L248 184 L216 168 L184 184 L188 152 L164 130 L196 122Z" fill="${hexToRgba(config.accent, 0.45)}" stroke="${hexToRgba('#ffffff', 0.55)}" stroke-width="3" />
      <circle cx="216" cy="130" r="12" fill="${sparkle}" />
      <circle cx="216" cy="130" r="6" fill="${goldStar}" />
      <circle cx="244" cy="152" r="6" fill="${pinkGlow}" />
      <circle cx="188" cy="152" r="6" fill="${pinkGlow}" />
    `
    : '';
  
  const sideBadge = stage >= 3
    ? `
      <path d="M102 182 Q124 164 146 182" stroke="${mixHex(config.accent, 0.45)}" stroke-width="14" stroke-linecap="round" />
      <circle cx="124" cy="170" r="9" fill="${sparkle}" />
      <circle cx="124" cy="170" r="4.5" fill="${goldStar}" />
    `
    : '';
  
  const chestPlate = stage >= 2
    ? `
      <ellipse cx="160" cy="188" rx="36" ry="30" fill="${hexToRgba(config.accent, 0.35)}" stroke="${hexToRgba('#ffffff', 0.45)}" stroke-width="4" />
      <circle cx="160" cy="184" r="14" fill="${glow}" />
      <circle cx="160" cy="184" r="7" fill="${sparkle}" />
      <circle cx="160" cy="184" r="3.5" fill="${goldStar}" />
      ${stage >= 4 ? `<ellipse cx="160" cy="184" rx="24" ry="20" fill="none" stroke="${hexToRgba('#ffffff', 0.35)}" stroke-width="2" />` : ''}
    `
    : '';
  
  const wings = stage >= 4
    ? `
      <path d="M56 158 Q32 134 44 110 Q68 122 92 152" fill="${hexToRgba(config.accent, 0.28)}" />
      <path d="M264 158 Q288 134 276 110 Q252 122 228 152" fill="${hexToRgba(config.accent, 0.28)}" />
      <path d="M56 158 Q32 134 44 110" fill="none" stroke="${sparkle}" stroke-width="2.5" opacity="0.7" />
      <path d="M264 158 Q288 134 276 110" fill="none" stroke="${sparkle}" stroke-width="2.5" opacity="0.7" />
      <circle cx="44" cy="110" r="5" fill="${goldStar}" />
      <circle cx="276" cy="110" r="5" fill="${goldStar}" />
    `
    : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <defs>
        <radialGradient id="engineering-bg-${config.assetKey}-${stage}" cx="50%" cy="26%" r="80%">
          <stop offset="0%" stop-color="${mixHex(config.theme, 0.4)}" />
          <stop offset="50%" stop-color="${config.theme}" />
          <stop offset="100%" stop-color="${mixHex(config.theme, -0.18)}" />
        </radialGradient>
        <linearGradient id="engineering-body-${config.assetKey}-${stage}" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="${mixHex(body, 0.22)}" />
          <stop offset="45%" stop-color="${body}" />
          <stop offset="100%" stop-color="${mixHex(body, -0.15)}" />
        </linearGradient>
        <linearGradient id="engineering-glass-${config.assetKey}-${stage}" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stop-color="${hexToRgba('#ffffff', 1)}" />
          <stop offset="35%" stop-color="${canopy}" />
          <stop offset="100%" stop-color="${mixHex(canopy, -0.22)}" />
        </linearGradient>
        <filter id="engineering-glow-${config.assetKey}-${stage}">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="engineering-softglow-${config.assetKey}-${stage}">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="320" height="320" rx="80" fill="url(#engineering-bg-${config.assetKey}-${stage})" />
      ${starParticles}
      ${floatingStars}
      ${heartParticles}
      <circle cx="160" cy="142" r="${108 + stage * 16}" fill="${halo}" />
      <circle cx="160" cy="142" r="${88 + stage * 12}" fill="${hexToRgba(config.accent, 0.12 + stage * 0.03)}" />
      <path d="M48 244 Q160 180 272 244" stroke="${hexToRgba(config.accent, 0.32)}" stroke-width="18" stroke-linecap="round" fill="none" />
      <path d="M64 256 H256" stroke="${hexToRgba('#ffffff', 0.55)}" stroke-width="9" stroke-linecap="round" opacity="0.85" />
      ${workshopPanels}
      <g transform="translate(160 178) scale(${scale}) translate(-160 -188)">
        <ellipse cx="160" cy="280" rx="104" ry="24" fill="${hexToRgba('#0f172a', 0.06)}" />
        ${wings}
        ${buildEngineeringAccessory(config.role, { ...config, detail, trim, metal }, stage)}
        <path d="M68 186 Q82 136 122 128 H206 Q250 136 268 184 V226 Q268 254 228 256 H100 Q68 254 68 226Z" fill="url(#engineering-body-${config.assetKey}-${stage})" />
        <path d="M86 188 Q114 168 144 168 H196 Q226 168 246 188 V216 Q222 232 196 232 H116 Q90 232 68 216Z" fill="${trim}" opacity="0.96" />
        <path d="M102 112 Q124 80 150 80 H194 Q218 80 240 112 V168 H102Z" fill="url(#engineering-glass-${config.assetKey}-${stage})" />
        <path d="M108 120 H232" stroke="${hexToRgba('#ffffff', 0.9)}" stroke-width="9" stroke-linecap="round" />
        <path d="M102 158 Q160 138 238 158" stroke="${hexToRgba(config.accent, 0.3)}" stroke-width="15" stroke-linecap="round" />
        ${buildEngineeringHead(config.role, { trim, detail, body })}
        <path d="M102 168 Q78 148 78 124 Q78 100 114 100 H136 Q150 120 150 154Z" fill="${mixHex(body, -0.1)}" opacity="0.92" />
        <path d="M218 168 Q242 148 242 124 Q242 100 206 100 H184 Q170 120 170 154Z" fill="${mixHex(body, -0.1)}" opacity="0.92" />
        <path d="M128 188 Q160 172 192 188" stroke="${hexToRgba('#ffffff', 0.5)}" stroke-width="11" stroke-linecap="round" />
        <circle cx="140" cy="152" r="16" fill="#1f2937" />
        <circle cx="180" cy="152" r="16" fill="#1f2937" />
        <circle cx="135" cy="147" r="6.5" fill="#ffffff" />
        <circle cx="175" cy="147" r="6.5" fill="#ffffff" />
        <circle cx="137" cy="144" r="3" fill="${config.accent}" />
        <circle cx="177" cy="144" r="3" fill="${config.accent}" />
        <ellipse cx="126" cy="176" rx="16" ry="9" fill="${hexToRgba('#ff69b4', 0.45)}" />
        <ellipse cx="196" cy="176" rx="16" ry="9" fill="${hexToRgba('#ff69b4', 0.45)}" />
        <path d="M142 176 Q160 192 178 176" stroke="#1f2937" stroke-width="9" stroke-linecap="round" fill="none" />
        <rect x="138" y="82" width="44" height="28" rx="14" fill="${detail}" filter="url(#engineering-glow-${config.assetKey}-${stage})" />
        <circle cx="160" cy="80" r="22" fill="${glow}" filter="url(#engineering-glow-${config.assetKey}-${stage})" />
        <circle cx="160" cy="80" r="11" fill="${sparkle}" />
        <circle cx="160" cy="80" r="5.5" fill="${goldStar}" />
        <path d="M94 206 H226" stroke="${hexToRgba('#ffffff', 0.28)}" stroke-width="11" stroke-linecap="round" />
        <path d="M108 216 H178" stroke="${hexToRgba('#ffffff', 0.65)}" stroke-width="7" stroke-linecap="round" />
        ${sideBadge}
        ${chestPlate}
        ${mobility}
        ${ribbon}
        ${crown}
      </g>
    </svg>
  `;
}

function buildMechaAccessory(role, config, stage) {
  const detail = config.detail || mixHex(config.accent, 0.22);
  const trim = config.trim || mixHex(config.accent, -0.18);
  const glow = hexToRgba(config.accent, 0.35 + stage * 0.05);
  const sparkle = hexToRgba('#ffffff', 0.6 + stage * 0.08);

  switch (role) {
    case 'radar':
      return `
        <path d="M230 116 L256 88 L272 104 L246 132Z" fill="${trim}" />
        <circle cx="268" cy="96" r="22" fill="none" stroke="${detail}" stroke-width="7" />
        <path d="M252 96 A16 16 0 0 1 284 96" fill="none" stroke="${hexToRgba(config.accent, 0.55)}" stroke-width="6" stroke-linecap="round" />
        <circle cx="268" cy="96" r="8" fill="${detail}" />
        <circle cx="268" cy="96" r="4" fill="${sparkle}" />
        ${stage >= 3 ? `<path d="M254 88 L246 76" stroke="${glow}" stroke-width="4" stroke-linecap="round" />` : ''}
        ${stage >= 4 ? `<circle cx="280" cy="86" r="6" fill="${glow}" />` : ''}
      `;
    case 'shield':
      return `
        <path d="M66 180 L114 150 L148 172 L124 238 L68 210Z" fill="${detail}" />
        <path d="M88 178 L114 160 L132 176 L116 218 L88 200Z" fill="${mixHex(detail, 0.22)}" />
        <path d="M110 172 V208 M94 190 H130" stroke="${hexToRgba('#ffffff', 0.6)}" stroke-width="5" stroke-linecap="round" />
        ${stage >= 3 ? `<path d="M74 188 L60 176" stroke="${glow}" stroke-width="4" stroke-linecap="round" />` : ''}
        ${stage >= 4 ? `<circle cx="58" cy="170" r="6" fill="${detail}" />` : ''}
      `;
    case 'medic':
      return `
        <circle cx="246" cy="172" r="34" fill="${detail}" />
        <circle cx="246" cy="172" r="22" fill="${mixHex(detail, 0.22)}" />
        <rect x="238" y="152" width="16" height="40" rx="5" fill="#ffffff" />
        <rect x="224" y="166" width="44" height="14" rx="5" fill="#ffffff" />
        ${stage >= 3 ? `<circle cx="246" cy="172" r="10" fill="${glow}" />` : ''}
        ${stage >= 4 ? `<circle cx="246" cy="172" r="5" fill="${sparkle}" />` : ''}
      `;
    case 'assault':
      return `
        <path d="M230 160 L280 132 L292 150 L242 180Z" fill="${detail}" />
        <path d="M234 196 L280 220 L268 236 L222 210Z" fill="${trim}" />
        <path d="M264 178 L288 166 L282 192Z" fill="${hexToRgba(config.accent, 0.5)}" />
        ${stage >= 3 ? `<path d="M268 168 L282 156" stroke="${glow}" stroke-width="4" stroke-linecap="round" />` : ''}
        ${stage >= 4 ? `<circle cx="286" cy="152" r="6" fill="${sparkle}" />` : ''}
      `;
    case 'owl':
      return `
        <path d="M104 172 Q62 150 44 114 Q88 122 126 156" fill="${detail}" opacity="0.9" />
        <path d="M216 172 Q258 150 276 114 Q232 122 194 156" fill="${detail}" opacity="0.9" />
        <path d="M148 76 L160 52 L172 76" fill="${mixHex(config.accent, 0.22)}" />
        <path d="M136 82 L148 62" stroke="${glow}" stroke-width="4" stroke-linecap="round" />
        <path d="M184 82 L172 62" stroke="${glow}" stroke-width="4" stroke-linecap="round" />
        ${stage >= 4 ? `<circle cx="44" cy="108" r="8" fill="${sparkle}" />` : ''}
        ${stage >= 4 ? `<circle cx="276" cy="108" r="8" fill="${sparkle}" />` : ''}
      `;
    default:
      return '';
  }
}

function buildMechaHead(role, config) {
  switch (role) {
    case 'radar':
      return `
        <path d="M120 120 L136 74 L156 108" fill="${config.trim}" />
        <path d="M200 120 L184 74 L164 108" fill="${config.trim}" />
        <path d="M136 74 L150 60 Q158 70 156 108" fill="${mixHex(config.trim, 0.18)}" />
        <circle cx="134" cy="76" r="6" fill="${mixHex(config.body, 0.2)}" />
        <circle cx="186" cy="76" r="6" fill="${mixHex(config.body, 0.2)}" />
      `;
    case 'shield':
      return `
        <path d="M160 68 L186 108 H134Z" fill="${config.trim}" />
        <path d="M144 90 H176" stroke="${hexToRgba('#ffffff', 0.48)}" stroke-width="5" stroke-linecap="round" />
        <path d="M150 80 L156 72 L164 78 L170 72" stroke="${hexToRgba('#ffffff', 0.3)}" stroke-width="3" stroke-linecap="round" fill="none" />
      `;
    case 'medic':
      return `
        <path d="M124 112 Q114 68 142 66 Q150 94 150 118" fill="${config.trim}" />
        <path d="M196 112 Q206 68 178 66 Q170 94 170 118" fill="${config.trim}" />
        <ellipse cx="132" cy="82" rx="8" ry="6" fill="${mixHex(config.body, 0.18)}" />
        <ellipse cx="188" cy="82" rx="8" ry="6" fill="${mixHex(config.body, 0.18)}" />
      `;
    case 'assault':
      return `
        <path d="M122 116 L100 80 L134 84" fill="${config.trim}" />
        <path d="M198 116 L220 80 L186 84" fill="${config.trim}" />
        <path d="M100 80 L88 66 Q98 78 134 84" fill="${mixHex(config.accent, 0.12)}" />
        <path d="M220 80 L232 66 Q222 78 186 84" fill="${mixHex(config.accent, 0.12)}" />
      `;
    case 'owl':
      return `
        <path d="M124 114 L138 64 L160 108" fill="${config.trim}" />
        <path d="M196 114 L182 64 L160 108" fill="${config.trim}" />
        <path d="M138 64 L152 52 Q160 62 160 108" fill="${mixHex(config.trim, 0.2)}" />
        <path d="M144 76 H176" stroke="${hexToRgba('#ffffff', 0.42)}" stroke-width="5" stroke-linecap="round" />
        <path d="M148 66 L156 58" stroke="${hexToRgba(config.accent, 0.5)}" stroke-width="3" stroke-linecap="round" />
        <path d="M172 66 L164 58" stroke="${hexToRgba(config.accent, 0.5)}" stroke-width="3" stroke-linecap="round" />
      `;
    default:
      return '';
  }
}

function buildMechaPetSvg(config, stage) {
  const scale = 0.88 + stage * 0.048;
  const body = config.body || config.accent;
  const armor = config.armor || mixHex(config.theme, -0.16);
  const trim = config.trim || mixHex(body, -0.18);
  const detail = config.detail || mixHex(config.accent, 0.24);
  const visor = config.visor || '#E8F8FF';
  const halo = hexToRgba(config.accent, 0.16 + stage * 0.045);
  const glow = hexToRgba(config.accent, 0.32 + stage * 0.055);
  const glowStrong = hexToRgba(config.accent, 0.52 + stage * 0.06);
  const sparkle = hexToRgba('#ffffff', 0.72 + stage * 0.05);
  const cyanBlast = hexToRgba('#00FFFF', 0.5 + stage * 0.06);
  const purpleBeam = hexToRgba('#BF00FF', 0.45 + stage * 0.06);
  const goldCore = hexToRgba('#FFD700', 0.6 + stage * 0.07);
  
  const orbitDots = Array.from({ length: 8 + stage * 3 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / (8 + stage * 3);
    const x = 160 + Math.cos(angle) * (100 + stage * 10);
    const y = 130 + Math.sin(angle) * (52 + stage * 7);
    const r = 3 + (index % 4) * 1.5;
    const opacity = 0.35 + (index % 5) * 0.13;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${index % 3 === 0 ? cyanBlast : index % 3 === 1 ? sparkle : purpleBeam}" opacity="${opacity}" />`;
  }).join('');
  
  const energyParticles = Array.from({ length: 6 + stage * 2 }, (_, index) => {
    const x = 50 + index * 42;
    const y = 35 + (index % 3) * 25;
    return `<circle cx="${x}" cy="${y}" r="${3 + index % 3}" fill="${index % 2 === 0 ? cyanBlast : purpleBeam}" opacity="0.6" />`;
  }).join('');
  
  const shoulderLights = stage >= 4
    ? `
      <circle cx="106" cy="156" r="18" fill="${hexToRgba(config.accent, 0.5)}" />
      <circle cx="106" cy="156" r="9" fill="${sparkle}" />
      <circle cx="106" cy="156" r="4.5" fill="${cyanBlast}" />
      <circle cx="214" cy="156" r="18" fill="${hexToRgba(config.accent, 0.5)}" />
      <circle cx="214" cy="156" r="9" fill="${sparkle}" />
      <circle cx="214" cy="156" r="4.5" fill="${cyanBlast}" />
      ${stage >= 5 ? `
        <path d="M96 144 L86 130" stroke="${glowStrong}" stroke-width="5" stroke-linecap="round" />
        <path d="M224 144 L234 130" stroke="${glowStrong}" stroke-width="5" stroke-linecap="round" />
        <circle cx="86" cy="126" r="5" fill="${goldCore}" />
        <circle cx="234" cy="126" r="5" fill="${goldCore}" />
      ` : ''}
    `
    : stage >= 3
    ? `
      <circle cx="108" cy="158" r="14" fill="${hexToRgba(config.accent, 0.4)}" />
      <circle cx="108" cy="158" r="7" fill="${sparkle}" />
      <circle cx="212" cy="158" r="14" fill="${hexToRgba(config.accent, 0.4)}" />
      <circle cx="212" cy="158" r="7" fill="${sparkle}" />
    `
    : '';
  
  const crown = stage >= 5
    ? `
      <path d="M114 64 L140 32 L160 62 L180 32 L206 64 L186 84 H134Z" fill="${mixHex(config.accent, 0.4)}" stroke="${mixHex(config.accent, -0.08)}" stroke-width="6" />
      <circle cx="140" cy="40" r="9" fill="${sparkle}" />
      <circle cx="180" cy="40" r="9" fill="${sparkle}" />
      <circle cx="160" cy="52" r="8" fill="${sparkle}" />
      <circle cx="140" cy="40" r="4.5" fill="${cyanBlast}" />
      <circle cx="180" cy="40" r="4.5" fill="${cyanBlast}" />
      <circle cx="160" cy="52" r="4" fill="${goldCore}" />
      <path d="M128 60 L116 46" stroke="${glowStrong}" stroke-width="5" stroke-linecap="round" />
      <path d="M192 60 L204 46" stroke="${glowStrong}" stroke-width="5" stroke-linecap="round" />
      <path d="M160 32 L160 18" stroke="${goldCore}" stroke-width="4" stroke-linecap="round" />
    `
    : '';
  
  const orbitRing = stage >= 3
    ? `
      <path d="M68 132 Q160 58 252 132" fill="none" stroke="${hexToRgba(config.accent, 0.3)}" stroke-width="14" stroke-linecap="round" />
      <path d="M76 142 Q160 74 244 142" fill="none" stroke="${hexToRgba('#ffffff', 0.18)}" stroke-width="5" stroke-linecap="round" />
      <path d="M84 130 Q160 66 236 130" fill="none" stroke="${cyanBlast}" stroke-width="2" stroke-linecap="round" opacity="0.5" />
    `
    : '';
  
  const chestCore = stage >= 2
    ? `
      <circle cx="160" cy="186" r="26" fill="${hexToRgba(config.accent, 0.22)}" stroke="${hexToRgba('#ffffff', 0.3)}" stroke-width="4" />
      <circle cx="160" cy="186" r="12" fill="${glow}" />
      <circle cx="160" cy="186" r="6" fill="${sparkle}" />
      <circle cx="160" cy="186" r="3" fill="${cyanBlast}" />
      ${stage >= 4 ? `
        <circle cx="160" cy="186" r="20" fill="none" stroke="${hexToRgba(config.accent, 0.45)}" stroke-width="3" />
        <circle cx="160" cy="186" r="28" fill="none" stroke="${purpleBeam}" stroke-width="2" opacity="0.6" />
      ` : ''}
    `
    : '';
  
  const energyLines = stage >= 3
    ? `
      <path d="M98 202 Q76 214 64 238" stroke="${hexToRgba(config.accent, 0.45)}" stroke-width="5" stroke-linecap="round" fill="none" />
      <path d="M222 202 Q244 214 256 238" stroke="${hexToRgba(config.accent, 0.45)}" stroke-width="5" stroke-linecap="round" fill="none" />
      <path d="M64 238 L56 248" stroke="${cyanBlast}" stroke-width="3" stroke-linecap="round" />
      <path d="M256 238 L264 248" stroke="${cyanBlast}" stroke-width="3" stroke-linecap="round" />
    `
    : '';
  
  const backThrusters = stage >= 4
    ? `
      <ellipse cx="80" cy="200" rx="18" ry="12" fill="${hexToRgba(config.accent, 0.3)}" />
      <ellipse cx="80" cy="200" rx="10" ry="7" fill="${cyanBlast}" opacity="0.7" />
      <ellipse cx="240" cy="200" rx="18" ry="12" fill="${hexToRgba(config.accent, 0.3)}" />
      <ellipse cx="240" cy="200" rx="10" ry="7" fill="${cyanBlast}" opacity="0.7" />
      ${stage >= 5 ? `
        <path d="M70 192 Q60 180 70 168" stroke="${purpleBeam}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.6" />
        <path d="M250 192 Q260 180 250 168" stroke="${purpleBeam}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.6" />
      ` : ''}
    `
    : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <defs>
        <radialGradient id="mecha-bg-${config.assetKey}-${stage}" cx="50%" cy="28%" r="75%">
          <stop offset="0%" stop-color="${mixHex(config.theme, 0.28)}" />
          <stop offset="50%" stop-color="${config.theme}" />
          <stop offset="100%" stop-color="${mixHex(config.theme, -0.12)}" />
        </radialGradient>
        <linearGradient id="mecha-body-${config.assetKey}-${stage}" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="${mixHex(body, 0.18)}" />
          <stop offset="45%" stop-color="${body}" />
          <stop offset="100%" stop-color="${mixHex(body, -0.16)}" />
        </linearGradient>
        <linearGradient id="mecha-armor-${config.assetKey}-${stage}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${armor}" />
          <stop offset="100%" stop-color="${mixHex(armor, -0.12)}" />
        </linearGradient>
        <filter id="mecha-glow-${config.assetKey}-${stage}">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="mecha-coreglow-${config.assetKey}-${stage}">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="320" height="320" rx="80" fill="url(#mecha-bg-${config.assetKey}-${stage})" />
      ${energyParticles}
      <circle cx="160" cy="140" r="${106 + stage * 14}" fill="${halo}" />
      <circle cx="160" cy="140" r="${86 + stage * 10}" fill="${hexToRgba(config.accent, 0.08 + stage * 0.02)}" />
      <path d="M68 240 Q160 188 252 240" stroke="${hexToRgba(config.accent, 0.3)}" stroke-width="14" stroke-linecap="round" fill="none" />
      <path d="M84 252 H236" stroke="${hexToRgba('#ffffff', 0.35)}" stroke-width="6" stroke-linecap="round" opacity="0.65" />
      ${orbitRing}
      ${orbitDots}
      <g transform="translate(160 178) scale(${scale}) translate(-160 -186)">
        <ellipse cx="160" cy="276" rx="98" ry="22" fill="${hexToRgba('#0f172a', 0.08)}" />
        ${backThrusters}
        ${buildMechaAccessory(config.role, { ...config, detail, trim }, stage)}
        <path d="M100 220 Q74 176 98 130 Q120 88 160 88 Q200 88 222 130 Q246 176 220 220 Q194 252 160 252 Q126 252 100 220Z" fill="url(#mecha-body-${config.assetKey}-${stage})" />
        <path d="M92 170 L70 210 L106 210 L130 184" fill="${trim}" />
        <path d="M228 170 L250 210 L214 210 L190 184" fill="${trim}" />
        <path d="M122 118 Q140 78 160 78 Q180 78 198 118 V162 Q198 186 178 198 H142 Q122 186 122 162Z" fill="url(#mecha-armor-${config.assetKey}-${stage})" />
        <path d="M110 154 Q86 160 84 184 Q112 184 130 168" fill="${mixHex(body, -0.1)}" />
        <path d="M210 154 Q234 160 236 184 Q208 184 190 168" fill="${mixHex(body, -0.1)}" />
        ${buildMechaHead(config.role, { trim, body, accent: config.accent })}
        <path d="M124 188 H196" stroke="${hexToRgba('#ffffff', 0.35)}" stroke-width="12" stroke-linecap="round" />
        <rect x="126" y="120" width="68" height="24" rx="12" fill="${visor}" filter="url(#mecha-glow-${config.assetKey}-${stage})" />
        <circle cx="142" cy="132" r="6" fill="${config.accent}" />
        <circle cx="178" cy="132" r="6" fill="${config.accent}" />
        <circle cx="140" cy="129" r="2.5" fill="#ffffff" />
        <circle cx="176" cy="129" r="2.5" fill="#ffffff" />
        <circle cx="143" cy="127" r="1.2" fill="${cyanBlast}" />
        <circle cx="179" cy="127" r="1.2" fill="${cyanBlast}" />
        <path d="M142 154 Q160 168 178 154" stroke="${trim}" stroke-width="7" stroke-linecap="round" fill="none" />
        <ellipse cx="128" cy="176" rx="14" ry="8" fill="${hexToRgba('#ff69b4', 0.32)}" />
        <ellipse cx="192" cy="176" rx="14" ry="8" fill="${hexToRgba('#ff69b4', 0.32)}" />
        <path d="M114 196 L98 244 H136 L148 204" fill="${trim}" />
        <path d="M206 196 L222 244 H184 L172 204" fill="${trim}" />
        <path d="M130 198 H190" stroke="${detail}" stroke-width="16" stroke-linecap="round" />
        <circle cx="160" cy="186" r="24" fill="${detail}" />
        <circle cx="160" cy="186" r="12" fill="${hexToRgba('#ffffff', 0.62)}" />
        <circle cx="160" cy="186" r="6" fill="${sparkle}" filter="url(#mecha-coreglow-${config.assetKey}-${stage})" />
        <path d="M160 170 V202 M144 186 H176" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="${config.role === 'medic' ? '1' : '0.28'}" />
        <path d="M112 216 Q160 232 208 216" stroke="${hexToRgba('#ffffff', 0.38)}" stroke-width="8" stroke-linecap="round" />
        ${shoulderLights}
        ${chestCore}
        ${energyLines}
        ${crown}
      </g>
    </svg>
  `;
}

function createGeneratedStages(renderer, config, count = 5) {
  return Array.from({ length: count }, (_, index) => svgToDataUri(renderer(config, index + 1)));
}

function createGeneratedPet(id, config) {
  const evolutionStages = createGeneratedStages(config.renderer, config);

  return createPet({
    id,
    name: config.name,
    species: config.species,
    emoji: config.emoji,
    rarity: config.rarity,
    badge: config.badge,
    theme: config.theme,
    accent: config.accent,
    quote: config.quote,
    vibe: config.vibe,
    image: evolutionStages[0],
    evolutionStages,
    assetKey: config.assetKey,
    seriesKey: config.seriesKey,
    seriesRole: config.role || null
  });
}
const ORIGINAL_PET_SERIES = [
  {
    assetKey: 'engineer-excavator-cat',
    seriesKey: 'engineering',
    name: '铲铲工程喵',
    species: '工程车萌宠',
    emoji: '🛠️',
    rarity: 'rare',
    badge: '工地主力',
    theme: '#FFF6E8',
    accent: '#F59E0B',
    body: '#F6A71C',
    canopy: '#FFF7D6',
    detail: '#F97316',
    quote: '小铲斗一挥，就像把课堂任务稳稳推进了一格。',
    vibe: '适合奖励执行力稳定、愿意一步一步搭建作品的学生。',
    role: 'excavator',
    renderer: buildEngineeringPetSvg
  },
  {
    assetKey: 'engineer-bulldozer-dog',
    seriesKey: 'engineering',
    name: '轰隆推推犬',
    species: '工程车萌宠',
    emoji: '🚜',
    rarity: 'rare',
    badge: '推进先锋',
    theme: '#FFF3E8',
    accent: '#FB7185',
    body: '#FB7185',
    canopy: '#FFE6EE',
    detail: '#F97316',
    quote: '一到关键时刻就会顶着前铲往前冲，特别有带节奏的气场。',
    vibe: '很适合课堂里那种行动快、落地快、愿意先做再优化的孩子。',
    role: 'bulldozer',
    renderer: buildEngineeringPetSvg
  },
  {
    assetKey: 'engineer-crane-bunny',
    seriesKey: 'engineering',
    name: '云梯吊吊兔',
    species: '工程车萌宠',
    emoji: '🏗️',
    rarity: 'epic',
    badge: '高空搭建',
    theme: '#EEF7FF',
    accent: '#38BDF8',
    body: '#60A5FA',
    canopy: '#F0F9FF',
    detail: '#0EA5E9',
    quote: '能把课堂里的大想法吊到高处，让展示时刻更有“作品完成了”的仪式感。',
    vibe: '适合给创意多、喜欢做大场景作品的学生做长期搭档。',
    role: 'crane',
    renderer: buildEngineeringPetSvg
  },
  {
    assetKey: 'engineer-mixer-deer',
    seriesKey: 'engineering',
    name: '旋旋搅拌鹿',
    species: '工程车萌宠',
    emoji: '⚙️',
    rarity: 'epic',
    badge: '灵感混合',
    theme: '#FFF1F5',
    accent: '#EC4899',
    body: '#F472B6',
    canopy: '#FFF1F7',
    detail: '#FB7185',
    quote: '会把灵感、耐心和动手能力慢慢搅拌成一个完整作品。',
    vibe: '特别适合奖励能把零散想法整理成成品的学生。',
    role: 'mixer',
    renderer: buildEngineeringPetSvg
  },
  {
    assetKey: 'engineer-roller-bear',
    seriesKey: 'engineering',
    name: '滚滚压路熊',
    species: '工程车萌宠',
    emoji: '🛞',
    rarity: 'legendary',
    badge: '地基压轴',
    theme: '#F5F3FF',
    accent: '#8B5CF6',
    body: '#8B5CF6',
    canopy: '#F3E8FF',
    detail: '#A855F7',
    quote: '专门负责把课堂里的基础打稳，越到后期越有压轴角色的存在感。',
    vibe: '适合那些肯反复调试、把作品打磨得很扎实的学生。',
    role: 'roller',
    renderer: buildEngineeringPetSvg
  },
  {
    assetKey: 'tactical-radar-fox',
    seriesKey: 'mecha',
    name: '雷达侦察狐',
    species: '特勤机甲伙伴',
    emoji: '🛰️',
    rarity: 'epic',
    badge: '前线扫描',
    theme: '#EEF6FF',
    accent: '#2563EB',
    body: '#3B82F6',
    armor: '#DBEAFE',
    detail: '#38BDF8',
    visor: '#E0F2FE',
    quote: '一开机就像把全场信息扫过一遍，特别适合课堂里思路清晰的孩子。',
    vibe: '未来如果加班级对战，它会很自然地承担侦察和先手定位的角色。',
    role: 'radar',
    renderer: buildMechaPetSvg
  },
  {
    assetKey: 'tactical-shield-rhino',
    seriesKey: 'mecha',
    name: '重盾机甲犀',
    species: '特勤机甲伙伴',
    emoji: '🛡️',
    rarity: 'epic',
    badge: '前排守护',
    theme: '#EEF2FF',
    accent: '#4F46E5',
    body: '#6366F1',
    armor: '#E0E7FF',
    detail: '#818CF8',
    visor: '#D1FAFF',
    quote: '站在最前面扛住压力，是那种会让人一眼觉得“这只很可靠”的守护型主角。',
    vibe: '很适合给班里能稳住节奏、愿意帮同学兜底的学生。',
    role: 'shield',
    renderer: buildMechaPetSvg
  },
  {
    assetKey: 'tactical-medic-deer',
    seriesKey: 'mecha',
    name: '修复支援鹿',
    species: '特勤机甲伙伴',
    emoji: '🩺',
    rarity: 'epic',
    badge: '续航支援',
    theme: '#ECFDF5',
    accent: '#10B981',
    body: '#34D399',
    armor: '#D1FAE5',
    detail: '#14B8A6',
    visor: '#CCFBF1',
    quote: '会在你快想放弃的时候默默把状态补回来，是最有陪伴感的支援型伙伴。',
    vibe: '适合奖励那些越挫越稳、能把过程重新修正回正轨的学生。',
    role: 'medic',
    renderer: buildMechaPetSvg
  },
  {
    assetKey: 'tactical-assault-wolf',
    seriesKey: 'mecha',
    name: '风暴突击狼',
    species: '特勤机甲伙伴',
    emoji: '⚡',
    rarity: 'legendary',
    badge: '冲锋压制',
    theme: '#FFF1F2',
    accent: '#EF4444',
    body: '#F87171',
    armor: '#FEE2E2',
    detail: '#F97316',
    visor: '#FDE68A',
    quote: '一旦进入终阶形态，整只宠物都会像开了冲锋特效一样把现场气氛点燃。',
    vibe: '特别适合做班级高光奖励，让学生立刻感到“我的宠物战力上来了”。',
    role: 'assault',
    renderer: buildMechaPetSvg
  },
  {
    assetKey: 'tactical-owl-commander',
    seriesKey: 'mecha',
    name: '星轨指挥鸮',
    species: '特勤机甲伙伴',
    emoji: '🦉',
    rarity: 'legendary',
    badge: '指挥终章',
    theme: '#F5F3FF',
    accent: '#A855F7',
    body: '#A855F7',
    armor: '#EDE9FE',
    detail: '#C084FC',
    visor: '#E0F2FE',
    quote: '像从动画主角团里走出来的指挥官，特别适合作为收藏线压轴。',
    vibe: '适合那些审美强、表现稳定、又想养一只更有主角感宠物的学生。',
    role: 'owl',
    renderer: buildMechaPetSvg
  }
];
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
    assetKey: key,
    seriesKey: resolveSeriesKeyFromFamily(meta.family)
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

const originalSeriesCatalog = ORIGINAL_PET_SERIES
  .map((item, index) => createGeneratedPet(legacyCatalog.length + remoteExtras.length + index + 1, item));

module.exports = [...legacyCatalog, ...remoteExtras, ...originalSeriesCatalog];
