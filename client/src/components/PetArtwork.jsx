import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PetIllustration from './PetIllustration';

const EFFECT_PRESETS = {
  claim: {
    accent: '#38bdf8',
    aura: 'rgba(56, 189, 248, 0.26)',
    particles: ['✦', '💫', '✦']
  },
  feed: {
    accent: '#f59e0b',
    aura: 'rgba(245, 158, 11, 0.28)',
    particles: ['❤', '✦', '✦']
  },
  play: {
    accent: '#ec4899',
    aura: 'rgba(236, 72, 153, 0.28)',
    particles: ['♪', '✦', '❤']
  },
  clean: {
    accent: '#14b8a6',
    aura: 'rgba(20, 184, 166, 0.24)',
    particles: ['✦', '✦', '✦']
  },
  hatch: {
    accent: '#f59e0b',
    aura: 'rgba(245, 158, 11, 0.32)',
    particles: ['✦', '🥚', '✦']
  },
  evolve: {
    accent: '#d946ef',
    aura: 'rgba(217, 70, 239, 0.28)',
    particles: ['✦', '⬆', '✦']
  }
};

const EFFECT_PARTICLE_POSITIONS = [
  { className: 'left-[10%] top-[18%]', x: -16, y: -30, size: 18 },
  { className: 'left-1/2 top-[10%] -translate-x-1/2', x: 0, y: -40, size: 20 },
  { className: 'right-[10%] top-[22%]', x: 18, y: -26, size: 18 },
  { className: 'left-[14%] bottom-[22%]', x: -20, y: -20, size: 16 },
  { className: 'right-[14%] bottom-[20%]', x: 22, y: -24, size: 16 }
];

function getEffectMeta(effectKey, accent, visualState) {
  if (!effectKey) return null;

  const preset = EFFECT_PRESETS[effectKey] || EFFECT_PRESETS.feed;
  const particleSet = effectKey === 'hatch' && visualState === 'pet'
    ? ['✦', '✨', '✦']
    : preset.particles;

  return {
    ...preset,
    accent: accent || preset.accent,
    particles: particleSet
  };
}

function getAnimationProfile(effectKey, visualState, reduceMotion = false, phase = 'active') {
  if (!effectKey || reduceMotion) {
    return {
      animate: undefined,
      transition: undefined
    };
  }

  const intensity = phase === 'burst' || phase === 'ascend' ? 1.18 : phase === 'charging' ? 0.88 : 1;
  const eggScale = visualState === 'egg' ? 1.04 : 1;

  switch (effectKey) {
    case 'feed':
      return {
        animate: {
          y: [0, -8 * intensity, -2, -5, 0],
          rotate: [0, -3, 1, 3, 0],
          scale: [1, 1.03 * eggScale, 0.99, 1.02, 1]
        },
        transition: { duration: 1.2, ease: 'easeInOut' }
      };
    case 'play':
      return {
        animate: {
          y: [0, -12 * intensity, 2, -7, 0],
          rotate: [0, -8, 7, -5, 0],
          scale: [1, 1.08, 0.97, 1.04, 1]
        },
        transition: { duration: 1.25, ease: 'easeInOut' }
      };
    case 'clean':
      return {
        animate: {
          y: [0, -4 * intensity, 0],
          rotate: [0, -5, 4, -3, 0],
          scale: [1, 1.02, 1]
        },
        transition: { duration: 1.1, ease: 'easeInOut' }
      };
    case 'claim':
      return {
        animate: {
          y: [10, -6, 0],
          scale: [0.92, 1.06, 1],
          rotate: [0, -4, 0]
        },
        transition: { duration: 1.35, ease: 'easeOut' }
      };
    case 'hatch':
      return visualState === 'egg'
        ? {
            animate: {
              x: [0, -8 * intensity, 8 * intensity, -6, 6, 0],
              y: [0, -8, 0],
              rotate: [0, -6, 6, -4, 4, 0],
              scale: [1, 1.05, 0.98, 1.03, 1]
            },
            transition: { duration: 1.45, ease: 'easeInOut' }
          }
        : {
            animate: {
              y: [10, -14, -4, 0],
              scale: [0.9, 1.08, 1.02, 1],
              rotate: [0, -3, 2, 0]
            },
            transition: { duration: 1.5, ease: 'easeOut' }
          };
    case 'evolve':
      return {
        animate: {
          y: [0, -10 * intensity, -4, 0],
          scale: [1, 1.07, 0.99, 1.11, 1.02, 1],
          rotate: [0, -4, 4, -2, 0]
        },
        transition: { duration: 1.7, ease: 'easeInOut' }
      };
    default:
      return {
        animate: undefined,
        transition: undefined
      };
  }
}

function resolveSeriesRole(pet) {
  const explicitRole = pet?.seriesRole || pet?.role;
  if (explicitRole) return explicitRole;

  const assetKey = String(pet?.assetKey || '');
  const knownRoles = ['excavator', 'bulldozer', 'crane', 'mixer', 'roller', 'radar', 'shield', 'medic', 'assault', 'owl'];
  return knownRoles.find((role) => assetKey.includes(role)) || '';
}

function EngineeringAmbientRig({ role, accent, boosted = false }) {
  const loop = boosted ? 1.5 : 2.8;
  const glow = `${accent}46`;

  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="absolute inset-0 z-[1] h-full w-full overflow-visible"
      initial={{ opacity: 0.35, scale: 0.98 }}
      animate={{ opacity: boosted ? [0.42, 0.92, 0.48] : [0.28, 0.66, 0.32], scale: boosted ? [0.98, 1.04, 1] : [0.98, 1.02, 1] }}
      transition={{ duration: loop, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <motion.ellipse
        cx="50"
        cy="62"
        rx="26"
        ry="18"
        fill="none"
        stroke={`${accent}1f`}
        strokeWidth="2"
        animate={{ rx: boosted ? [24, 30, 26] : [24, 28, 25], opacity: [0.32, 0.68, 0.32] }}
        transition={{ duration: loop, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M20 74 Q50 90 80 74"
        fill="none"
        stroke={`${accent}38`}
        strokeWidth="2.2"
        strokeLinecap="round"
        animate={{ pathLength: [0.3, 1, 0.3], opacity: [0.2, 0.78, 0.22] }}
        transition={{ duration: loop + 0.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="50"
        cy="20"
        r="3.5"
        fill={glow}
        animate={{ scale: [0.85, 1.4, 0.9], opacity: [0.3, 0.9, 0.3] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      />

      {role === 'excavator' && (
        <motion.g
          style={{ originX: '70%', originY: '52%' }}
          animate={{ rotate: boosted ? [-9, 11, -6] : [-5, 7, -4] }}
          transition={{ duration: loop, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M66 54 L78 42 L84 46 L72 58" fill={`${accent}26`} stroke={`${accent}8f`} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M78 42 L90 38 L92 44 L82 48" fill={`${accent}52`} />
          <circle cx="78" cy="42" r="2.3" fill={accent} />
        </motion.g>
      )}

      {role === 'bulldozer' && (
        <>
          {[0, 1, 2, 3].map((index) => (
            <motion.rect
              key={`bulldozer-tread-${index}`}
              x={18 + index * 12}
              y="76"
              width="8"
              height="4"
              rx="2"
              fill={`${accent}5c`}
              animate={{ x: [18 + index * 12, 22 + index * 12, 18 + index * 12], opacity: [0.35, 0.86, 0.35] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear', delay: index * 0.08 }}
            />
          ))}
        </>
      )}

      {role === 'crane' && (
        <motion.g
          style={{ originX: '70%', originY: '30%' }}
          animate={{ rotate: boosted ? [-8, 10, -6] : [-4, 6, -4] }}
          transition={{ duration: loop + 0.3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M58 30 L82 18" fill="none" stroke={`${accent}9a`} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M82 18 L82 42" fill="none" stroke={`${accent}7c`} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M78 42 Q82 48 86 42" fill="none" stroke={`${accent}b4`} strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      )}

      {role === 'mixer' && (
        <motion.g
          style={{ originX: '74%', originY: '58%' }}
          animate={{ rotate: 360 }}
          transition={{ duration: boosted ? 1.4 : 2.8, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="74" cy="58" r="8" fill="none" stroke={`${accent}72`} strokeWidth="2" />
          <path d="M68 58 H80 M74 52 L74 64" stroke={`${accent}b0`} strokeWidth="1.8" strokeLinecap="round" />
        </motion.g>
      )}

      {role === 'roller' && (
        <motion.g
          style={{ originX: '72%', originY: '76%' }}
          animate={{ rotate: 360 }}
          transition={{ duration: boosted ? 1.1 : 2.2, repeat: Infinity, ease: 'linear' }}
        >
          <ellipse cx="72" cy="76" rx="11" ry="7" fill="none" stroke={`${accent}78`} strokeWidth="2" />
          <path d="M61 76 H83" stroke={`${accent}b0`} strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      )}
    </motion.svg>
  );
}

function MechaAmbientRig({ role, accent, boosted = false }) {
  const loop = boosted ? 1.35 : 2.4;

  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="absolute inset-0 z-[1] h-full w-full overflow-visible"
      initial={{ opacity: 0.32, scale: 0.98 }}
      animate={{ opacity: boosted ? [0.4, 0.88, 0.44] : [0.24, 0.64, 0.28], scale: boosted ? [0.98, 1.05, 1] : [0.98, 1.02, 1] }}
      transition={{ duration: loop, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <motion.circle
        cx="50"
        cy="48"
        r="28"
        fill="none"
        stroke={`${accent}1f`}
        strokeWidth="2"
        strokeDasharray="3 5"
        animate={{ rotate: 360 }}
        transition={{ duration: boosted ? 3 : 5.2, repeat: Infinity, ease: 'linear' }}
        style={{ originX: '50%', originY: '48%' }}
      />
      <motion.path
        d="M24 26 Q50 8 76 26"
        fill="none"
        stroke={`${accent}58`}
        strokeWidth="2.2"
        strokeLinecap="round"
        animate={{ pathLength: [0.2, 1, 0.24], opacity: [0.18, 0.82, 0.22] }}
        transition={{ duration: loop + 0.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="50"
        cy="30"
        r="4"
        fill={`${accent}52`}
        animate={{ scale: [0.9, 1.5, 0.95], opacity: [0.26, 0.92, 0.28] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      />

      {role === 'radar' && (
        <motion.path
          d="M64 24 A20 20 0 0 1 88 48"
          fill="none"
          stroke={`${accent}b8`}
          strokeWidth="2.4"
          strokeLinecap="round"
          animate={{ opacity: [0.15, 0.92, 0.18], scale: [0.92, 1.05, 0.94] }}
          transition={{ duration: loop, repeat: Infinity, ease: 'easeOut' }}
          style={{ originX: '76%', originY: '36%' }}
        />
      )}

      {role === 'shield' && (
        <motion.path
          d="M18 56 L28 46 L40 54 L34 72 L20 66 Z"
          fill={`${accent}18`}
          stroke={`${accent}98`}
          strokeWidth="2"
          animate={{ scale: [0.9, 1.08, 0.92], opacity: [0.2, 0.84, 0.22] }}
          transition={{ duration: loop, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '29%', originY: '59%' }}
        />
      )}

      {role === 'medic' && (
        <motion.g
          animate={{ opacity: [0.18, 0.9, 0.22], scale: [0.92, 1.08, 0.94] }}
          transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '78%', originY: '54%' }}
        >
          <circle cx="78" cy="54" r="9" fill={`${accent}18`} stroke={`${accent}90`} strokeWidth="2" />
          <path d="M78 48 V60 M72 54 H84" stroke={`${accent}c4`} strokeWidth="2.4" strokeLinecap="round" />
        </motion.g>
      )}

      {role === 'assault' && (
        <>
          {[0, 1].map((index) => (
            <motion.path
              key={`assault-trail-${index}`}
              d={`M${38 + index * 24} 76 Q${40 + index * 24} 88 ${36 + index * 24} 96`}
              fill="none"
              stroke={`${accent}a8`}
              strokeWidth="2.4"
              strokeLinecap="round"
              animate={{ opacity: [0.18, 0.92, 0.12], y: [0, 4, 8] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeOut', delay: index * 0.12 }}
            />
          ))}
        </>
      )}

      {role === 'owl' && (
        <>
          <motion.path
            d="M26 54 Q18 42 14 30 Q30 36 38 52"
            fill="none"
            stroke={`${accent}92`}
            strokeWidth="2.2"
            strokeLinecap="round"
            animate={{ opacity: [0.2, 0.86, 0.24], rotate: [-3, 4, -2] }}
            transition={{ duration: loop, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '26%', originY: '44%' }}
          />
          <motion.path
            d="M74 54 Q82 42 86 30 Q70 36 62 52"
            fill="none"
            stroke={`${accent}92`}
            strokeWidth="2.2"
            strokeLinecap="round"
            animate={{ opacity: [0.2, 0.86, 0.24], rotate: [3, -4, 2] }}
            transition={{ duration: loop, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '74%', originY: '44%' }}
          />
        </>
      )}
    </motion.svg>
  );
}

function SeriesAmbientRig({ pet, accent, effectKey, effectPhase, idleMotion, reduceMotion = false }) {
  if (reduceMotion || !pet) return null;
  if (idleMotion === 'none' && !effectKey) return null;

  const seriesKey = pet.seriesKey;
  if (seriesKey !== 'engineering' && seriesKey !== 'mecha') return null;

  const role = resolveSeriesRole(pet);
  const boosted = Boolean(effectKey) || effectPhase === 'burst' || effectPhase === 'ascend';

  if (seriesKey === 'engineering') {
    return <EngineeringAmbientRig role={role} accent={accent} boosted={boosted} />;
  }

  return <MechaAmbientRig role={role} accent={accent} boosted={boosted} />;
}

function ArtworkEffectLayer({ effectKey, effectPhase, accent, visualState, reduceMotion = false }) {
  const meta = getEffectMeta(effectKey, accent, visualState);
  if (!meta) return null;

  const pulseScale = effectPhase === 'burst' || effectPhase === 'ascend' ? 1.18 : 1;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-visible" aria-hidden="true">
      <motion.div
        initial={{ opacity: 0.18, scale: 0.82 }}
        animate={reduceMotion ? { opacity: 0.34, scale: 1 } : { opacity: [0.14, 0.36, 0.18], scale: [0.82, 1.08 * pulseScale, 0.92] }}
        transition={{ duration: 1.8, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
        className="absolute inset-[14%] rounded-full blur-3xl"
        style={{ background: meta.aura }}
      />
      <motion.div
        initial={{ opacity: 0.12, scale: 0.74 }}
        animate={reduceMotion ? { opacity: 0.2, scale: 1 } : { opacity: [0.08, 0.28, 0.12], scale: [0.72, 1.16 * pulseScale, 0.86] }}
        transition={{ duration: 1.4, repeat: reduceMotion ? 0 : Infinity, ease: 'easeOut' }}
        className="absolute inset-[10%] rounded-full border"
        style={{ borderColor: `${meta.accent}52` }}
      />
      <motion.div
        initial={{ opacity: 0.08, scale: 0.7 }}
        animate={reduceMotion ? { opacity: 0.12, scale: 1 } : { opacity: [0.04, 0.16, 0.06], scale: [0.68, 1.28 * pulseScale, 0.8] }}
        transition={{ duration: 1.7, repeat: reduceMotion ? 0 : Infinity, ease: 'easeOut', delay: 0.12 }}
        className="absolute inset-[2%] rounded-full border"
        style={{ borderColor: `${meta.accent}2e` }}
      />

      {EFFECT_PARTICLE_POSITIONS.map((position, index) => {
        const particle = meta.particles[index % meta.particles.length];
        return (
          <motion.span
            key={`${effectKey}-${position.className}-${index}`}
            initial={{ opacity: 0, scale: 0.6, x: 0, y: 8 }}
            animate={reduceMotion
              ? { opacity: 0.72, scale: 1, x: 0, y: 0 }
              : {
                  opacity: [0, 0.9, 0],
                  scale: [0.7, 1.08, 0.82],
                  x: [0, position.x],
                  y: [8, position.y]
                }}
            transition={{
              duration: 1.2 + index * 0.08,
              repeat: reduceMotion ? 0 : Infinity,
              repeatDelay: 0.12,
              delay: index * 0.1,
              ease: 'easeOut'
            }}
            className={`absolute ${position.className}`.trim()}
            style={{
              color: meta.accent,
              fontSize: `${position.size}px`,
              textShadow: `0 8px 18px ${meta.aura}`
            }}
          >
            {particle}
          </motion.span>
        );
      })}
    </div>
  );
}

function EggArtwork({
  accent = '#F59E0B',
  canHatch = false,
  evolved = false,
  className = '',
  imageClassName = '',
  effectKey = null,
  effectPhase = 'active',
  reduceMotion = false
}) {
  const animation = getAnimationProfile(effectKey, 'egg', reduceMotion, effectPhase);

  return (
    <div className={className}>
      <div className={`relative flex h-full w-full items-center justify-center ${imageClassName}`.trim()}>
        <ArtworkEffectLayer
          effectKey={effectKey}
          effectPhase={effectPhase}
          accent={accent}
          visualState="egg"
          reduceMotion={reduceMotion}
        />

        <motion.div
          className="relative z-10 h-full w-full"
          animate={animation.animate}
          transition={animation.transition}
        >
          <div
            className="absolute inset-[10%] rounded-full blur-2xl"
            style={{ background: `${accent}30` }}
            aria-hidden="true"
          />

          <div
            className="pet-egg-shell relative h-full w-full overflow-hidden rounded-[42%_42%_36%_36%/52%_52%_30%_30%]"
            style={{
              background: `radial-gradient(circle at 30% 16%, rgba(255,255,255,0.98), ${accent}12 42%, ${accent}62 100%)`,
              boxShadow: `0 18px 46px ${accent}28, inset 0 -16px 20px rgba(255,255,255,0.18), inset 0 2px 0 rgba(255,255,255,0.82)`
            }}
          >
            <div className="absolute inset-x-[18%] top-[11%] h-[20%] rounded-full bg-white/75 blur-md" />
            <div className="absolute left-[18%] top-[23%] h-[10%] w-[10%] rounded-full bg-white/78" />
            <div className="absolute right-[22%] top-[30%] h-[8%] w-[8%] rounded-full bg-white/68" />
            <div className="absolute left-[33%] top-[48%] h-[8%] w-[8%] rounded-full bg-white/60" />
            <div className="absolute bottom-[11%] left-1/2 h-[10%] w-[46%] -translate-x-1/2 rounded-full bg-white/20 blur-md" />

            <div className="absolute left-[14%] top-[16%] h-[4%] w-[4%] rounded-full bg-white/90" />
            <div className="absolute right-[14%] top-[18%] h-[3%] w-[3%] rounded-full bg-white/80" />
            <div className="absolute right-[18%] top-[52%] h-[3%] w-[3%] rounded-full bg-white/70" />

            {canHatch && (
              <>
                <div className="absolute left-[41%] top-[18%] h-[36%] w-[2px] rotate-[16deg] bg-white/90" />
                <div className="absolute left-[47%] top-[28%] h-[28%] w-[2px] -rotate-[12deg] bg-white/90" />
                <div className="absolute left-[55%] top-[22%] h-[32%] w-[2px] rotate-[18deg] bg-white/82" />
                <div className="absolute inset-x-[21%] bottom-[14%] h-[8%] rounded-full bg-white/24 blur-sm" />
              </>
            )}

            {evolved && (
              <div className="absolute inset-[8%] rounded-[36%] border-2" style={{ borderColor: `${accent}58` }} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PetArtwork({
  pet,
  journey,
  className = '',
  imageClassName = '',
  fallbackClassName = '',
  previewLevel = null,
  previewSlotState = null,
  previewVisualState = null,
  effectKey = null,
  effectPhase = 'active',
  priority = false,
  loadingStrategy = 'lazy',
  idleMotion = 'none'
}) {
  const reduceMotion = useReducedMotion();
  const accent = journey?.accent || pet?.accent || '#F59E0B';
  const visualState = previewVisualState || journey?.visual_state || 'pet';
  const slotState = previewSlotState || journey?.slot_state || 'hatched';
  const stageLevel = previewLevel ?? journey?.stage_level ?? 1;
  const shouldRenderEgg = !pet || visualState === 'egg';
  const animation = getAnimationProfile(effectKey, visualState, reduceMotion, effectPhase);

  if (shouldRenderEgg) {
    return (
      <EggArtwork
        accent={accent}
        canHatch={Boolean(journey?.can_hatch)}
        evolved={slotState === 'evolved'}
        className={className}
        imageClassName={imageClassName}
        effectKey={effectKey}
        effectPhase={effectPhase}
        reduceMotion={reduceMotion}
      />
    );
  }

  return (
    <div className={className}>
      <div className="relative flex h-full w-full items-center justify-center">
        <ArtworkEffectLayer
          effectKey={effectKey}
          effectPhase={effectPhase}
          accent={accent}
          visualState={visualState}
          reduceMotion={reduceMotion}
        />
        <SeriesAmbientRig
          pet={pet}
          accent={accent}
          effectKey={effectKey}
          effectPhase={effectPhase}
          idleMotion={idleMotion}
          reduceMotion={reduceMotion}
        />

        <motion.div
          className="relative z-10 flex h-full w-full items-center justify-center"
          animate={animation.animate}
          transition={animation.transition}
        >
          <PetIllustration
            pet={pet}
            className="flex h-full w-full items-center justify-center"
            imageClassName={imageClassName}
            stageLevel={stageLevel}
            slotState={slotState}
            visualState={visualState}
            fallbackClassName={fallbackClassName}
            priority={priority}
            loadingStrategy={loadingStrategy}
            idleMotion={idleMotion}
          />
        </motion.div>
      </div>
    </div>
  );
}

function arePetArtworkPropsEqual(prevProps, nextProps) {
  return (
    prevProps.pet?.id === nextProps.pet?.id
    && prevProps.pet?.assetKey === nextProps.pet?.assetKey
    && prevProps.pet?.accent === nextProps.pet?.accent
    && prevProps.journey?.accent === nextProps.journey?.accent
    && prevProps.journey?.can_hatch === nextProps.journey?.can_hatch
    && prevProps.journey?.visual_state === nextProps.journey?.visual_state
    && prevProps.journey?.slot_state === nextProps.journey?.slot_state
    && prevProps.journey?.stage_level === nextProps.journey?.stage_level
    && prevProps.className === nextProps.className
    && prevProps.imageClassName === nextProps.imageClassName
    && prevProps.fallbackClassName === nextProps.fallbackClassName
    && prevProps.previewLevel === nextProps.previewLevel
    && prevProps.previewSlotState === nextProps.previewSlotState
    && prevProps.previewVisualState === nextProps.previewVisualState
    && prevProps.effectKey === nextProps.effectKey
    && prevProps.effectPhase === nextProps.effectPhase
    && prevProps.priority === nextProps.priority
    && prevProps.loadingStrategy === nextProps.loadingStrategy
    && prevProps.idleMotion === nextProps.idleMotion
  );
}

export default memo(PetArtwork, arePetArtworkPropsEqual);
