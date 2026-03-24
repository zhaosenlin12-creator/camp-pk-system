import { resolvePetArtworkKey } from './petArtworks';

const PREVIEW_STAGES = [
  { level: 1, title: '初生', chip: 'Lv.1' },
  { level: 2, title: '活力', chip: 'Lv.2' },
  { level: 3, title: '闪亮', chip: 'Lv.3' },
  { level: 4, title: '冠军', chip: 'Lv.4' },
  { level: 5, title: '完全体', chip: 'Lv.5' }
];

const LEGACY_VISUAL_META = {
  giraffe: {
    shortName: '长颈观察员',
    badge: '观察系',
    vibe: '喜欢把课堂细节都记在心里。'
  },
  beagle: {
    shortName: '乐跑小猎犬',
    badge: '活力系',
    vibe: '总能把课堂气氛带得更热。'
  },
  'penguin-buddy': {
    shortName: '破冰小企鹅',
    badge: '社交系',
    vibe: '最适合带动表达和展示。'
  },
  'panda-guardian': {
    shortName: '代码熊猫',
    badge: '守护系',
    vibe: '稳稳当当地陪着学生把项目做完。'
  },
  lion: {
    shortName: '狮王队长',
    badge: '队长系',
    vibe: '天生有舞台感，适合冲榜时刻。'
  },
  dachshund: {
    shortName: '冲刺短腿犬',
    badge: '耐力系',
    vibe: '步子不大，但总在稳定进步。'
  },
  'white-cat': {
    shortName: '云团白猫',
    badge: '专注系',
    vibe: '安静的时候最有陪伴感。'
  },
  'gray-cat': {
    shortName: '灰塔猫',
    badge: '灵感系',
    vibe: '好奇心很强，常常最先发现新玩法。'
  },
  goldfish: {
    shortName: '算法金鱼',
    badge: '灵动系',
    vibe: '思路轻巧，灵感来得很快。'
  },
  'tiger-cub': {
    shortName: '冲榜虎崽',
    badge: '竞技系',
    vibe: '越到冲刺阶段越有压迫感。'
  },
  koi: {
    shortName: '彩虹锦鲤',
    badge: '高光系',
    vibe: '一到高光时刻就会很耀眼。'
  },
  'penguin-royal': {
    shortName: '北极企鹅王',
    badge: '明星系',
    vibe: '节奏很稳，存在感也很强。'
  },
  'panda-baby': {
    shortName: '团子小熊猫',
    badge: '治愈系',
    vibe: '软萌耐心，很受低龄学生欢迎。'
  },
  'tiger-guardian': {
    shortName: '荣耀猛虎',
    badge: '冠军系',
    vibe: '成长拉满后会变成班级的气场核心。'
  }
};

const RARITY_BADGES = {
  common: '课堂伙伴',
  rare: '闪亮拍档',
  epic: '明星守护',
  legendary: '神话主角'
};

const POWER_BADGES = [
  { min: 500, label: '传奇守护' },
  { min: 380, label: '星耀战宠' },
  { min: 260, label: '高能拍档' },
  { min: 160, label: '成长新星' },
  { min: 0, label: '萌新伙伴' }
];

const GROWTH_STAGE_MARKERS = [1, 3, 5, 7, 8];

function normalizeAssetUrl(url) {
  if (typeof url !== 'string') return null;
  if (!url.trim()) return null;
  return url.replace(/^http:\/\//i, 'https://');
}

function getLegacyVisualMeta(petOrId) {
  const artworkKey = resolvePetArtworkKey(petOrId);
  if (!artworkKey) return null;

  return {
    artworkKey,
    accent: '#F59E0B',
    theme: '#FFF7ED',
    emoji: '🐾',
    ...(LEGACY_VISUAL_META[artworkKey] || LEGACY_VISUAL_META['gray-cat'])
  };
}

export function getPetEvolutionStages(petOrId) {
  if (!petOrId || typeof petOrId !== 'object') return [];

  const stages = Array.isArray(petOrId.evolutionStages) ? petOrId.evolutionStages : [];
  const normalizedStages = stages.map(normalizeAssetUrl).filter(Boolean);

  if (normalizedStages.length > 0) {
    return normalizedStages;
  }

  const fallbackImage = normalizeAssetUrl(petOrId.image);
  return fallbackImage ? [fallbackImage] : [];
}

export function getPetStageArtwork(
  pet,
  {
    stageLevel = 1,
    slotState = 'hatched',
    visualState = 'pet'
  } = {}
) {
  if (!pet || visualState === 'egg') return null;

  const stages = getPetEvolutionStages(pet);
  if (!stages.length) return null;

  const isEvolved = slotState === 'evolved' || stageLevel >= 6;
  const clampedLevel = Math.max(1, Math.min(5, Number(stageLevel) || 1));
  const desiredMarker = isEvolved ? 9 : GROWTH_STAGE_MARKERS[clampedLevel - 1];
  const scaledIndex = Math.round((desiredMarker / 9) * (stages.length - 1));
  const index = Math.max(0, Math.min(stages.length - 1, scaledIndex));

  return {
    src: stages[index],
    index,
    total: stages.length,
    alt: `${pet.name || '宠物伙伴'}形象`
  };
}

export function getPetVisualMeta(petOrId) {
  if (!petOrId) return null;

  if (typeof petOrId === 'object') {
    return {
      shortName: petOrId.name || '宠物伙伴',
      badge: petOrId.badge || RARITY_BADGES[petOrId.rarity] || '课堂伙伴',
      vibe:
        petOrId.vibe ||
        petOrId.quote ||
        '会陪着学生一起把课堂能量养成看得见的样子。',
      accent: petOrId.accent || '#F59E0B',
      theme: petOrId.theme || '#FFF7ED',
      emoji: petOrId.emoji || '🐾'
    };
  }

  return getLegacyVisualMeta(petOrId);
}

export function getPetPreviewStages(petOrId) {
  const meta = getPetVisualMeta(petOrId);
  if (!meta) return [];

  return PREVIEW_STAGES.map((item) => ({
    ...item,
    name: item.level === 5 ? `${meta.shortName} 完全体` : `${meta.shortName} ${item.title}`
  }));
}

export function getPetPowerBadge(powerScore) {
  return POWER_BADGES.find((item) => powerScore >= item.min)?.label || POWER_BADGES[POWER_BADGES.length - 1].label;
}
