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
        <path d="M122 112 L134 78 L152 110" fill="${config.trim}" />
        <path d="M198 112 L186 78 L168 110" fill="${config.trim}" />
      `;
    case 'bulldozer':
      return `
        <path d="M118 128 Q102 104 114 90 Q136 92 142 118" fill="${mixHex(config.trim, 0.08)}" />
        <path d="M202 128 Q218 104 206 90 Q184 92 178 118" fill="${mixHex(config.trim, 0.08)}" />
      `;
    case 'crane':
      return `
        <path d="M134 114 L126 62 L144 56 L152 114" fill="${config.trim}" />
        <path d="M186 114 L194 62 L176 56 L168 114" fill="${config.trim}" />
        <path d="M134 70 L144 64 M186 70 L176 64" stroke="${mixHex(config.trim, 0.24)}" stroke-width="3" stroke-linecap="round" />
      `;
    case 'mixer':
      return `
        <path d="M138 98 Q126 70 142 58 Q156 72 152 102" fill="${config.trim}" />
        <path d="M182 98 Q194 70 178 58 Q164 72 168 102" fill="${config.trim}" />
        <circle cx="144" cy="82" r="6" fill="${config.detail}" />
        <circle cx="176" cy="82" r="6" fill="${config.detail}" />
      `;
    case 'roller':
      return `
        <circle cx="134" cy="94" r="16" fill="${config.trim}" />
        <circle cx="186" cy="94" r="16" fill="${config.trim}" />
        <circle cx="134" cy="94" r="8" fill="${mixHex(config.trim, 0.18)}" />
        <circle cx="186" cy="94" r="8" fill="${mixHex(config.trim, 0.18)}" />
      `;
    default:
      return '';
  }
}

function buildEngineeringAccessory(role, config, stage) {
  const metal = config.metal || '#D7E1EC';
  const trim = config.trim || mixHex(config.accent, -0.18);
  const detail = config.detail || mixHex(config.accent, 0.16);
  const glow = hexToRgba(config.accent, 0.2 + stage * 0.03);

  switch (role) {
    case 'excavator':
      return `
        <path d="M214 176 L238 140 L256 146 L232 182" fill="${trim}" />
        <path d="M238 140 L276 122 L286 136 L254 152" fill="${metal}" />
        <path d="M276 122 Q292 126 290 140 Q282 154 266 150 L258 140 Q270 134 276 122Z" fill="${detail}" />
        <path d="M220 172 L208 162" stroke="${metal}" stroke-width="5" stroke-linecap="round" />
        <circle cx="240" cy="142" r="7" fill="${glow}" />
      `;
    case 'bulldozer':
      return `
        <path d="M224 182 L286 170 L290 206 L220 214 Q208 196 224 182Z" fill="${detail}" />
        <path d="M232 182 L282 174" stroke="${mixHex(detail, 0.28)}" stroke-width="6" stroke-linecap="round" />
        <path d="M240 170 L252 146 L270 146 L262 176" fill="${trim}" />
        <path d="M232 212 H286" stroke="${hexToRgba('#ffffff', 0.46)}" stroke-width="4" stroke-linecap="round" />
      `;
    case 'crane':
      return `
        <path d="M186 124 L264 86 L274 100 L198 136" fill="${trim}" />
        <path d="M260 92 L270 154" stroke="${metal}" stroke-width="7" stroke-linecap="round" />
        <path d="M270 154 V194" stroke="${metal}" stroke-width="4" stroke-linecap="round" />
        <path d="M260 194 Q270 210 280 194" fill="none" stroke="${detail}" stroke-width="6" stroke-linecap="round" />
        <circle cx="270" cy="152" r="7" fill="${glow}" />
      `;
    case 'mixer':
      return `
        <g transform="translate(228 180)">
          <circle cx="0" cy="0" r="34" fill="${detail}" />
          <circle cx="0" cy="0" r="24" fill="${mixHex(config.theme, -0.06)}" />
          <path d="M-20 -6 Q0 -24 20 -6" stroke="${metal}" stroke-width="8" stroke-linecap="round" fill="none" />
          <path d="M-18 10 Q0 -8 18 10" stroke="${metal}" stroke-width="8" stroke-linecap="round" fill="none" />
          <path d="M-12 -22 L18 18" stroke="${hexToRgba('#ffffff', 0.42)}" stroke-width="4" stroke-linecap="round" />
          <circle cx="0" cy="0" r="6" fill="${glow}" />
        </g>
      `;
    case 'roller':
      return `
        <rect x="212" y="172" width="44" height="14" rx="7" fill="${trim}" />
        <ellipse cx="252" cy="212" rx="48" ry="34" fill="${detail}" />
        <ellipse cx="252" cy="212" rx="32" ry="22" fill="${mixHex(detail, 0.22)}" />
        <ellipse cx="252" cy="212" rx="16" ry="10" fill="${hexToRgba('#ffffff', 0.28)}" />
        <path d="M214 186 L202 166" stroke="${metal}" stroke-width="7" stroke-linecap="round" />
      `;
    default:
      return '';
  }
}

function buildEngineeringPetSvg(config, stage) {
  const scale = 0.85 + stage * 0.075;
  const body = config.body || config.accent;
  const canopy = config.canopy || mixHex(config.theme, -0.04);
  const trim = config.trim || mixHex(body, -0.2);
  const detail = config.detail || mixHex(config.accent, 0.16);
  const metal = config.metal || '#E6EEF7';
  const rim = config.rim || '#1E293B';
  const halo = hexToRgba(config.accent, 0.12 + stage * 0.03);
  const glow = hexToRgba(config.accent, 0.2 + stage * 0.04);
  const stripe = mixHex(config.accent, 0.32);
  const sparkles = Array.from({ length: stage + 2 }, (_, index) => {
    const x = 62 + index * 30;
    const y = index % 2 === 0 ? 58 : 74;
    const size = index % 3 === 0 ? 4 : 3;
    return `<circle cx="${x}" cy="${y}" r="${size}" fill="${hexToRgba('#ffffff', 0.72)}" />`;
  }).join('');
  const workshopPanels = Array.from({ length: 3 }, (_, index) => {
    const offset = 58 + index * 66;
    return `
      <rect x="${offset}" y="${44 + index * 10}" width="44" height="18" rx="9" fill="${hexToRgba('#ffffff', 0.3)}" />
      <circle cx="${offset + 12}" cy="${53 + index * 10}" r="3" fill="${hexToRgba(config.accent, 0.42)}" />
      <rect x="${offset + 20}" y="${49 + index * 10}" width="16" height="6" rx="3" fill="${hexToRgba('#ffffff', 0.56)}" />
    `;
  }).join('');
  const mobility = config.role === 'bulldozer'
    ? `
      <rect x="92" y="214" width="136" height="38" rx="18" fill="${rim}" />
      <rect x="104" y="224" width="112" height="18" rx="9" fill="${mixHex(rim, 0.16)}" />
      ${Array.from({ length: 6 }, (_, index) => `<rect x="${108 + index * 18}" y="226" width="10" height="14" rx="4" fill="${metal}" opacity="0.84" />`).join('')}
    `
    : config.role === 'roller'
      ? `
        <circle cx="124" cy="232" r="26" fill="${rim}" />
        <circle cx="124" cy="232" r="13" fill="${metal}" />
        <ellipse cx="204" cy="228" rx="42" ry="30" fill="${detail}" />
        <ellipse cx="204" cy="228" rx="26" ry="18" fill="${mixHex(detail, 0.28)}" />
      `
      : `
        <circle cx="122" cy="232" r="26" fill="${rim}" />
        <circle cx="122" cy="232" r="14" fill="${metal}" />
        <circle cx="206" cy="232" r="26" fill="${rim}" />
        <circle cx="206" cy="232" r="14" fill="${metal}" />
      `;
  const crown = stage >= 5
    ? `<path d="M126 82 L142 54 L160 78 L178 54 L194 82 L180 94 H140Z" fill="${mixHex(config.accent, 0.34)}" stroke="${mixHex(config.accent, -0.18)}" stroke-width="4" />`
    : '';
  const ribbon = stage >= 4
    ? `<path d="M210 102 L224 126 L250 132 L232 148 L236 174 L210 162 L184 174 L188 148 L170 132 L196 126Z" fill="${hexToRgba(config.accent, 0.24)}" />`
    : '';
  const sideBadge = stage >= 3
    ? `<path d="M110 176 Q126 164 142 176" stroke="${stripe}" stroke-width="8" stroke-linecap="round" />`
    : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <defs>
        <radialGradient id="engineering-bg-${config.assetKey}-${stage}" cx="50%" cy="34%" r="72%">
          <stop offset="0%" stop-color="${mixHex(config.theme, 0.22)}" />
          <stop offset="64%" stop-color="${config.theme}" />
          <stop offset="100%" stop-color="${mixHex(config.theme, -0.06)}" />
        </radialGradient>
        <linearGradient id="engineering-body-${config.assetKey}-${stage}" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="${mixHex(body, 0.12)}" />
          <stop offset="100%" stop-color="${mixHex(body, -0.08)}" />
        </linearGradient>
        <linearGradient id="engineering-glass-${config.assetKey}-${stage}" x1="18%" y1="0%" x2="82%" y2="100%">
          <stop offset="0%" stop-color="${hexToRgba('#ffffff', 0.96)}" />
          <stop offset="56%" stop-color="${canopy}" />
          <stop offset="100%" stop-color="${mixHex(canopy, -0.08)}" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="80" fill="url(#engineering-bg-${config.assetKey}-${stage})" />
      <circle cx="160" cy="152" r="${92 + stage * 10}" fill="${halo}" />
      <path d="M60 232 Q160 188 260 232" stroke="${hexToRgba(config.accent, 0.18)}" stroke-width="12" stroke-linecap="round" fill="none" />
      <path d="M74 244 H246" stroke="${hexToRgba('#ffffff', 0.38)}" stroke-width="6" stroke-linecap="round" opacity="0.72" />
      ${workshopPanels}
      ${sparkles}
      <g transform="translate(160 184) scale(${scale}) translate(-160 -184)">
        <ellipse cx="160" cy="270" rx="92" ry="18" fill="${hexToRgba('#0f172a', 0.15)}" />
        ${buildEngineeringAccessory(config.role, { ...config, detail, trim, metal }, stage)}
        <path d="M80 178 Q88 142 122 138 H206 Q240 142 248 176 V214 Q248 242 220 244 H108 Q80 242 80 214Z" fill="url(#engineering-body-${config.assetKey}-${stage})" />
        <path d="M96 180 Q118 166 144 166 H196 Q220 166 236 180 V210 Q218 222 198 222 H122 Q102 222 84 210Z" fill="${trim}" opacity="0.9" />
        <path d="M112 122 Q128 98 150 98 H194 Q214 98 228 122 V162 H112Z" fill="url(#engineering-glass-${config.assetKey}-${stage})" />
        <path d="M118 130 H222" stroke="${hexToRgba('#ffffff', 0.72)}" stroke-width="6" stroke-linecap="round" />
        <path d="M112 152 Q160 136 228 152" stroke="${hexToRgba(config.accent, 0.16)}" stroke-width="10" stroke-linecap="round" />
        ${buildEngineeringHead(config.role, { trim, detail })}
        <path d="M112 160 Q94 146 94 128 Q94 112 110 112 H128 Q138 126 138 154Z" fill="${mixHex(body, -0.04)}" opacity="0.86" />
        <path d="M208 160 Q226 146 226 128 Q226 112 210 112 H192 Q182 126 182 154Z" fill="${mixHex(body, -0.04)}" opacity="0.86" />
        <path d="M134 182 Q160 172 186 182" stroke="${hexToRgba('#ffffff', 0.32)}" stroke-width="8" stroke-linecap="round" />
        <circle cx="146" cy="146" r="10" fill="#1f2937" />
        <circle cx="176" cy="146" r="10" fill="#1f2937" />
        <circle cx="142" cy="142" r="3.5" fill="#ffffff" />
        <circle cx="172" cy="142" r="3.5" fill="#ffffff" />
        <ellipse cx="132" cy="164" rx="10" ry="6" fill="${hexToRgba('#fb7185', 0.3)}" />
        <ellipse cx="190" cy="164" rx="10" ry="6" fill="${hexToRgba('#fb7185', 0.3)}" />
        <path d="M148 164 Q160 174 172 164" stroke="#1f2937" stroke-width="6" stroke-linecap="round" fill="none" />
        <rect x="144" y="94" width="32" height="18" rx="9" fill="${detail}" />
        <circle cx="160" cy="92" r="12" fill="${glow}" />
        <path d="M106 198 H214" stroke="${hexToRgba('#ffffff', 0.2)}" stroke-width="8" stroke-linecap="round" />
        <path d="M114 204 H170" stroke="${hexToRgba('#ffffff', 0.5)}" stroke-width="4" stroke-linecap="round" />
        ${sideBadge}
        ${mobility}
        ${ribbon}
        ${crown}
      </g>
    </svg>
  `;
}

function buildMechaAccessory(role, config, stage) {
  const detail = config.detail || mixHex(config.accent, 0.2);
  const trim = config.trim || mixHex(config.accent, -0.2);

  switch (role) {
    case 'radar':
      return `
        <path d="M228 118 L252 92 L266 106 L242 132Z" fill="${trim}" />
        <circle cx="262" cy="98" r="18" fill="none" stroke="${detail}" stroke-width="6" />
        <path d="M248 98 A14 14 0 0 1 276 98" fill="none" stroke="${hexToRgba(config.accent, 0.48)}" stroke-width="5" stroke-linecap="round" />
        <circle cx="262" cy="98" r="6" fill="${detail}" />
      `;
    case 'shield':
      return `
        <path d="M70 178 L114 150 L146 170 L124 234 L72 208Z" fill="${detail}" />
        <path d="M90 176 L114 160 L130 174 L116 212 L90 198Z" fill="${mixHex(detail, 0.18)}" />
        <path d="M112 172 V204 M98 188 H126" stroke="${hexToRgba('#ffffff', 0.54)}" stroke-width="4" stroke-linecap="round" />
      `;
    case 'medic':
      return `
        <circle cx="244" cy="174" r="30" fill="${detail}" />
        <circle cx="244" cy="174" r="18" fill="${mixHex(detail, 0.18)}" />
        <rect x="238" y="156" width="12" height="36" rx="4" fill="#ffffff" />
        <rect x="226" y="168" width="36" height="12" rx="4" fill="#ffffff" />
      `;
    case 'assault':
      return `
        <path d="M228 162 L274 136 L284 152 L238 178Z" fill="${detail}" />
        <path d="M232 194 L274 216 L264 230 L222 206Z" fill="${trim}" />
        <path d="M260 180 L282 170 L276 192Z" fill="${hexToRgba(config.accent, 0.42)}" />
      `;
    case 'owl':
      return `
        <path d="M108 170 Q70 150 54 118 Q92 124 124 154" fill="${detail}" opacity="0.88" />
        <path d="M212 170 Q250 150 266 118 Q228 124 196 154" fill="${detail}" opacity="0.88" />
        <path d="M150 78 L160 56 L170 78" fill="${mixHex(config.accent, 0.18)}" />
      `;
    default:
      return '';
  }
}

function buildMechaHead(role, config) {
  switch (role) {
    case 'radar':
      return `
        <path d="M124 118 L138 78 L156 110" fill="${config.trim}" />
        <path d="M196 118 L182 78 L164 110" fill="${config.trim}" />
      `;
    case 'shield':
      return `
        <path d="M160 72 L182 106 H138Z" fill="${config.trim}" />
        <path d="M146 88 H174" stroke="${hexToRgba('#ffffff', 0.42)}" stroke-width="4" stroke-linecap="round" />
      `;
    case 'medic':
      return `
        <path d="M128 110 Q120 72 144 70 Q150 96 150 118" fill="${config.trim}" />
        <path d="M192 110 Q200 72 176 70 Q170 96 170 118" fill="${config.trim}" />
      `;
    case 'assault':
      return `
        <path d="M126 114 L106 82 L136 86" fill="${config.trim}" />
        <path d="M194 114 L214 82 L184 86" fill="${config.trim}" />
      `;
    case 'owl':
      return `
        <path d="M128 112 L140 68 L156 110" fill="${config.trim}" />
        <path d="M192 112 L180 68 L164 110" fill="${config.trim}" />
        <path d="M146 78 H174" stroke="${hexToRgba('#ffffff', 0.36)}" stroke-width="4" stroke-linecap="round" />
      `;
    default:
      return '';
  }
}

function buildMechaPetSvg(config, stage) {
  const scale = 0.86 + stage * 0.075;
  const body = config.body || config.accent;
  const armor = config.armor || mixHex(config.theme, -0.12);
  const trim = config.trim || mixHex(body, -0.18);
  const detail = config.detail || mixHex(config.accent, 0.2);
  const visor = config.visor || '#DFF7FF';
  const halo = hexToRgba(config.accent, 0.12 + stage * 0.032);
  const orbitDots = Array.from({ length: stage + 3 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / (stage + 3);
    const x = 160 + Math.cos(angle) * 92;
    const y = 128 + Math.sin(angle) * 44;
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${index % 2 === 0 ? 4 : 3}" fill="${hexToRgba(config.accent, 0.42)}" />`;
  }).join('');
  const shoulderLights = stage >= 4
    ? `
      <circle cx="112" cy="160" r="10" fill="${hexToRgba(config.accent, 0.42)}" />
      <circle cx="208" cy="160" r="10" fill="${hexToRgba(config.accent, 0.42)}" />
    `
    : '';
  const crown = stage >= 5
    ? `<path d="M124 72 L142 46 L160 74 L178 46 L196 72 L182 86 H138Z" fill="${mixHex(config.accent, 0.26)}" stroke="${mixHex(config.accent, -0.18)}" stroke-width="4" />`
    : '';
  const orbitRing = stage >= 3
    ? `<path d="M78 138 Q160 74 242 138" fill="none" stroke="${hexToRgba(config.accent, 0.22)}" stroke-width="10" stroke-linecap="round" />`
    : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <defs>
        <radialGradient id="mecha-bg-${config.assetKey}-${stage}" cx="50%" cy="34%" r="70%">
          <stop offset="0%" stop-color="${mixHex(config.theme, 0.18)}" />
          <stop offset="58%" stop-color="${config.theme}" />
          <stop offset="100%" stop-color="${mixHex(config.theme, -0.08)}" />
        </radialGradient>
        <linearGradient id="mecha-body-${config.assetKey}-${stage}" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="${mixHex(body, 0.1)}" />
          <stop offset="100%" stop-color="${mixHex(body, -0.12)}" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="80" fill="url(#mecha-bg-${config.assetKey}-${stage})" />
      <circle cx="160" cy="146" r="${94 + stage * 10}" fill="${halo}" />
      <path d="M78 232 Q160 198 242 232" stroke="${hexToRgba(config.accent, 0.22)}" stroke-width="10" stroke-linecap="round" fill="none" />
      ${orbitRing}
      ${orbitDots}
      <g transform="translate(160 182) scale(${scale}) translate(-160 -182)">
        <ellipse cx="160" cy="268" rx="90" ry="18" fill="${hexToRgba('#0f172a', 0.14)}" />
        ${buildMechaAccessory(config.role, { ...config, detail, trim }, stage)}
        <path d="M108 212 Q86 176 104 138 Q122 104 160 104 Q198 104 216 138 Q234 176 212 212 Q190 240 160 240 Q130 240 108 212Z" fill="url(#mecha-body-${config.assetKey}-${stage})" />
        <path d="M100 174 L82 206 L110 206 L126 184" fill="${trim}" />
        <path d="M220 174 L238 206 L210 206 L194 184" fill="${trim}" />
        <path d="M130 124 Q144 92 160 92 Q176 92 190 124 V158 Q190 178 174 188 H146 Q130 178 130 158Z" fill="${armor}" />
        <path d="M120 150 Q100 156 98 176 Q122 176 136 164" fill="${mixHex(body, -0.1)}" />
        <path d="M200 150 Q220 156 222 176 Q198 176 184 164" fill="${mixHex(body, -0.1)}" />
        ${buildMechaHead(config.role, { trim })}
        <path d="M132 182 H188" stroke="${hexToRgba('#ffffff', 0.26)}" stroke-width="10" stroke-linecap="round" />
        <rect x="134" y="126" width="52" height="18" rx="9" fill="${visor}" />
        <circle cx="146" cy="135" r="4" fill="${config.accent}" />
        <circle cx="174" cy="135" r="4" fill="${config.accent}" />
        <path d="M146 150 Q160 160 174 150" stroke="${trim}" stroke-width="5" stroke-linecap="round" fill="none" />
        <ellipse cx="134" cy="168" rx="10" ry="6" fill="${hexToRgba('#fb7185', 0.22)}" />
        <ellipse cx="186" cy="168" rx="10" ry="6" fill="${hexToRgba('#fb7185', 0.22)}" />
        <path d="M122 188 L110 228 H136 L144 196" fill="${trim}" />
        <path d="M198 188 L210 228 H184 L176 196" fill="${trim}" />
        <path d="M138 190 H182" stroke="${detail}" stroke-width="12" stroke-linecap="round" />
        <circle cx="160" cy="184" r="18" fill="${detail}" />
        <circle cx="160" cy="184" r="8" fill="${hexToRgba('#ffffff', 0.54)}" />
        <path d="M160 172 V196 M148 184 H172" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="${config.role === 'medic' ? '1' : '0.22'}" />
        <path d="M120 208 Q160 220 200 208" stroke="${hexToRgba('#ffffff', 0.28)}" stroke-width="6" stroke-linecap="round" />
        ${shoulderLights}
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
