const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database/data.json');
const CLASS_PET_MAX_LEVEL = 10;
const CLASS_PET_CARE_GROWTH_WEIGHTS = {
  feed: 16,
  play: 14,
  clean: 12
};
const CLASS_PET_GROWTH_STAGES = [
  { minGrowth: 0, maxGrowth: 80, level: 1 },
  { minGrowth: 80, maxGrowth: 160, level: 2 },
  { minGrowth: 160, maxGrowth: 250, level: 3 },
  { minGrowth: 250, maxGrowth: 340, level: 4 },
  { minGrowth: 340, maxGrowth: 440, level: 5 },
  { minGrowth: 440, maxGrowth: 550, level: 6 },
  { minGrowth: 550, maxGrowth: 670, level: 7 },
  { minGrowth: 670, maxGrowth: 800, level: 8 },
  { minGrowth: 800, maxGrowth: 930, level: 9 },
  { minGrowth: 930, maxGrowth: Infinity, level: 10 }
];

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
const nowIso = () => new Date().toISOString();

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();
const normalizeStageSeedTimestamp = (value) => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);
const toStageLevel = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};
const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const normalizeScore = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
};

const inferClaimedAt = (record = {}, fallback = '') => (
  record.pet_claimed_at
  || record.pet_last_care_at
  || record.created_at
  || fallback
  || nowIso()
);

const calculateCareGrowthValue = (record = {}) => (
  Math.max(0, Math.floor(toNumber(record.pet_feed_count, 0))) * CLASS_PET_CARE_GROWTH_WEIGHTS.feed
  + Math.max(0, Math.floor(toNumber(record.pet_play_count, 0))) * CLASS_PET_CARE_GROWTH_WEIGHTS.play
  + Math.max(0, Math.floor(toNumber(record.pet_clean_count, 0))) * CLASS_PET_CARE_GROWTH_WEIGHTS.clean
  + Math.max(0, Math.round(toNumber(record.pet_bonus_growth, 0)))
);

const deriveGrowthStageLevel = (growthValue) => {
  const stage = CLASS_PET_GROWTH_STAGES.find(
    (entry) => growthValue >= entry.minGrowth && growthValue < entry.maxGrowth
  ) || CLASS_PET_GROWTH_STAGES[CLASS_PET_GROWTH_STAGES.length - 1];
  return stage.level;
};

const buildScoreGrowthMap = (db) => {
  const logs = Array.isArray(db.scoreLogs) ? db.scoreLogs : [];
  const map = new Map();

  for (const log of logs) {
    if (String(log?.type || '') !== 'student') continue;
    const studentId = Number(log?.student_id || 0);
    if (!studentId) continue;

    const createdAt = new Date(log?.created_at || '').getTime();
    if (!Number.isFinite(createdAt)) continue;

    if (!map.has(studentId)) {
      map.set(studentId, []);
    }
    map.get(studentId).push({
      createdAt,
      delta: normalizeScore(log?.delta || 0)
    });
  }

  for (const entries of map.values()) {
    entries.sort((a, b) => a.createdAt - b.createdAt);
  }

  return map;
};

const getScoreGrowthSinceClaim = (scoreGrowthMap, studentId, claimedAt, fallbackScore) => {
  const claimedTime = new Date(claimedAt || '').getTime();
  if (!Number.isFinite(claimedTime)) {
    return Math.max(0, normalizeScore(fallbackScore));
  }

  const entries = scoreGrowthMap.get(Number(studentId || 0)) || [];
  let sum = 0;
  for (const entry of entries) {
    if (entry.createdAt >= claimedTime) {
      sum += entry.delta;
    }
  }
  return Math.max(0, normalizeScore(sum));
};

const seedStageTimestamp = (record = {}, fallback = '') => {
  const nextValue = normalizeStageSeedTimestamp(record.pet_stage_seeded_at)
    || normalizeStageSeedTimestamp(fallback)
    || nowIso();
  if (record.pet_stage_seeded_at === nextValue) {
    return false;
  }
  record.pet_stage_seeded_at = nextValue;
  return true;
};

const repairPetRecord = (record = {}, options = {}) => {
  const {
    fallbackClaimedAt = '',
    studentId = 0,
    fallbackScore = 0,
    scoreGrowthMap = new Map()
  } = options;

  const previousStageLevel = toStageLevel(record.pet_stage_level);
  const status = normalizeStatus(record.pet_status);
  let changed = false;

  if (!record.pet_hatched_at && (status === 'hatched' || status === 'evolved' || previousStageLevel > 0)) {
    record.pet_hatched_at = inferClaimedAt(record, fallbackClaimedAt);
    changed = true;
  }

  if (!record.pet_evolved_at && (status === 'evolved' || previousStageLevel >= CLASS_PET_MAX_LEVEL)) {
    record.pet_evolved_at = record.pet_last_care_at || record.pet_hatched_at || inferClaimedAt(record, fallbackClaimedAt);
    changed = true;
  }

  if (record.pet_evolved_at) {
    if (toStageLevel(record.pet_stage_level) !== CLASS_PET_MAX_LEVEL) {
      record.pet_stage_level = CLASS_PET_MAX_LEVEL;
      changed = true;
    }
    if (seedStageTimestamp(record, record.pet_evolved_at || record.pet_hatched_at || fallbackClaimedAt)) {
      changed = true;
    }
    return changed;
  }

  if (record.pet_hatched_at) {
    const scoreGrowth = getScoreGrowthSinceClaim(
      scoreGrowthMap,
      studentId,
      record.pet_claimed_at || fallbackClaimedAt || record.pet_hatched_at,
      fallbackScore
    );
    const careGrowth = calculateCareGrowthValue(record);
    const growthValue = Math.max(0, scoreGrowth + careGrowth);
    const derivedLevel = Math.max(1, Math.min(CLASS_PET_MAX_LEVEL - 1, deriveGrowthStageLevel(growthValue)));
    const seededAt = normalizeStageSeedTimestamp(record.pet_stage_seeded_at);
    const currentLevel = toStageLevel(record.pet_stage_level);
    if (!seededAt) {
      const seededLevel = Math.max(1, Math.max(currentLevel, derivedLevel));
      if (seededLevel !== currentLevel) {
        record.pet_stage_level = seededLevel;
        changed = true;
      }
      if (seedStageTimestamp(record, record.pet_hatched_at || record.pet_claimed_at || fallbackClaimedAt)) {
        changed = true;
      }
    } else if (currentLevel < 1) {
      record.pet_stage_level = 1;
      changed = true;
    }
  } else if (toStageLevel(record.pet_stage_level) !== 0) {
    record.pet_stage_level = 0;
    changed = true;
  }

  return changed;
};

const mergeStudentIntoActiveSlot = (student = {}, slot = {}) => {
  if (!student || !slot) return false;
  if (Number(student.pet_id || 0) !== Number(slot.pet_id || 0)) {
    return false;
  }

  let changed = false;
  if (!slot.pet_claimed_at && student.pet_claimed_at) {
    slot.pet_claimed_at = student.pet_claimed_at;
    changed = true;
  }
  if (!slot.pet_hatched_at && student.pet_hatched_at) {
    slot.pet_hatched_at = student.pet_hatched_at;
    changed = true;
  }
  if (!slot.pet_evolved_at && student.pet_evolved_at) {
    slot.pet_evolved_at = student.pet_evolved_at;
    changed = true;
  }
  if (toStageLevel(student.pet_stage_level) > toStageLevel(slot.pet_stage_level)) {
    slot.pet_stage_level = toStageLevel(student.pet_stage_level);
    changed = true;
  }
  if (!slot.pet_stage_seeded_at && student.pet_stage_seeded_at) {
    slot.pet_stage_seeded_at = normalizeStageSeedTimestamp(student.pet_stage_seeded_at);
    changed = true;
  }
  return changed;
};

const main = () => {
  const db = readJson(dbPath);
  const scoreGrowthMap = buildScoreGrowthMap(db);
  let studentFieldFixes = 0;
  let slotFixes = 0;

  for (const student of db.students || []) {
    const fallbackClaimedAt = inferClaimedAt(student);
    if (repairPetRecord(student, {
      fallbackClaimedAt,
      studentId: student.id,
      fallbackScore: student.score,
      scoreGrowthMap
    })) {
      studentFieldFixes += 1;
    }

    if (Array.isArray(student.pet_collection)) {
      for (const slot of student.pet_collection) {
        if (slot.slot_id === student.active_pet_slot_id) {
          mergeStudentIntoActiveSlot(student, slot);
        }
        if (repairPetRecord(slot, {
          fallbackClaimedAt,
          studentId: student.id,
          fallbackScore: student.score,
          scoreGrowthMap
        })) {
          slotFixes += 1;
        }
      }
    }
  }

  const backupPath = `${dbPath}.legacy-pet-progress-backup-${Date.now()}`;
  fs.copyFileSync(dbPath, backupPath);
  writeJson(dbPath, db);

  console.log(JSON.stringify({
    ok: true,
    backup: backupPath,
    student_field_fixes: studentFieldFixes,
    slot_fixes: slotFixes
  }, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = {
  repairPetRecord,
  buildScoreGrowthMap,
  getScoreGrowthSinceClaim,
  calculateCareGrowthValue,
  deriveGrowthStageLevel,
  mergeStudentIntoActiveSlot,
  main
};
