const LEGACY_ID_TO_ARTWORK_KEY = {
  1: 'giraffe',
  2: 'beagle',
  3: 'penguin-buddy',
  4: 'panda-guardian',
  5: 'lion',
  6: 'dachshund',
  7: 'white-cat',
  8: 'gray-cat',
  9: 'goldfish',
  10: 'tiger-cub',
  11: 'koi',
  12: 'penguin-royal',
  13: 'panda-baby',
  14: 'tiger-guardian'
};

const normalizeLegacyArtworkKey = (petId) => {
  const numericId = Number(petId);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;

  const normalizedId =
    ((Math.floor(numericId) - 1) % Object.keys(LEGACY_ID_TO_ARTWORK_KEY).length) + 1;

  return LEGACY_ID_TO_ARTWORK_KEY[normalizedId] || null;
};

export function resolvePetArtworkKey(petOrId) {
  if (!petOrId) return null;

  if (typeof petOrId === 'string') {
    return petOrId;
  }

  if (typeof petOrId === 'object') {
    if (petOrId.artwork_key) return petOrId.artwork_key;
    return normalizeLegacyArtworkKey(petOrId.id);
  }

  return normalizeLegacyArtworkKey(petOrId);
}

// Backward-compatible export name. New rendering is SVG-driven rather than image URL-driven.
export function getPetArtwork(petOrId) {
  return resolvePetArtworkKey(petOrId);
}
