function formatSignedValue(value) {
  const numericValue = Number(value || 0);
  if (!numericValue) return '0';
  return numericValue > 0 ? `+${numericValue}` : String(numericValue);
}

export function getLotteryEffectChips(item, { targetType = 'student' } = {}) {
  if (!item || typeof item !== 'object') return [];

  const chips = [];
  const scoreDelta = Number(item.score_delta || 0);
  const petGrowthDelta = Number(item.pet_growth_delta || 0);
  const petSatietyDelta = Number(item.pet_satiety_delta || 0);
  const petMoodDelta = Number(item.pet_mood_delta || 0);
  const petCleanlinessDelta = Number(item.pet_cleanliness_delta || 0);

  if (scoreDelta) {
    chips.push(`${targetType === 'team' ? '战队积分' : '学员积分'} ${formatSignedValue(scoreDelta)}`);
  }
  if (petGrowthDelta) chips.push(`宠物成长 ${formatSignedValue(petGrowthDelta)}`);
  if (petSatietyDelta) chips.push(`饱腹 ${formatSignedValue(petSatietyDelta)}`);
  if (petMoodDelta) chips.push(`心情 ${formatSignedValue(petMoodDelta)}`);
  if (petCleanlinessDelta) chips.push(`清洁 ${formatSignedValue(petCleanlinessDelta)}`);

  return chips;
}

export function getLotteryEffectSummary(item, options = {}) {
  return getLotteryEffectChips(item, options).join(' · ');
}
