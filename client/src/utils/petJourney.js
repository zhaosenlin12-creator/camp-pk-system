import { getPetPowerBadge } from './petVisuals';

const EMPTY_JOURNEY = {
  slot_state: 'empty',
  visual_state: 'egg',
  claimed: false,
  status_label: '等待领取',
  name: '宠物蛋',
  subtitle: '还没有领取宠物伙伴',
  selected_species: null,
  stage_name: '待领取',
  stage_level: 0,
  stage_description: '先去宠物中心选择一只班级宠物。',
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
  care_tip: '宠物领取后才会进入成长路线。',
  next_target: '领取一只宠物，开始班级养成',
  feed_count: 0,
  play_count: 0,
  clean_count: 0,
  score_balance: 0,
  score_debt: 0,
  is_dormant: false,
  is_fragile: false,
  is_warning: false,
  condition_label: '等待领取',
  condition_tip: '',
  revive_hint: '',
  action_costs: {
    feed: 4,
    play: 3,
    clean: 2,
    hatch: 0,
    evolve: 0
  },
  min_care_cost: 2,
  score_needed_for_next_care: 2,
  decay_hours: 0,
  accent: '#F59E0B',
  theme: '#FFF7ED'
};

export function calculatePetPower(journey) {
  const stageBonus = journey.slot_state === 'evolved' ? 140 : journey.visual_state === 'pet' ? 60 : 10;
  const growthWeight = (journey.growth_value || 0) * 0.72;
  const careWeight = (journey.care_score || 0) * 2.1;
  const readinessWeight = (journey.satiety || 0) * 0.35 + (journey.mood || 0) * 0.35 + (journey.cleanliness || 0) * 0.3;
  const actionBonus = (journey.total_care_actions || 0) * 6;
  const debtPenalty = (journey.score_debt || 0) * 8;
  const vitalityPenalty = journey.is_dormant ? 140 : journey.is_fragile ? 40 : 0;

  return Math.max(0, Math.round(stageBonus + growthWeight + careWeight + readinessWeight + actionBonus - debtPenalty - vitalityPenalty));
}

export function getPetPowerTone(powerScore) {
  if (powerScore >= 500) {
    return {
      bg: 'bg-fuchsia-100',
      text: 'text-fuchsia-700',
      ring: '#d946ef'
    };
  }

  if (powerScore >= 380) {
    return {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      ring: '#f59e0b'
    };
  }

  if (powerScore >= 260) {
    return {
      bg: 'bg-sky-100',
      text: 'text-sky-700',
      ring: '#0ea5e9'
    };
  }

  return {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    ring: '#10b981'
  };
}

function decorateJourney(rawJourney = {}) {
  const merged = {
    ...EMPTY_JOURNEY,
    ...(rawJourney || {})
  };

  const powerScore = calculatePetPower(merged);

  return {
    ...merged,
    power_score: powerScore,
    power_label: getPetPowerBadge(powerScore)
  };
}

export function getStudentPetJourney(student) {
  return decorateJourney(student?.pet_journey);
}

export function getStudentPetCollection(student) {
  if (Array.isArray(student?.pet_collection) && student.pet_collection.length > 0) {
    return student.pet_collection.map((slot, index) => ({
      ...slot,
      slot_index: slot?.slot_index || index + 1,
      is_active: Boolean(slot?.is_active || slot?.slot_id === student?.active_pet_slot_id),
      pet: slot?.pet || (slot?.pet_id === student?.pet_id ? student?.pet : null),
      journey: decorateJourney(slot?.journey)
    }));
  }

  if (student?.pet_id || student?.pet) {
    return [
      {
        slot_id: student?.active_pet_slot_id || 'legacy-primary-slot',
        slot_index: 1,
        is_active: true,
        pet_id: student?.pet_id || student?.pet?.id || null,
        pet_claimed_at: student?.pet_claimed_at || null,
        pet: student?.pet || null,
        journey: getStudentPetJourney(student)
      }
    ];
  }

  return [];
}

export function getStudentPetCapacity(student) {
  const explicitCapacity = Number(student?.pet_capacity);
  if (Number.isFinite(explicitCapacity) && explicitCapacity > 0) {
    return explicitCapacity;
  }

  const evolvedCount = getStudentPetCollection(student).filter((slot) => slot.journey.slot_state === 'evolved').length;
  return Math.max(1, Math.min(3, 1 + evolvedCount));
}

export function canStudentClaimMorePets(student) {
  if (typeof student?.can_claim_more_pets === 'boolean') {
    return student.can_claim_more_pets;
  }

  return getStudentPetCollection(student).length < getStudentPetCapacity(student);
}

export function getNextPetSlotHint(student) {
  if (student?.next_pet_slot_hint) {
    return student.next_pet_slot_hint;
  }

  if (!getStudentPetCollection(student).length) {
    return '先领取第一只宠物，开启成长线。';
  }

  if (canStudentClaimMorePets(student)) {
    return '当前已经解锁新的宠物位，可以继续领取孩子喜欢的宠物。';
  }

  return '先把已有宠物培养到进化，再解锁新的宠物位。';
}

export function getStudentPetUnlockStatus(student) {
  const collection = getStudentPetCollection(student);
  const capacity = getStudentPetCapacity(student);
  const evolvedCount = collection.filter((slot) => slot.journey.slot_state === 'evolved').length;
  const maxCapacity = 3;

  if (!collection.length) {
    return {
      unlockedAll: false,
      progress: 0,
      nextSlotNumber: 1,
      requirementCurrent: 0,
      requirementTotal: 1,
      chip: '待开启',
      title: '先领取第一只宠物',
      detail: '第一只宠物领取后，学生才会正式进入宠物成长线。'
    };
  }

  if (capacity >= maxCapacity && collection.length >= capacity) {
    return {
      unlockedAll: true,
      progress: 100,
      nextSlotNumber: null,
      requirementCurrent: evolvedCount,
      requirementTotal: maxCapacity - 1,
      chip: '已满级',
      title: '全部宠物位已解锁',
      detail: '现在可以在已收藏宠物之间自由切换培养，不需要再解锁新的位置。'
    };
  }

  if (collection.length < capacity) {
    return {
      unlockedAll: false,
      progress: 100,
      nextSlotNumber: collection.length + 1,
      requirementCurrent: evolvedCount,
      requirementTotal: Math.max(1, capacity - 1),
      chip: '可领取',
      title: `第 ${collection.length + 1} 宠物位已解锁`,
      detail: '现在就可以继续领取下一只喜欢的宠物，它会直接进入收藏架。'
    };
  }

  const nextSlotNumber = Math.min(maxCapacity, capacity + 1);
  const requirementTotal = Math.max(1, nextSlotNumber - 1);
  const progress = Math.max(0, Math.min(100, Math.round((evolvedCount / requirementTotal) * 100)));

  return {
    unlockedAll: false,
    progress,
    nextSlotNumber,
    requirementCurrent: evolvedCount,
    requirementTotal,
    chip: '进化解锁',
    title: `解锁第 ${nextSlotNumber} 宠物位`,
    detail: `当前已有 ${evolvedCount} 只宠物完成进化；累计 ${requirementTotal} 只宠物进化后，就会解锁新的长期培养位。`
  };
}

export function getPetCareItems(journey) {
  return [
    { key: 'satiety', label: '饱腹', value: journey.satiety || 0, color: '#F59E0B' },
    { key: 'mood', label: '心情', value: journey.mood || 0, color: '#EC4899' },
    { key: 'cleanliness', label: '清洁', value: journey.cleanliness || 0, color: '#14B8A6' }
  ];
}

export function getPetActionLabel(journey, action) {
  if (journey.visual_state === 'egg') {
    const eggLabels = {
      feed: '温养',
      play: '陪伴',
      clean: '护理',
      hatch: '孵化',
      evolve: '进化'
    };
    return eggLabels[action] || action;
  }

  const labels = {
    feed: '喂养',
    play: '互动',
    clean: '清洁',
    hatch: '孵化',
    evolve: '进化'
  };
  return labels[action] || action;
}

export function getPetActionCost(journey, action) {
  return Number(journey?.action_costs?.[action] || 0);
}

export function getPetStatusTone(journey) {
  if (journey.is_dormant) {
    return {
      bg: 'bg-slate-200',
      text: 'text-slate-700'
    };
  }

  if (journey.score_debt > 0 || journey.is_fragile) {
    return {
      bg: 'bg-rose-100',
      text: 'text-rose-700'
    };
  }

  if (journey.can_evolve) {
    return {
      bg: 'bg-fuchsia-100',
      text: 'text-fuchsia-700'
    };
  }

  if (journey.can_hatch) {
    return {
      bg: 'bg-amber-100',
      text: 'text-amber-700'
    };
  }

  if (!journey.claimed) {
    return {
      bg: 'bg-slate-100',
      text: 'text-slate-600'
    };
  }

  return {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700'
  };
}

export function getClassPetSummary(students) {
  const activeJourneys = students.map((student) => getStudentPetJourney(student));
  const collections = students.flatMap((student) => getStudentPetCollection(student));
  const total = students.length;
  const claimed = students.filter((student) => getStudentPetCollection(student).length > 0).length;
  const hatched = collections.filter((slot) => slot.journey.visual_state === 'pet').length;
  const eggs = collections.filter((slot) => slot.journey.visual_state === 'egg').length + (total - claimed);
  const readyToHatch = collections.filter((slot) => slot.journey.can_hatch).length;
  const readyToEvolve = collections.filter((slot) => slot.journey.can_evolve).length;
  const evolved = collections.filter((slot) => slot.journey.slot_state === 'evolved').length;

  return {
    total,
    claimed,
    activePets: activeJourneys.filter((journey) => journey.claimed).length,
    collectedPets: collections.length,
    hatched,
    eggs,
    readyToHatch,
    readyToEvolve,
    evolved,
    progress: total ? Math.round((claimed / total) * 100) : 0
  };
}
