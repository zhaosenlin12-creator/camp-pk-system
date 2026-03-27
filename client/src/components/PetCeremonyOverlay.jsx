import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import PetArtwork from './PetArtwork';
import { getPetPowerTone } from '../utils/petJourney';
import { soundManager } from '../utils/sounds';

const CEREMONY_COPY = {
  claim: {
    kicker: '新宠物报到',
    title: '专属宠物加入收藏架',
    description: '这是孩子把“我喜欢它”正式变成“它现在归我培养”的时刻，后续的课堂积分、照料行为和成长仪式都会围绕这只新伙伴展开。',
    glow: 'rgba(125, 211, 252, 0.68)',
    panel:
      'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,249,255,0.98) 46%, rgba(255,245,250,0.98) 100%)',
    accentClass: 'from-cyan-100 via-sky-50 to-rose-50',
    railClass: 'from-cyan-400 via-sky-400 to-pink-400'
  },
  hatch: {
    kicker: '孵化成功',
    title: '宠物正式诞生',
    description: '课堂积分和照料行为，第一次被学生真正感知成了可看见、可期待、可炫耀的奖励时刻。',
    glow: 'rgba(255, 203, 112, 0.72)',
    panel:
      'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,247,235,0.98) 52%, rgba(240,249,255,0.98) 100%)',
    accentClass: 'from-amber-100 via-orange-50 to-sky-50',
    railClass: 'from-amber-400 via-orange-400 to-pink-400'
  },
  evolve: {
    kicker: '进化完成',
    title: '宠物进入全新形态',
    description: '这不是单次点击，而是课堂表现、照料耐心和稳定成长一起累积出来的高光奖励。',
    glow: 'rgba(244, 143, 212, 0.6)',
    panel:
      'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,244,250,0.98) 50%, rgba(241,248,255,0.98) 100%)',
    accentClass: 'from-fuchsia-100 via-pink-50 to-cyan-50',
    railClass: 'from-fuchsia-400 via-pink-400 to-cyan-400'
  }
};

const CEREMONY_RARITY_META = {
  common: {
    label: '常见伙伴',
    stars: 1,
    badgeClass: 'bg-emerald-100 text-emerald-700',
    aura: 'rgba(52,211,153,0.18)',
    surface: 'rgba(236,253,245,0.94)',
    panel: 'linear-gradient(135deg, rgba(236,253,245,0.98) 0%, rgba(255,255,255,0.96) 100%)'
  },
  rare: {
    label: '稀有伙伴',
    stars: 2,
    badgeClass: 'bg-sky-100 text-sky-700',
    aura: 'rgba(56,189,248,0.2)',
    surface: 'rgba(224,242,254,0.96)',
    panel: 'linear-gradient(135deg, rgba(224,242,254,0.98) 0%, rgba(255,255,255,0.96) 100%)'
  },
  epic: {
    label: '史诗伙伴',
    stars: 3,
    badgeClass: 'bg-fuchsia-100 text-fuchsia-700',
    aura: 'rgba(217,70,239,0.22)',
    surface: 'rgba(250,232,255,0.96)',
    panel: 'linear-gradient(135deg, rgba(250,232,255,0.98) 0%, rgba(255,255,255,0.96) 100%)'
  },
  legendary: {
    label: '传说伙伴',
    stars: 4,
    badgeClass: 'bg-amber-100 text-amber-700',
    aura: 'rgba(245,158,11,0.24)',
    surface: 'rgba(254,249,195,0.96)',
    panel: 'linear-gradient(135deg, rgba(255,247,212,0.99) 0%, rgba(255,255,255,0.97) 100%)'
  }
};

function getCeremonyRarityMeta(pet) {
  return CEREMONY_RARITY_META[pet?.rarity] || CEREMONY_RARITY_META.common;
}

function launchCeremonyConfetti(action) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const colors =
    action === 'evolve'
      ? ['#f59e0b', '#ec4899', '#a855f7', '#22c55e', '#38bdf8']
      : action === 'claim'
        ? ['#38bdf8', '#22d3ee', '#fb7185', '#facc15', '#a78bfa']
        : ['#f59e0b', '#fb7185', '#60a5fa', '#34d399', '#facc15'];

  window.setTimeout(() => {
    confetti({
      particleCount: action === 'evolve' ? 72 : action === 'claim' ? 64 : 56,
      spread: action === 'evolve' ? 78 : action === 'claim' ? 72 : 64,
      startVelocity: 30,
      scalar: 0.92,
      ticks: 180,
      gravity: 0.9,
      origin: { x: 0.5, y: 0.42 },
      colors
    });
  }, 260);

  window.setTimeout(() => {
    confetti({
      particleCount: action === 'evolve' ? 44 : action === 'claim' ? 38 : 34,
      angle: 120,
      spread: 58,
      startVelocity: 26,
      scalar: 0.86,
      origin: { x: 0.14, y: 0.62 },
      colors
    });
    confetti({
      particleCount: action === 'evolve' ? 44 : 34,
      angle: 60,
      spread: 58,
      startVelocity: 26,
      scalar: 0.86,
      origin: { x: 0.86, y: 0.62 },
      colors
    });
  }, 720);

  if (action === 'evolve' || action === 'claim') {
    window.setTimeout(() => {
      confetti({
        particleCount: action === 'evolve' ? 28 : 24,
        spread: action === 'evolve' ? 46 : 54,
        startVelocity: 20,
        scalar: 0.8,
        origin: { x: 0.5, y: 0.3 },
        colors
      });
    }, 1260);
  }
}

function formatDelta(currentValue, previousValue) {
  const diff = Number(currentValue || 0) - Number(previousValue || 0);
  if (diff <= 0) return '保持';
  return `+${diff}`;
}

function FloatingSpark({ className, delay = 0, duration = 2.8 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.68, y: 18 }}
      animate={{ opacity: [0.18, 0.9, 0.32], scale: [0.7, 1.06, 0.9], y: [12, -8, -18] }}
      transition={{ delay, duration, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      className={`absolute rounded-full bg-white/80 blur-[2px] ${className}`.trim()}
    />
  );
}

function FloatingRibbon({ className, delay = 0, duration = 4.2, color = 'rgba(255,255,255,0.44)' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: [0.08, 0.26, 0.08], y: [20, -8, 16], rotate: [0, 10, -6, 0] }}
      transition={{ delay, duration, repeat: Infinity, ease: 'easeInOut' }}
      className={`absolute rounded-full blur-3xl ${className}`.trim()}
      style={{ background: color }}
    />
  );
}

function OrbitHalo({ className, delay = 0, duration = 8.8, borderColor = 'rgba(255,255,255,0.28)' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82 }}
      animate={{ opacity: [0.08, 0.32, 0.12], scale: [0.92, 1.04, 0.98], rotate: [0, 180, 360] }}
      transition={{ delay, duration, repeat: Infinity, ease: 'linear' }}
      className={`absolute rounded-full border ${className}`.trim()}
      style={{ borderColor }}
    />
  );
}

function MilestoneCard({ label, value, delta, accent, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-[24px] border border-white/65 bg-white/84 px-4 py-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
        <span className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[10px] font-black text-slate-500">{delta}</span>
      </div>
      <div className="mt-3 text-3xl font-black" style={{ color: accent }}>
        {value}
      </div>
    </motion.div>
  );
}

function CeremonyStepTrack({ steps, accent = '#38bdf8' }) {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => (
        <motion.div
          key={step.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 + index * 0.08 }}
          className="rounded-[26px] border border-white/70 bg-white/84 px-4 py-4 shadow-sm"
          style={{ boxShadow: `0 18px 36px ${accent}12` }}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white shadow-sm"
              style={{ backgroundColor: accent }}
            >
              {index + 1}
            </span>
            <span
              className="rounded-full px-3 py-1 text-[10px] font-black shadow-sm"
              style={{ backgroundColor: `${accent}16`, color: accent }}
            >
              {step.badge}
            </span>
          </div>
          <div className="mt-3 text-base font-black text-slate-800">{step.title}</div>
          <div className="mt-2 text-sm leading-6 text-slate-500">{step.description}</div>
        </motion.div>
      ))}
    </div>
  );
}

function CeremonyStageCard({
  title,
  subtitle,
  pet,
  journey,
  previewLevel,
  previewSlotState,
  previewVisualState,
  chipClassName,
  chipLabel,
  accent = '#38bdf8',
  rarityMeta = CEREMONY_RARITY_META.common,
  variant = 'after',
  delay = 0,
  effectKey = null,
  effectPhase = 'active'
}) {
  const isAfter = variant === 'after';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-[32px] border p-5 ${
        isAfter
          ? 'border-white/80 bg-white/90 shadow-[0_24px_56px_rgba(15,23,42,0.12)]'
          : 'border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.08)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-800">{title}</div>
          <div className="mt-2 text-xs leading-6 text-slate-500">{subtitle}</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black ${chipClassName}`}>{chipLabel}</span>
      </div>

      <div
        className="mt-5 rounded-[30px] border border-white/75 p-4 shadow-inner"
        style={{
          background: isAfter
            ? `linear-gradient(180deg, rgba(255,255,255,0.94) 0%, ${rarityMeta.surface} 100%)`
            : 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(244,248,255,0.92) 100%)'
        }}
      >
        <div
          className="relative overflow-hidden rounded-[28px] border border-white/80 px-4 py-5"
          style={{
            background: isAfter
              ? `radial-gradient(circle at top, rgba(255,255,255,0.99) 0%, ${rarityMeta.surface} 34%, rgba(228,238,252,0.94) 100%)`
              : 'radial-gradient(circle at top, rgba(255,255,255,0.98) 0%, rgba(245,249,255,0.96) 34%, rgba(228,238,252,0.92) 100%)'
          }}
        >
          <div
            className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black text-slate-500 shadow-sm"
            aria-hidden="true"
          >
            {isAfter ? '闪耀舞台' : '成长舞台'}
          </div>
          <div
            className={`pointer-events-none absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-black shadow-sm ${rarityMeta.badgeClass}`}
            aria-hidden="true"
          >
            {rarityMeta.label}
          </div>
          <div
            className="pointer-events-none absolute inset-x-10 top-4 h-16 rounded-full blur-3xl"
            style={{ backgroundColor: isAfter ? rarityMeta.aura : `${accent}14` }}
            aria-hidden="true"
          />
          <motion.div
            animate={{ opacity: isAfter ? [0.28, 0.5, 0.32] : [0.2, 0.42, 0.24], scale: [0.94, 1.08, 0.98] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay }}
            className="pointer-events-none absolute inset-x-10 bottom-10 h-28 rounded-full blur-3xl"
            style={{ backgroundColor: isAfter ? rarityMeta.aura : `${accent}28` }}
            aria-hidden="true"
          />
          <OrbitHalo
            className="left-1/2 top-[48%] h-[168px] w-[168px] -translate-x-1/2 -translate-y-1/2"
            delay={delay}
            duration={9.4}
            borderColor={isAfter ? accent : `${accent}52`}
          />
          <OrbitHalo
            className="left-1/2 top-[48%] h-[204px] w-[204px] -translate-x-1/2 -translate-y-1/2"
            delay={delay + 0.12}
            duration={11.6}
            borderColor={isAfter ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.48)'}
          />
          <div
            className="pointer-events-none absolute left-1/2 top-6 h-20 w-28 -translate-x-1/2 rounded-full bg-white/88 blur-3xl"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute left-1/2 top-14 -translate-x-1/2 text-xs font-black tracking-[0.28em] text-amber-400" aria-hidden="true">
            {'★'.repeat(rarityMeta.stars)}
          </div>
          <div
            className={`pet-hero-frame relative z-10 mx-auto flex h-[212px] w-full max-w-[228px] items-center justify-center rounded-[30px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.96)_100%)] ${
              isAfter ? 'border-white/90 shadow-[0_28px_56px_rgba(148,163,184,0.28)]' : 'border-white/85 shadow-[0_22px_42px_rgba(148,163,184,0.22)]'
            }`}
          >
            <PetArtwork
              pet={pet}
              journey={journey}
              previewLevel={previewLevel}
              previewSlotState={previewSlotState}
              previewVisualState={previewVisualState}
              className={`flex items-center justify-center ${isAfter ? 'h-[178px] w-[178px]' : 'h-[170px] w-[170px]'}`}
              imageClassName={`${isAfter ? 'h-[156px] w-[156px]' : 'h-[150px] w-[150px]'} object-contain drop-shadow-[0_18px_30px_rgba(15,23,42,0.18)]`}
              fallbackClassName="text-6xl"
              effectKey={effectKey}
              effectPhase={effectPhase}
            />
          </div>
          <div
            className="relative z-10 mx-auto mt-4 h-4 w-40 rounded-full"
            style={{ background: `linear-gradient(90deg, ${isAfter ? rarityMeta.aura : `${accent}18`} 0%, ${accent}72 50%, ${isAfter ? rarityMeta.aura : `${accent}18`} 100%)` }}
            aria-hidden="true"
          />
          <div
            className="relative z-10 mx-auto mt-1 h-6 w-28 rounded-full blur-2xl"
            style={{ backgroundColor: isAfter ? rarityMeta.aura : `${accent}24` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-white/75 bg-white/88 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">成长备注</div>
        </div>
        <div className="mt-2 text-sm font-semibold leading-6 text-slate-700">{journey.stage_name || '成长形态'}</div>
      </div>
    </motion.div>
  );
}

function getCeremonyMetricCards(ceremony, previousJourney, nextJourney) {
  if (ceremony.action === 'claim') {
    return [
      {
        label: '收藏位',
        value: `#${ceremony.slotIndex || nextJourney.slot_index || 1}`,
        delta: '新获得'
      },
      {
        label: '已收藏',
        value: ceremony.collectionCount || 1,
        delta: '+1'
      },
      {
        label: '当前积分',
        value: ceremony.studentScore || 0,
        delta: '已就绪'
      },
      {
        label: '孵化进度',
        value: `${nextJourney.progress || 0}%`,
        delta: nextJourney.can_hatch ? '可孵化' : '待孵化'
      }
    ];
  }

  return [
    {
      label: '成长值',
      value: nextJourney.growth_value || 0,
      delta: formatDelta(nextJourney.growth_value, previousJourney.growth_value)
    },
    {
      label: '照料次数',
      value: nextJourney.total_care_actions || 0,
      delta: formatDelta(nextJourney.total_care_actions, previousJourney.total_care_actions)
    },
    {
      label: '照料评分',
      value: nextJourney.care_score || 0,
      delta: formatDelta(nextJourney.care_score, previousJourney.care_score)
    },
    {
      label: '培养力',
      value: nextJourney.power_score || 0,
      delta: formatDelta(nextJourney.power_score, previousJourney.power_score)
    }
  ];
}

function getCeremonyTransitionCopy(ceremony, previousJourney, stageName) {
  if (ceremony.action === 'claim') {
    return {
      beforeTitle: '领取前',
      beforeSubtitle: '这个收藏位还在等待一只真正属于学生的课堂伙伴，仪式前更多是“想拥有”的期待感。',
      beforeChipLabel: '等待报到',
      afterTitle: '领取后',
      afterSubtitle: `${stageName} 已经进入收藏架，接下来会以宠物蛋的形式陪孩子一起开启成长线。`,
      afterChipLabel: '正式加入',
      railIcon: '✦'
    };
  }

  if (ceremony.action === 'hatch') {
    return {
      beforeTitle: '孵化前',
      beforeSubtitle: '还是一枚等待课堂能量点亮的宠物蛋，仪式前更多是期待感。',
      beforeChipLabel: '等待点亮',
      afterTitle: '正式出生',
      afterSubtitle: `${stageName} 已经解锁，接下来进入正式培养阶段。`,
      afterChipLabel: '奖励落地',
      railIcon: '→'
    };
  }

  return {
    beforeTitle: '进化前',
    beforeSubtitle: `${previousJourney.stage_name || '当前形态'} 已经完成前一阶段成长，现在准备进入更高级的陪伴形态。`,
    beforeChipLabel: '成长完成',
    afterTitle: '完成进化',
    afterSubtitle: `${stageName} 已经解锁，现在拥有更强的展示感和更完整的成长价值。`,
    afterChipLabel: '形态跃迁',
    railIcon: '→'
  };
}

function getCeremonyMemoryCopy(action) {
  if (action === 'claim') {
    return '这是学生第一次明确地说出“这只宠物是我的了”，收藏欲、拥有感和后续培养期待会在这里被点亮。';
  }

  if (action === 'hatch') {
    return '这是学生第一次把课堂积分真正兑换成“我的宠物出生了”的成就感。';
  }

  return '这是学生能明显感觉到“我的宠物真的升级了”的那种主角时刻。';
}

function getCeremonySteps(action) {
  if (action === 'claim') {
    return [
      {
        title: '选定伙伴',
        badge: '选择完成',
        description: '先确认学生真正喜欢的伙伴，让后续成长线从拥有感开始。'
      },
      {
        title: '收藏位点亮',
        badge: '正式报到',
        description: '这只宠物会进入收藏架，后续所有课堂积分和照料都会围绕它展开。'
      },
      {
        title: '进入孵化准备',
        badge: '期待升温',
        description: '先以宠物蛋形态陪伴，再用课堂努力把它正式孵化出来。'
      }
    ];
  }

  if (action === 'hatch') {
    return [
      {
        title: '课堂能量汇聚',
        badge: '成长达标',
        description: '积分和照料次数已经满足，孵化不再是等待，而是公开兑现。'
      },
      {
        title: '蛋壳震动点亮',
        badge: '破壳瞬间',
        description: '会先看到明显的蓄能和破壳动作，让学生感知到“它真的要出生了”。'
      },
      {
        title: '新伙伴正式出生',
        badge: '奖励落地',
        description: '出生后的主宠会直接进入正式培养阶段，课堂反馈会更真实。'
      }
    ];
  }

  return [
    {
      title: '成长值满载',
      badge: '条件满足',
      description: '课堂表现、照料质量和稳定成长已经累积到进化阈值。'
    },
    {
      title: '能量重构升阶',
      badge: '形态跃迁',
      description: '主宠会先进入充能与重构，让进化更像一次真实升阶而不是普通切图。'
    },
    {
      title: '守护形态公开亮相',
      badge: '高光公开',
      description: '进化完成后会成为更适合展示和奖励的高阶主角形态。'
    }
  ];
}

export default function PetCeremonyOverlay({ ceremony, onClose, onContinue }) {
  useEffect(() => {
    if (!ceremony) return undefined;

    if (ceremony.action === 'claim') {
      soundManager.playPetClaim();
    } else if (ceremony.action === 'hatch') {
      soundManager.playPetHatch();
    } else {
      soundManager.playPetEvolve();
    }

    launchCeremonyConfetti(ceremony.action);

    const autoCloseId = window.setTimeout(() => {
      onClose();
    }, ceremony.action === 'evolve' ? 7000 : ceremony.action === 'claim' ? 6000 : 6400);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(autoCloseId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [ceremony, onClose]);

  if (!ceremony) return null;

  const copy = CEREMONY_COPY[ceremony.action] || CEREMONY_COPY.hatch;
  const previousJourney = ceremony.previousJourney || ceremony.journey || {};
  const nextJourney = ceremony.journey || {};
  const beforeVisualState = ceremony.action === 'claim' || ceremony.action === 'hatch'
    ? 'egg'
    : previousJourney.visual_state || 'pet';
  const beforeSlotState = ceremony.action === 'claim'
    ? 'empty'
    : ceremony.action === 'hatch'
      ? 'egg'
      : previousJourney.slot_state || 'hatched';
  const beforeLevel = ceremony.action === 'claim' || ceremony.action === 'hatch'
    ? 0
    : Math.max(1, previousJourney.stage_level || 1);
  const afterVisualState = nextJourney.visual_state || 'pet';
  const afterSlotState = nextJourney.slot_state || 'hatched';
  const afterLevel = Math.max(1, nextJourney.stage_level || 1);
  const milestoneAccent = nextJourney.accent || ceremony.pet?.accent || '#F59E0B';
  const rarityMeta = getCeremonyRarityMeta(ceremony.pet);
  const beforeRarityMeta = ceremony.action === 'claim' ? CEREMONY_RARITY_META.common : rarityMeta;
  const companionName = ceremony.pet?.name || nextJourney.name || '课堂伙伴';
  const stageName = nextJourney.stage_name
    || (ceremony.action === 'claim' ? '专属宠物蛋' : ceremony.action === 'hatch' ? '初生形态' : '进化形态');
  const metricCards = getCeremonyMetricCards(ceremony, previousJourney, nextJourney);
  const transitionCopy = getCeremonyTransitionCopy(ceremony, previousJourney, stageName);
  const ceremonySteps = getCeremonySteps(ceremony.action);
  const beforePet = ceremony.action === 'claim' ? ceremony.previousPet || null : ceremony.pet;
  const heroIcon = ceremony.action === 'evolve' ? '✨' : ceremony.action === 'claim' ? '🎀' : '🥚';
  const showTargetPreview = ceremony.action === 'claim' && ceremony.pet;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[11000] flex items-center justify-center overflow-hidden bg-slate-950/82 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <motion.div
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.48 }}
            className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ backgroundColor: copy.glow }}
          />
          <OrbitHalo
            className="left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2"
            delay={0.05}
            duration={12}
            borderColor="rgba(255,255,255,0.22)"
          />
          <OrbitHalo
            className="left-1/2 top-1/2 h-[31rem] w-[31rem] -translate-x-1/2 -translate-y-1/2"
            delay={0.16}
            duration={15}
            borderColor={`${milestoneAccent}30`}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.12, 0.28, 0.14] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-1/2 top-1/2 h-[20rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${copy.glow} 50%, rgba(255,255,255,0) 100%)` }}
          />
          <FloatingRibbon className="left-[10%] top-[12%] h-56 w-24" delay={0.15} color="rgba(255,255,255,0.18)" />
          <FloatingRibbon className="right-[10%] top-[16%] h-48 w-20" delay={0.35} color="rgba(255,255,255,0.16)" />
          <FloatingRibbon className="left-[18%] bottom-[8%] h-44 w-20" delay={0.45} color={`${milestoneAccent}20`} />
          <FloatingRibbon className="right-[17%] bottom-[10%] h-52 w-24" delay={0.2} color={`${milestoneAccent}16`} />
          <FloatingSpark className="left-[12%] top-[14%] h-4 w-4" delay={0.1} duration={3.1} />
          <FloatingSpark className="right-[14%] top-[20%] h-3.5 w-3.5" delay={0.28} duration={2.8} />
          <FloatingSpark className="left-[18%] bottom-[18%] h-5 w-5" delay={0.4} duration={3.4} />
          <FloatingSpark className="right-[22%] bottom-[14%] h-4 w-4" delay={0.5} duration={2.9} />
          <FloatingSpark className="left-[48%] top-[12%] h-3 w-3" delay={0.24} duration={2.5} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 24 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          data-testid="pet-ceremony-overlay"
          className="relative w-full max-w-6xl overflow-hidden rounded-[44px] border border-white/35 px-6 py-6 shadow-[0_30px_100px_rgba(0,0,0,0.38)] md:px-8 md:py-8"
          style={{ background: copy.panel }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className={`absolute inset-x-0 top-0 h-52 bg-gradient-to-b ${copy.accentClass} opacity-75`} />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-sm">
                  <span>{heroIcon}</span>
                  {copy.kicker}
                </div>
                <h3 className="mt-5 text-4xl font-black tracking-tight text-slate-800 md:text-[2.8rem]">{copy.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 md:text-[15px]">
                  <span className="font-black text-slate-800">{ceremony.studentName}</span>
                  {' '}
                  {ceremony.action === 'claim'
                    ? '已经选定了自己的新伙伴。'
                    : '的课堂努力，已经被正式兑换成宠物成长节点。'}
                  {copy.description}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                    积分 {ceremony.studentScore || 0}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black shadow-sm ${getPetPowerTone(nextJourney.power_score || 0).bg} ${getPetPowerTone(nextJourney.power_score || 0).text}`}>
                    培养力 {nextJourney.power_score || 0}
                  </span>
                  {ceremony.pet?.seriesLabel && (
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                      {ceremony.pet.seriesLabel}
                    </span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black shadow-sm ${rarityMeta.badgeClass}`}>
                    {rarityMeta.label}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-500 shadow-sm">
                    {'★'.repeat(rarityMeta.stars)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                    收藏数 {ceremony.collectionCount || 1}
                  </span>
                </div>
              </div>

              <div
                className="rounded-[28px] border border-white/70 px-4 py-4 text-right shadow-sm"
                style={{
                  background: rarityMeta.panel,
                  boxShadow: `0 18px 36px ${rarityMeta.aura}`
                }}
              >
                <div className="text-[11px] font-black tracking-[0.24em] text-slate-400">本次解锁</div>
                <div className="mt-2 text-xl font-black text-slate-800">{stageName}</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">{companionName}</div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black shadow-sm ${rarityMeta.badgeClass}`}>
                    {rarityMeta.label}
                  </span>
                  <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-black text-amber-500 shadow-sm">
                    {'★'.repeat(rarityMeta.stars)}
                  </span>
                </div>
                <div className="mt-3 inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black text-white">
                  {ceremony.action === 'evolve'
                    ? '全班高光时刻'
                    : ceremony.action === 'claim'
                      ? '新伙伴到场'
                      : '课堂奖励兑现'}
                </div>
              </div>
            </div>

            <CeremonyStepTrack steps={ceremonySteps} accent={milestoneAccent} />

            <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_112px_minmax(0,1fr)]">
              <CeremonyStageCard
                title={transitionCopy.beforeTitle}
                subtitle={transitionCopy.beforeSubtitle}
                pet={beforePet}
                journey={previousJourney}
                previewLevel={beforeLevel}
                previewSlotState={beforeSlotState}
                previewVisualState={beforeVisualState}
                chipClassName="bg-slate-100 text-slate-600"
                chipLabel={transitionCopy.beforeChipLabel}
                accent={milestoneAccent}
                rarityMeta={beforeRarityMeta}
                variant="before"
                delay={0.08}
                effectKey={ceremony.action}
                effectPhase={ceremony.action === 'claim' ? 'active' : 'charging'}
              />

              <div className="hidden items-center justify-center lg:flex">
                <motion.div
                  initial={{ opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.18 }}
                  className="flex h-full w-full flex-col items-center justify-center"
                >
                  <div className={`h-1.5 w-24 rounded-full bg-gradient-to-r ${copy.railClass}`} />
                  <motion.div
                    animate={{ x: [0, 10, 0], opacity: [0.55, 1, 0.55] }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                    className="my-5 flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-[0_18px_36px_rgba(15,23,42,0.1)]"
                  >
                    {transitionCopy.railIcon}
                  </motion.div>
                  <div className={`h-1.5 w-24 rounded-full bg-gradient-to-r ${copy.railClass}`} />
                </motion.div>
              </div>

              <CeremonyStageCard
                title={transitionCopy.afterTitle}
                subtitle={transitionCopy.afterSubtitle}
                pet={ceremony.pet}
                journey={nextJourney}
                previewLevel={afterLevel}
                previewSlotState={afterSlotState}
                previewVisualState={afterVisualState}
                chipClassName={ceremony.action === 'claim' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}
                chipLabel={transitionCopy.afterChipLabel}
                accent={milestoneAccent}
                rarityMeta={rarityMeta}
                variant="after"
                delay={0.16}
                effectKey={ceremony.action}
                effectPhase={ceremony.action === 'evolve' ? 'ascend' : 'burst'}
              />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {metricCards.map((item, index) => (
                <MilestoneCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  delta={item.delta}
                  accent={milestoneAccent}
                  delay={0.22 + index * 0.06}
                />
              ))}
            </div>

            {showTargetPreview && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 rounded-[32px] border border-white/70 bg-white/84 px-5 py-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">后续形态预览</div>
                    <div className="mt-2 text-lg font-black text-slate-800">孵化后的目标形象</div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      领取阶段先把宠物加入收藏架，但学生现在就能提前看到自己之后会养成的主角伙伴。
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-4 rounded-[28px] px-4 py-4 shadow-inner"
                    style={{ background: rarityMeta.panel }}
                  >
                    <div className="pet-hero-frame flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/92">
                      <PetArtwork
                        pet={ceremony.pet}
                        journey={nextJourney}
                        previewLevel={1}
                        previewSlotState="hatched"
                        previewVisualState="pet"
                        className="flex h-14 w-14 items-center justify-center"
                        imageClassName="h-12 w-12 object-contain"
                        fallbackClassName="text-3xl"
                        effectKey="claim"
                        effectPhase="burst"
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-slate-800">{ceremony.pet.name}</div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black shadow-sm ${rarityMeta.badgeClass}`}>
                          {rarityMeta.label}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        孵化后会从这里正式开始成长
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36 }}
              className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]"
            >
              <div className="rounded-[32px] border border-white/70 bg-white/84 px-5 py-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">课堂奖励说明</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
                    {nextJourney.next_target}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{nextJourney.care_tip}</p>
              </div>

              <div className="rounded-[32px] border border-white/70 bg-white/88 px-5 py-5 text-slate-700 shadow-[0_18px_40px_rgba(59,130,246,0.12)]">
                <div className="text-[11px] font-black tracking-[0.24em] text-slate-500">班级时刻</div>
                <div className="mt-3 text-lg font-black">{ceremony.studentName}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{getCeremonyMemoryCopy(ceremony.action)}</p>
                <button
                  type="button"
                  onClick={onContinue || onClose}
                  data-testid="ceremony-continue"
                  className="mt-5 w-full rounded-full bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  继续查看成长档案
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.46 }}
              className="mt-5 text-center text-xs font-black uppercase tracking-[0.22em] text-slate-400"
            >
              点击空白处即可关闭
            </motion.div>
          </div>

          <button
            type="button"
            onClick={onClose}
            data-testid="ceremony-close"
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-xl text-slate-500 shadow-sm transition hover:text-slate-700"
            aria-label="关闭仪式弹窗"
          >
            ×
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
