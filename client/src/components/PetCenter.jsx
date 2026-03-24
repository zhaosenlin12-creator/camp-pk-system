import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import PetArtwork from './PetArtwork';
import PetCeremonyOverlay from './PetCeremonyOverlay';
import PetProfileModal from './PetProfileModal';
import {
  canStudentClaimMorePets,
  getClassPetSummary,
  getNextPetSlotHint,
  getPetActionCost,
  getPetActionLabel,
  getPetCareItems,
  getPetPowerTone,
  getPetStatusTone,
  getStudentPetCapacity,
  getStudentPetCollection,
  getStudentPetUnlockStatus,
  getStudentPetJourney
} from '../utils/petJourney';
import { soundManager } from '../utils/sounds';

const RARITY_META = {
  common: {
    label: '常见',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    cardClass: 'from-emerald-50 via-white to-lime-50',
    buttonClass: 'btn-secondary'
  },
  rare: {
    label: '稀有',
    badgeClass: 'bg-sky-100 text-sky-700',
    cardClass: 'from-sky-50 via-white to-cyan-50',
    buttonClass: 'btn-orange'
  },
  epic: {
    label: '史诗',
    badgeClass: 'bg-fuchsia-100 text-fuchsia-700',
    cardClass: 'from-fuchsia-50 via-white to-pink-50',
    buttonClass: 'btn-purple'
  },
  legendary: {
    label: '传说',
    badgeClass: 'bg-amber-100 text-amber-700',
    cardClass: 'from-amber-50 via-white to-yellow-50',
    buttonClass: 'btn-warning'
  }
};

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'common', label: '常见' },
  { key: 'rare', label: '稀有' },
  { key: 'epic', label: '史诗' },
  { key: 'legendary', label: '传说' }
];

const CATALOG_SORTS = [
  { key: 'rarity', label: '按稀有度' },
  { key: 'popular', label: '按领取人数' },
  { key: 'name', label: '按名称' }
];

const ROSTER_FILTERS = [
  { key: 'all', label: '全部学员' },
  { key: 'attention', label: '待处理' },
  { key: 'egg', label: '蛋态培养' },
  { key: 'pet', label: '已孵化' }
];

const ACTION_META = {
  feed: {
    icon: '🍼',
    description: '让宠物吃得饱饱的，状态更安心',
    accent: '#f59e0b',
    theme: '#FFF7ED',
    badgeClass: 'bg-amber-100 text-amber-700',
    badge: '饱腹提升',
    eggSuccessTitle: '温养完成',
    petSuccessTitle: '喂养完成',
    flavor: '小肚子暖起来了，宠物会更有安全感。',
    primaryMetric: 'satiety',
    secondaryMetric: 'mood'
  },
  play: {
    icon: '🎈',
    description: '陪它玩一会儿，心情会明显变好',
    accent: '#ec4899',
    theme: '#FDF2F8',
    badgeClass: 'bg-pink-100 text-pink-700',
    badge: '心情拉满',
    eggSuccessTitle: '陪伴完成',
    petSuccessTitle: '互动完成',
    flavor: '它现在更开心了，也更愿意陪着孩子一起上课。',
    primaryMetric: 'mood',
    secondaryMetric: 'cleanliness'
  },
  clean: {
    icon: '🫧',
    description: '整理清洁状态，让照料感更完整',
    accent: '#14b8a6',
    theme: '#ECFEFF',
    badgeClass: 'bg-teal-100 text-teal-700',
    badge: '焕新护理',
    eggSuccessTitle: '护理完成',
    petSuccessTitle: '清洁完成',
    flavor: '状态变得干净清爽，照料评分也会更稳定。',
    primaryMetric: 'cleanliness',
    secondaryMetric: 'mood'
  },
  hatch: {
    icon: '🥚',
    description: '达成条件后举行孵化仪式',
    accent: '#f59e0b',
    theme: '#FFF7ED',
    badgeClass: 'bg-amber-100 text-amber-700',
    badge: '公开仪式'
  },
  evolve: {
    icon: '✨',
    description: '晋升为更高阶的守护形态',
    accent: '#d946ef',
    theme: '#FDF4FF',
    badgeClass: 'bg-fuchsia-100 text-fuchsia-700',
    badge: '高光时刻'
  }
};

const JOURNEY_METRIC_LABELS = {
  satiety: '饱腹',
  mood: '心情',
  cleanliness: '清洁',
  care_score: '照料分',
  power_score: '培养力',
  progress: '进度'
};

function getJourneyMetricDelta(previousJourney, nextJourney, key) {
  const previousValue = Number(previousJourney?.[key] || 0);
  const nextValue = Number(nextJourney?.[key] || 0);
  const delta = nextValue - previousValue;

  if (!delta) return null;

  return {
    key,
    label: JOURNEY_METRIC_LABELS[key] || key,
    value: nextValue,
    delta
  };
}

function playPetActionSound(action) {
  if (action === 'feed') {
    soundManager.playPetFeed();
    return;
  }

  if (action === 'play') {
    soundManager.playPetPlay();
    return;
  }

  if (action === 'clean') {
    soundManager.playPetClean();
  }
}

function buildPetActionFeedback({ action, previousJourney, nextJourney, studentName, pet }) {
  const meta = ACTION_META[action];
  if (!meta || action === 'hatch' || action === 'evolve') return null;

  const metricKeys = [meta.primaryMetric, meta.secondaryMetric, 'care_score', 'power_score', 'progress'];
  const metrics = metricKeys
    .map((key) => getJourneyMetricDelta(previousJourney, nextJourney, key))
    .filter(Boolean)
    .slice(0, 4);
  const scoreSpent = Math.max(0, Number(previousJourney?.score_balance || 0) - Number(nextJourney?.score_balance || 0));
  const revived = Boolean(previousJourney?.is_dormant && !nextJourney?.is_dormant);
  const stillDormant = Boolean(nextJourney?.is_dormant);

  return {
    action,
    icon: meta.icon,
    accent: meta.accent,
    theme: meta.theme,
    badgeClass: meta.badgeClass,
    badge: meta.badge,
    title: revived ? '成功唤醒' : (nextJourney.visual_state === 'egg' ? meta.eggSuccessTitle : meta.petSuccessTitle),
    flavor: revived
      ? '小家伙重新睁开眼睛了，继续照料几次就能把状态稳住。'
      : (stillDormant
        ? '状态开始回暖了，但还没有完全恢复，再照料一次会更稳。'
        : meta.flavor),
    metrics,
    scoreSpent,
    scoreBalance: Number(nextJourney?.score_balance || 0),
    revived,
    stillDormant,
    studentName,
    petName: nextJourney.name || pet?.name || '课堂伙伴',
    stageName: nextJourney.stage_name,
    note: nextJourney.care_tip || nextJourney.next_target,
    journey: nextJourney,
    pet
  };
}

const CLASSROOM_PLAYBOOK = [
  {
    title: '完成编程任务后',
    description: '直接给学生加分，宠物会同步积累成长值，课堂成就感会非常直观。'
  },
  {
    title: '学生主动讲解或结对协作',
    description: '安排一次互动操作，心情值会更高，宠物更像班级伙伴而不是装饰。'
  },
  {
    title: '整理桌面、键盘和器材',
    description: '执行一次清洁，能把线下小班教学里最重要的秩序感也纳入养成。'
  },
  {
    title: '周挑战或展示日',
    description: '把符合条件的学生统一孵化或进化，形成公开仪式感，班级氛围会明显更强。'
  }
];

const RARITY_ORDER = {
  legendary: 0,
  epic: 1,
  rare: 2,
  common: 3
};

function createCatalogPreviewJourney(pet) {
  return {
    claimed: true,
    visual_state: 'pet',
    slot_state: 'hatched',
    status_label: '图鉴预览',
    name: pet?.name || '宠物伙伴',
    subtitle: `${pet?.species || '课堂伙伴'} · 领取后即可开始养成`,
    selected_species: pet?.species || null,
    stage_name: '初始伙伴',
    stage_level: 2,
    stage_description: pet?.quote || '领取后就会进入完整的课堂成长线。',
    stage_color: pet?.accent || '#F59E0B',
    progress: 45,
    growth_value: 36,
    growth_from_score: 24,
    growth_from_care: 12,
    care_score: 72,
    satiety: 74,
    mood: 80,
    cleanliness: 70,
    total_care_actions: 12,
    can_hatch: false,
    can_evolve: false,
    care_tip: '图鉴预览用于给学生展示未来的样子，实际数值仍由课堂积分和照料行为驱动。',
    next_target: '领取后继续提升成长值与照料评分，解锁更高等级和进化形态。',
    feed_count: 4,
    play_count: 5,
    clean_count: 3,
    accent: pet?.accent || '#F59E0B',
    theme: pet?.theme || '#FFF7ED'
  };
}

function getRosterStatusMeta(journey) {
  if (journey.is_dormant) {
    return {
      label: '待唤醒',
      detail: journey.revive_hint || '需要先重新获得积分，再照料把它叫醒。',
      className: 'bg-slate-200 text-slate-700'
    };
  }

  if (journey.can_evolve) {
    return {
      label: '可进化',
      detail: '已经满足进化条件，适合做公开仪式。',
      className: 'bg-fuchsia-100 text-fuchsia-700'
    };
  }

  if (journey.can_hatch) {
    return {
      label: '可孵化',
      detail: '成长值与照料行为已经达标，可以安排孵化。',
      className: 'bg-amber-100 text-amber-700'
    };
  }

  if (!journey.claimed) {
    return {
      label: '待领取',
      detail: '还没绑定宠物，先发一只宠物蛋。',
      className: 'bg-slate-100 text-slate-600'
    };
  }

  if (journey.visual_state === 'egg') {
    return {
      label: '蛋态培养',
      detail: '继续照料几次，就能把蛋顺利孵出来。',
      className: 'bg-cyan-100 text-cyan-700'
    };
  }

  return {
    label: '稳定成长',
    detail: '状态平稳，继续积累成长值和照料评分。',
    className: 'bg-emerald-100 text-emerald-700'
  };
}

function getQueuePriority(entry) {
  if (entry.journey.can_evolve) return 0;
  if (entry.journey.can_hatch) return 1;
  if (!entry.student.pet_id) return 2;
  if (entry.journey.visual_state === 'egg') return 3;
  return 4;
}

function sortRosterEntries(left, right) {
  const priorityDiff = getQueuePriority(left) - getQueuePriority(right);
  if (priorityDiff !== 0) return priorityDiff;

  if (right.journey.power_score !== left.journey.power_score) {
    return right.journey.power_score - left.journey.power_score;
  }

  return Number(right.student.score || 0) - Number(left.student.score || 0);
}

function withAlpha(color, alpha = '22') {
  if (typeof color !== 'string') return color;
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `${color}${alpha}`;
  }
  return color;
}

function buildSoftPanelStyle(theme, accent, angle = 145) {
  return {
    background: `linear-gradient(${angle}deg, rgba(255,255,255,0.98) 0%, ${theme} 62%, ${withAlpha(accent, '20')} 100%)`,
    boxShadow: `0 22px 54px ${withAlpha(accent, '18')}`
  };
}

function ButtonTooltip({ text, align = 'center' }) {
  if (!text) return null;

  const alignClass = align === 'right'
    ? 'right-0'
    : align === 'left'
      ? 'left-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <span
      className={`pet-hover-tip ${alignClass} rounded-[18px] bg-slate-900 px-3 py-2 text-[11px] font-bold leading-5 text-white shadow-xl`}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}

function PetActionFeedbackPanel({ feedback, className = '' }) {
  if (!feedback) return null;

  const compactMetrics = feedback.metrics.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      data-testid="pet-action-feedback"
      className={`pet-care-feedback-panel relative overflow-hidden rounded-[26px] border border-white/75 px-4 py-3 text-slate-700 shadow-[0_18px_40px_rgba(35,49,79,0.16)] ${className}`}
      style={{
        ...buildSoftPanelStyle(feedback.theme, feedback.accent, 138),
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)'
      }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl"
        style={{ backgroundColor: withAlpha(feedback.accent, '28') }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-6 bottom-2 h-16 w-16 rounded-full blur-3xl"
        style={{ backgroundColor: withAlpha(feedback.accent, '18') }}
        aria-hidden="true"
      />

      <div className="relative flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-white/90 text-2xl shadow-sm"
          style={{ boxShadow: `0 10px 24px ${withAlpha(feedback.accent, '18')}` }}
        >
          {feedback.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-black shadow-sm ${feedback.badgeClass}`}>
              {feedback.title}
            </span>
            {feedback.scoreSpent > 0 && (
              <span className="rounded-full bg-white/88 px-3 py-1 text-[11px] font-black text-slate-600 shadow-sm">
                消耗 {feedback.scoreSpent} 积分
              </span>
            )}
            <span className="rounded-full bg-white/82 px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
              剩余 {feedback.scoreBalance}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {compactMetrics.map((item) => (
              <div
                key={item.key}
                className="pet-care-feedback-chip rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-black text-slate-700 shadow-sm"
              >
                {item.label} {item.delta > 0 ? `+${item.delta}` : item.delta}
              </div>
            ))}
            {feedback.revived && (
              <div className="rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-black text-emerald-700 shadow-sm">
                已唤醒
              </div>
            )}
            {feedback.stillDormant && (
              <div className="rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-black text-amber-700 shadow-sm">
                继续照料
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CareMeter({ label, value, color, delta = null, highlight = false }) {
  return (
    <div
      className={`rounded-[18px] px-3 py-2 transition-all duration-300 ${highlight ? 'bg-white/84 shadow-sm ring-1 ring-white/70' : ''}`}
      style={highlight ? { boxShadow: `0 12px 28px ${withAlpha(color, '20')}` } : undefined}
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          {delta ? (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          ) : null}
          <span>{value}</span>
        </div>
      </div>
      <div className={`rounded-full ${highlight ? 'bg-white' : 'bg-white/80'}`} style={{ height: highlight ? 10 : 8 }}>
        <div
          className="rounded-full transition-all duration-500"
          style={{ width: `${value}%`, height: highlight ? 10 : 8, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function formatMilestoneStamp(value) {
  if (!value) return '待解锁';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '已完成';

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function buildPetMilestones(slot, journey) {
  return [
    {
      key: 'claim',
      label: '领取',
      done: Boolean(slot?.pet_claimed_at || journey.claimed),
      stamp: formatMilestoneStamp(slot?.pet_claimed_at)
    },
    {
      key: 'hatch',
      label: '孵化',
      done: Boolean(slot?.pet_hatched_at || journey.visual_state === 'pet'),
      stamp: formatMilestoneStamp(slot?.pet_hatched_at)
    },
    {
      key: 'evolve',
      label: '进化',
      done: Boolean(slot?.pet_evolved_at || journey.slot_state === 'evolved'),
      stamp: formatMilestoneStamp(slot?.pet_evolved_at)
    }
  ];
}

function getRitualPlanner({ journey, unlockStatus, canClaimAnotherPet, collectionLength, collectionCapacity }) {
  if (!journey.claimed) {
    return {
      kicker: '首次领取',
      title: '先选定第一只宠物',
      detail: '先让学生拥有一只真正喜欢的伙伴，再开始讲成长和培养，会更有代入感。',
      speech: '先挑一只最喜欢的宠物，从现在开始，课堂努力都会养大它。',
      badge: '先领取',
      panelClass: 'from-slate-50 via-white to-cyan-50',
      badgeClass: 'bg-slate-900 text-white'
    };
  }

  if (journey.can_evolve) {
    return {
      kicker: '进化时刻',
      title: '安排公开进化仪式',
      detail: '条件已经满足，这是把努力变成班级高光时刻的最佳节点。',
      speech: '这不是随便升级，而是你真的把它养成了更高阶的形态。',
      badge: '可进化',
      panelClass: 'from-fuchsia-50 via-white to-pink-50',
      badgeClass: 'bg-fuchsia-100 text-fuchsia-700'
    };
  }

  if (journey.can_hatch) {
    return {
      kicker: '孵化时刻',
      title: '把孵化做成全班奖励',
      detail: '宠物已经准备好破壳，这一刻最适合把课堂积分变成可感知的惊喜。',
      speech: '你的积分和照料已经足够，让大家一起见证宠物正式诞生。',
      badge: '可孵化',
      panelClass: 'from-amber-50 via-white to-orange-50',
      badgeClass: 'bg-amber-100 text-amber-700'
    };
  }

  if (canClaimAnotherPet && collectionLength < collectionCapacity) {
    return {
      kicker: '新收藏位',
      title: '开启下一只喜欢的宠物',
      detail: '新的收藏位已经解锁，旧伙伴会保留，可以开始培养第二只宠物了。',
      speech: '你保留了之前的伙伴，也赢得了新的收藏位，现在可以再选一只喜欢的宠物。',
      badge: '新位置',
      panelClass: 'from-violet-50 via-white to-cyan-50',
      badgeClass: 'bg-violet-100 text-violet-700'
    };
  }

  if (journey.visual_state === 'egg') {
    return {
      kicker: '继续培养',
      title: '继续照顾宠物蛋',
      detail: '下一步就是孵化，再多一点照料和课堂成长，就会把期待感变成惊喜。',
      speech: '再照顾它一段时间，离破壳已经很近了。',
      badge: `${journey.progress}%`,
      panelClass: 'from-cyan-50 via-white to-sky-50',
      badgeClass: 'bg-cyan-100 text-cyan-700'
    };
  }

  return {
    kicker: '继续冲刺',
    title: '朝下一形态继续前进',
    detail: unlockStatus.progress >= 100
      ? '这只宠物已经很稳定，可以继续打磨，也可以开始准备新的收藏位。'
      : '当前重点是稳定成长、提高照料质量，并为下一次仪式提前蓄力。',
    speech: '再坚持一段稳定努力，这只宠物就会明显更强。',
    badge: `${journey.progress}%`,
    panelClass: 'from-emerald-50 via-white to-cyan-50',
    badgeClass: 'bg-emerald-100 text-emerald-700'
  };
}

function RitualPlannerCard({ plan, journey, unlockStatus, collectionLength, collectionCapacity }) {
  const accent = journey.accent || '#38bdf8';
  const theme = journey.theme || '#FFF7ED';

  return (
    <div className={`mt-5 rounded-[32px] border border-white/70 bg-gradient-to-br px-5 py-5 shadow-sm ${plan.panelClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{plan.kicker}</div>
          <div className="mt-2 text-xl font-black text-slate-800">{plan.title}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{plan.detail}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black shadow-sm ${plan.badgeClass}`}>{plan.badge}</span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[24px] bg-white/90 px-4 py-4 shadow-sm">
          <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">教师提示</div>
          <p className="mt-3 text-sm font-black leading-6 text-slate-800">{plan.speech}</p>
          <p className="mt-3 text-xs leading-6 text-slate-500">{journey.next_target}</p>
        </div>

        <div
          className="rounded-[24px] border border-white/80 px-4 py-4 text-slate-700"
          style={buildSoftPanelStyle(theme, accent, 155)}
        >
          <div className="text-[11px] font-black tracking-[0.16em] text-slate-500">进度概览</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/80 bg-white/86 px-3 py-3 shadow-sm">
              <div className="text-[11px] font-black text-slate-500">收藏</div>
              <div className="mt-1 text-lg font-black" style={{ color: accent }}>
                {collectionLength}/{collectionCapacity}
              </div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/86 px-3 py-3 shadow-sm">
              <div className="text-[11px] font-black text-slate-500">解锁</div>
              <div className="mt-1 text-lg font-black text-violet-600">{unlockStatus.progress}%</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/86 px-3 py-3 shadow-sm">
              <div className="text-[11px] font-black text-slate-500">成长</div>
              <div className="mt-1 text-lg font-black text-slate-800">{journey.growth_value}</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/86 px-3 py-3 shadow-sm">
              <div className="text-[11px] font-black text-slate-500">照料</div>
              <div className="mt-1 text-lg font-black text-emerald-600">{journey.care_score}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentRosterCard({ student, journey, selected, onSelect, onPreview }) {
  const status = getRosterStatusMeta(journey);
  const powerTone = getPetPowerTone(journey.power_score);
  const collection = getStudentPetCollection(student);
  const capacity = getStudentPetCapacity(student);

  return (
    <div
      className={`rounded-[26px] border px-4 py-4 transition ${
        selected
          ? 'border-cyan-300 bg-cyan-50 shadow-lg'
          : 'border-white/70 bg-white/88 hover:border-cyan-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => onSelect(student.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            {student.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-sm font-black text-slate-800">{student.name}</div>
              {student.team_name && (
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm">
                  {student.team_name}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <PetArtwork
                pet={student.pet}
                journey={journey}
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-white"
                imageClassName="h-5 w-5 object-contain"
                fallbackClassName="text-sm"
              />
              <span className="truncate">{journey.name}</span>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onPreview(student, journey)}
          className="rounded-full bg-white px-3 py-2 text-[11px] font-black text-slate-500 shadow-sm transition hover:bg-slate-100"
        >
          档案
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${status.className}`}>{status.label}</span>
        <span className={`pet-score-chip ${powerTone.bg} ${powerTone.text}`}>培养力 {journey.power_score}</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 shadow-sm">
          积分 {student.score || 0}
        </span>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700 shadow-sm">
          收藏 {collection.length}/{capacity}
        </span>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">{status.detail}</p>
    </div>
  );
}

function StudentPetShelfCard({ slot, busy, onActivate, onPreview }) {
  const journey = slot.journey;
  const powerTone = getPetPowerTone(journey.power_score);
  const accent = journey.accent || slot.pet?.accent || '#38bdf8';
  const theme = journey.theme || slot.pet?.theme || '#FFF7ED';
  const milestones = buildPetMilestones(slot, journey);
  const metricCards = [
    { label: '成长', value: journey.growth_value || 0, className: 'text-amber-600' },
    { label: '照料', value: journey.care_score || 0, className: 'text-emerald-600' },
    { label: '等级', value: `Lv.${Math.max(journey.stage_level || 0, journey.claimed ? 1 : 0)}`, className: 'text-slate-700' }
  ];

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border px-4 py-4 shadow-sm transition ${
        slot.is_active
          ? 'border-cyan-200 bg-cyan-50/80 shadow-lg shadow-cyan-100/70'
          : 'border-white/70 bg-white/90 hover:border-cyan-100'
      }`}
      style={{
        background: slot.is_active
          ? `linear-gradient(180deg, ${theme} 0%, rgba(255,255,255,0.98) 100%)`
          : `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, ${theme} 100%)`
      }}
    >
      <div
        className="pointer-events-none absolute -right-6 top-3 h-20 w-20 rounded-full blur-2xl"
        style={{ backgroundColor: `${accent}22` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-8 bottom-4 h-24 w-24 rounded-full blur-3xl"
        style={{ backgroundColor: `${accent}14` }}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-black text-slate-800">{journey.name}</div>
            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm">
              展台 #{slot.slot_index}
            </span>
            {slot.is_active && (
              <span className="rounded-full bg-cyan-500 px-2 py-1 text-[10px] font-black text-white shadow-sm">
                当前主宠
              </span>
            )}
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-500">
            {journey.stage_name} · {journey.status_label}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${powerTone.bg} ${powerTone.text}`}>
          培养力 {journey.power_score}
        </span>
      </div>

      <div className="mt-4 rounded-[26px] border border-white/70 bg-[radial-gradient(circle_at_top,#ffffff_0%,rgba(255,255,255,0.95)_34%,rgba(236,248,255,0.92)_100%)] px-4 py-4 shadow-inner">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative mx-auto sm:mx-0">
            <div
              className="pointer-events-none absolute inset-3 rounded-full blur-2xl"
              style={{ backgroundColor: `${accent}22` }}
              aria-hidden="true"
            />
            <div className="pet-hero-frame relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/96">
              <PetArtwork
                pet={slot.pet}
                journey={journey}
                className="flex h-16 w-16 items-center justify-center"
                imageClassName="h-14 w-14 object-contain"
                fallbackClassName="text-3xl"
              />
            </div>
            <div
              className="mx-auto mt-3 h-3 w-20 rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent}28 0%, ${accent}78 50%, ${accent}22 100%)` }}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm">
                {slot.is_active ? '主练位' : '收藏位'}
              </span>
              <span className="rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm">
                进度 {journey.progress}%
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {metricCards.map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/92 px-3 py-2 text-center shadow-sm">
                  <div className="text-[10px] font-black tracking-[0.14em] text-slate-400">{item.label}</div>
                  <div className={`mt-1 text-sm font-black ${item.className}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {milestones.map((milestone) => (
          <span
            key={milestone.key}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black shadow-sm ${
              milestone.done ? 'bg-white text-slate-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${milestone.done ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            <span>{milestone.label}</span>
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-white/85 px-3 py-3 text-[11px] font-bold leading-5 text-slate-500 shadow-sm">
        {slot.is_active ? '当前培养中的宠物会在课堂里持续获得成长与照料反馈。' : '已收藏的宠物会保留成长记录，随时可以切回继续培养。'}
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => onPreview(slot)}
          title="查看这只宠物的完整成长档案"
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/92 px-3.5 py-3 text-left text-xs font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
        >
          <span>打开展台档案</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm">
            查看
          </span>
        </button>
        <button
          type="button"
          onClick={() => onActivate(slot)}
          disabled={slot.is_active || busy}
          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left text-xs font-black transition ${
            slot.is_active
              ? 'text-slate-700 shadow-sm'
              : 'text-white shadow-lg hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none'
          }`}
          style={slot.is_active
            ? {
                borderColor: withAlpha(accent, '2e'),
                background: `linear-gradient(135deg, rgba(255,255,255,0.96) 0%, ${withAlpha(accent, '18')} 100%)`
              }
            : {
                borderColor: withAlpha(accent, '30'),
                background: `linear-gradient(135deg, ${accent} 0%, #0f172a 100%)`
              }}
        >
          <span>{slot.is_active ? '当前培养中' : busy ? '切换中...' : '切换培养'}</span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black shadow-sm ${
            slot.is_active
              ? 'bg-white/90 text-slate-500'
              : 'bg-white/18 text-white'
          }`}>
            {slot.is_active ? '主宠' : '启用'}
          </span>
        </button>
      </div>
    </div>
  );
}

function PetCatalogCard({ pet, ownerCount, selectedStudent, busy, onClaim, onPreview }) {
  const rarityMeta = RARITY_META[pet.rarity] || RARITY_META.common;
  const selectedCollection = getStudentPetCollection(selectedStudent);
  const selectedCapacity = getStudentPetCapacity(selectedStudent);
  const ownedSlot = selectedCollection.find((slot) => slot.pet_id === pet.id) || null;
  const isCurrentPet = Boolean(ownedSlot?.is_active);
  const canClaimNewPet = canStudentClaimMorePets(selectedStudent);
  const buttonDisabled = !selectedStudent || busy || (!ownedSlot && !canClaimNewPet);
  const claimHint = !selectedStudent
    ? '先选择学生，再发放宠物。'
    : ownedSlot
      ? (isCurrentPet ? '这只宠物正在当前培养中。' : '这只宠物已经在收藏架里，可直接切换培养。')
      : canClaimNewPet
        ? `领取后会进入第 ${selectedCollection.length + 1} 个收藏位，当前容量 ${selectedCollection.length}/${selectedCapacity}。`
        : getNextPetSlotHint(selectedStudent);

  let buttonClassName = `btn-game ${rarityMeta.buttonClass} flex-1 text-sm`;
  if (buttonDisabled) {
    buttonClassName = 'flex-1 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-400';
  } else if (isCurrentPet) {
    buttonClassName = 'btn-game btn-success flex-1 text-sm';
  } else if (ownedSlot) {
    buttonClassName = 'btn-game btn-orange flex-1 text-sm';
  }

  const claimButtonLabel = !selectedStudent
    ? '选学生'
    : isCurrentPet
      ? '已选中'
      : ownedSlot
        ? '切换'
        : canClaimNewPet
          ? '领取'
          : '待解锁';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      data-testid={`pet-catalog-card-${pet.id}`}
      className={`card-game bg-gradient-to-b ${rarityMeta.cardClass} p-4 ${isCurrentPet ? 'ring-2 ring-cyan-200 ring-offset-2 ring-offset-white' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-black ${rarityMeta.badgeClass}`}>
            {rarityMeta.label}
          </span>
          {isCurrentPet && (
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-black text-cyan-700">当前绑定</span>
          )}
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
          {ownerCount > 0 ? `${ownerCount} 位学生拥有` : '待启用'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onPreview(pet)}
        data-testid={`pet-catalog-preview-${pet.id}`}
        title="预览这只宠物的完整形态与成长档案"
        className="mt-4 block w-full rounded-[32px] border border-white/80 p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
        style={{
          background: `radial-gradient(circle at top, rgba(255,255,255,0.98), ${pet.theme} 54%, ${pet.accent}18 100%)`
        }}
      >
        <div className="pet-hero-frame flex h-48 items-center justify-center rounded-[28px] bg-white/88 shadow-inner">
          <PetArtwork
            pet={pet}
            journey={{ visual_state: 'pet', accent: pet.accent }}
            className="flex h-36 w-36 items-center justify-center"
            imageClassName="h-28 w-28 object-contain"
            fallbackClassName="text-[96px] leading-none"
          />
        </div>
      </button>

      <div className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-black text-slate-800">{pet.name}</div>
            <div className="mt-1 text-sm font-medium text-slate-400">{pet.species}</div>
          </div>
          <div className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
            {ownerCount > 0 ? '已投入班级' : '等待首位主人'}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/80 px-3 py-3 text-[11px] font-black text-slate-500 shadow-sm">
          <span>点击查看完整形态与成长档案</span>
          <span style={{ color: pet.accent }}>适合先预览再领取</span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/85 px-3 py-3 text-[11px] font-bold leading-5 text-slate-500 shadow-sm">
        {claimHint}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onPreview(pet)}
          title="预览这只宠物的完整形态与成长档案"
          className="flex-1 rounded-xl bg-white/90 px-4 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:bg-white"
        >
          查看形态
        </button>
        <button
          type="button"
          onClick={() => onClaim(pet)}
          data-testid={`pet-catalog-claim-${pet.id}`}
          title={claimHint}
          disabled={buttonDisabled}
          className={buttonClassName}
        >
          {!selectedStudent
            ? '先选择学生'
            : isCurrentPet
              ? `当前培养 ${selectedStudent.name}`
              : ownedSlot
                ? `切换给 ${selectedStudent.name}`
                : canClaimNewPet
                  ? `领取给 ${selectedStudent.name}`
                  : '待解锁'}
        </button>
      </div>
    </motion.article>
  );
}

function CatalogSkeletonCard() {
  return (
    <div className="card-game animate-pulse bg-gradient-to-b from-slate-100 via-white to-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="h-7 w-20 rounded-full bg-slate-200" />
        <div className="h-7 w-28 rounded-full bg-slate-200" />
      </div>
      <div className="mt-4 rounded-[28px] border border-white/80 bg-white/80 p-5">
        <div className="h-44 rounded-[24px] bg-slate-100" />
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-7 w-40 rounded-full bg-slate-200" />
        <div className="h-4 w-24 rounded-full bg-slate-100" />
        <div className="space-y-2">
          <div className="h-3 rounded-full bg-slate-100" />
          <div className="h-3 rounded-full bg-slate-100" />
          <div className="h-3 w-3/4 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-16 rounded-2xl bg-slate-200" />
        <div className="h-16 rounded-2xl bg-slate-200" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-12 flex-1 rounded-xl bg-slate-200" />
        <div className="h-12 flex-1 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function PetCenter() {
  const { currentClass, students, pets, claimStudentPet, activateStudentPetSlot, runStudentPetAction } = useStore();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [catalogSort, setCatalogSort] = useState('rarity');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [rosterFilter, setRosterFilter] = useState('all');
  const [busyKey, setBusyKey] = useState('');
  const [profileTarget, setProfileTarget] = useState(null);
  const [ceremony, setCeremony] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const deferredActiveFilter = useDeferredValue(activeFilter);
  const deferredCatalogQuery = useDeferredValue(catalogQuery);

  useEffect(() => {
    if (!students.length) {
      setSelectedStudentId('');
      return;
    }

    const exists = students.some((student) => String(student.id) === String(selectedStudentId));
    if (!exists) {
      setSelectedStudentId(String(students[0].id));
    }
  }, [students, selectedStudentId]);

  useEffect(() => {
    setCatalogReady(false);
    const frameId = requestAnimationFrame(() => {
      startTransition(() => {
        setCatalogReady(true);
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, [currentClass?.id]);

  useEffect(() => {
    setActionFeedback(null);
  }, [selectedStudentId]);

  useEffect(() => {
    if (!actionFeedback) return undefined;

    const timeoutId = window.setTimeout(() => {
      setActionFeedback(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [actionFeedback]);

  const studentEntries = useMemo(
    () => students.map((student) => ({ student, journey: getStudentPetJourney(student) })),
    [students]
  );

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.id) === String(selectedStudentId)) || null,
    [students, selectedStudentId]
  );

  const selectedJourney = getStudentPetJourney(selectedStudent);
  const selectedCollection = getStudentPetCollection(selectedStudent);
  const selectedPetCapacity = getStudentPetCapacity(selectedStudent);
  const canClaimAnotherPet = canStudentClaimMorePets(selectedStudent);
  const nextPetSlotHint = getNextPetSlotHint(selectedStudent);
  const unlockStatus = getStudentPetUnlockStatus(selectedStudent);
  const selectedActiveSlot = selectedCollection.find((slot) => slot.is_active) || selectedCollection[0] || null;
  const selectedMilestones = buildPetMilestones(selectedActiveSlot, selectedJourney);
  const selectedSpotlightAccent = selectedJourney.accent || selectedStudent?.pet?.accent || '#38bdf8';
  const selectedSpotlightTheme = selectedJourney.theme || selectedStudent?.pet?.theme || '#FFF7ED';
  const selectedSpotlightRarity = RARITY_META[selectedStudent?.pet?.rarity] || RARITY_META.rare;
  const selectedSpotlightBadge = selectedStudent?.pet?.badge || selectedJourney.power_label;
  const summary = getClassPetSummary(students);

  const ownerCountByPet = useMemo(
    () => students.reduce((acc, student) => {
      getStudentPetCollection(student).forEach((slot) => {
        if (!slot.pet_id) return;
        acc[slot.pet_id] = (acc[slot.pet_id] || 0) + 1;
      });
      return acc;
    }, {}),
    [students]
  );

  const powerLeaderboard = useMemo(
    () => [...studentEntries]
      .sort((left, right) => {
        if (right.journey.power_score !== left.journey.power_score) {
          return right.journey.power_score - left.journey.power_score;
        }

        return Number(right.student.score || 0) - Number(left.student.score || 0);
      })
      .slice(0, 5),
    [studentEntries]
  );

  const spotlightEntry = powerLeaderboard[0] || null;
  const averagePower = useMemo(() => {
    if (!studentEntries.length) return 0;
    const totalPower = studentEntries.reduce((sum, entry) => sum + entry.journey.power_score, 0);
    return Math.round(totalPower / studentEntries.length);
  }, [studentEntries]);

  const stableCount = useMemo(
    () => studentEntries.filter((entry) => entry.journey.claimed && entry.journey.care_score >= 75).length,
    [studentEntries]
  );

  const actionQueue = useMemo(
    () => [...studentEntries]
      .filter((entry) => getQueuePriority(entry) < 4)
      .sort(sortRosterEntries)
      .slice(0, 4),
    [studentEntries]
  );

  const rosterCounts = useMemo(
    () => ({
      all: studentEntries.length,
      attention: studentEntries.filter((entry) => getQueuePriority(entry) < 4).length,
      egg: studentEntries.filter((entry) => !entry.student.pet_id || entry.journey.visual_state === 'egg').length,
      pet: studentEntries.filter((entry) => entry.journey.visual_state === 'pet').length
    }),
    [studentEntries]
  );

  const rosterEntries = useMemo(() => {
    const filtered = studentEntries.filter((entry) => {
      if (rosterFilter === 'attention') return getQueuePriority(entry) < 4;
      if (rosterFilter === 'egg') return !entry.student.pet_id || entry.journey.visual_state === 'egg';
      if (rosterFilter === 'pet') return entry.journey.visual_state === 'pet';
      return true;
    });

    return filtered.sort(sortRosterEntries);
  }, [rosterFilter, studentEntries]);

  const openProfile = ({ studentName, pet, journey, collection = [], petCapacity = 1, slotId = null }) => {
    setProfileTarget({ studentName, pet, journey, collection, petCapacity, slotId });
  };

  const buildStudentProfileTarget = (student, journeyOverride = null, petOverride = null, slotIdOverride = null) => {
    if (!student) return null;

    const collection = getStudentPetCollection(student);
    const activeSlot = collection.find((slot) => slot.is_active) || null;

    return {
      studentName: student.name || '学员',
      pet: petOverride || student.pet,
      journey: journeyOverride || getStudentPetJourney(student),
      collection,
      petCapacity: getStudentPetCapacity(student),
      slotId: slotIdOverride || student.active_pet_slot_id || activeSlot?.slot_id || null
    };
  };

  const closeProfile = () => {
    setProfileTarget(null);
  };

  const previewStudent = (student, journey = getStudentPetJourney(student)) => {
    const nextTarget = buildStudentProfileTarget(student, journey, student?.pet);
    if (nextTarget) {
      openProfile(nextTarget);
    }
  };

  const handleClaim = async (pet) => {
    if (!selectedStudent) {
      window.alert('请先选择学生');
      return;
    }

    setBusyKey(`claim-${pet.id}`);
    try {
      const previousCollection = getStudentPetCollection(selectedStudent);
      const previousOwnedSlot = previousCollection.find((slot) => slot.pet_id === pet.id) || null;
      const updatedStudent = await claimStudentPet(selectedStudent.id, pet.id, false);
      const nextCollection = getStudentPetCollection(updatedStudent);
      const claimedSlot =
        nextCollection.find((slot) => slot.pet_id === pet.id && slot.is_active)
        || nextCollection.find((slot) => slot.pet_id === pet.id)
        || null;
      const addedNewPet = !previousOwnedSlot && nextCollection.length > previousCollection.length;

      if (addedNewPet && claimedSlot) {
        setCeremony({
          action: 'claim',
          studentName: updatedStudent.name || selectedStudent.name,
          studentScore: Number(updatedStudent.score || selectedStudent.score || 0),
          pet,
          previousPet: null,
          previousJourney: {
            visual_state: 'egg',
            slot_state: 'empty',
            stage_level: 0,
            stage_name: '空收藏位',
            status_label: '等待报到',
            accent: '#CBD5E1',
            next_target: '等待第一轮课堂积分与照料行为点亮它'
          },
          journey: claimedSlot.journey,
          collectionCount: nextCollection.length,
          slotIndex: claimedSlot.slot_index,
          profileTarget: buildStudentProfileTarget(updatedStudent, claimedSlot.journey, claimedSlot.pet, claimedSlot.slot_id)
        });
      }
    } catch (err) {
      window.alert(err.message || '领取宠物失败');
    } finally {
      setBusyKey('');
    }
  };

  const handleActivatePetSlot = async (slot) => {
    if (!selectedStudent || !slot?.slot_id || slot.is_active) return;

    setBusyKey(`activate-${slot.slot_id}`);
    try {
      await activateStudentPetSlot(selectedStudent.id, slot.slot_id);
    } catch (err) {
      window.alert(err.message || '切换宠物失败');
    } finally {
      setBusyKey('');
    }
  };

  const handlePreviewCollectionSlot = (slot) => {
    if (!slot) return;

    openProfile({
      studentName: selectedStudent?.name || '学员',
      pet: slot.pet,
      journey: slot.journey,
      collection: selectedCollection,
      petCapacity: selectedPetCapacity,
      slotId: slot.slot_id
    });
  };

  const handlePreviewCatalogPet = (pet) => {
    openProfile({
      studentName: '图鉴预览',
      pet,
      journey: createCatalogPreviewJourney(pet),
      collection: [],
      petCapacity: 1,
      slotId: null
    });
  };

  const handlePreviewSelectedStudent = () => {
    if (!selectedStudent) return;

    previewStudent(selectedStudent, selectedJourney);
  };

  const handlePetAction = async (action) => {
    if (!selectedCollection.length) return;

    const previousJourney = { ...selectedJourney };
    setActionFeedback(null);
    setBusyKey(action);
    try {
      const updatedStudent = await runStudentPetAction(selectedStudent.id, action);
      const nextJourney = getStudentPetJourney(updatedStudent);

      if (action === 'feed' || action === 'play' || action === 'clean') {
        playPetActionSound(action);
        setActionFeedback(
          buildPetActionFeedback({
            action,
            previousJourney,
            nextJourney,
            studentName: selectedStudent.name,
            pet: updatedStudent.pet
          })
        );
      }

      if (action === 'hatch' && previousJourney.visual_state === 'egg' && nextJourney.visual_state === 'pet') {
        setCeremony({
          action: 'hatch',
          studentName: selectedStudent.name,
          pet: updatedStudent.pet,
          previousJourney,
          journey: nextJourney,
          profileTarget: buildStudentProfileTarget(updatedStudent, nextJourney, updatedStudent.pet, updatedStudent.active_pet_slot_id)
        });
      }

      if (action === 'evolve' && previousJourney.slot_state !== 'evolved' && nextJourney.slot_state === 'evolved') {
        setCeremony({
          action: 'evolve',
          studentName: selectedStudent.name,
          pet: updatedStudent.pet,
          previousJourney,
          journey: nextJourney,
          profileTarget: buildStudentProfileTarget(updatedStudent, nextJourney, updatedStudent.pet, updatedStudent.active_pet_slot_id)
        });
      }
    } catch (err) {
      window.alert(err.message || '宠物操作失败');
    } finally {
      setBusyKey('');
    }
  };

  const careItems = getPetCareItems(selectedJourney);
  const tone = getPetStatusTone(selectedJourney);
  const filterCounts = useMemo(
    () => pets.reduce((acc, pet) => {
      acc[pet.rarity] = (acc[pet.rarity] || 0) + 1;
      return acc;
    }, { all: pets.length }),
    [pets]
  );
  const filteredPets = useMemo(() => {
    const normalizedQuery = deferredCatalogQuery.trim().toLowerCase();
    let nextPets = deferredActiveFilter === 'all'
      ? [...pets]
      : pets.filter((pet) => pet.rarity === deferredActiveFilter);

    if (normalizedQuery) {
      nextPets = nextPets.filter((pet) => {
        const content = `${pet.name || ''} ${pet.species || ''} ${pet.quote || ''}`.toLowerCase();
        return content.includes(normalizedQuery);
      });
    }

    nextPets.sort((left, right) => {
      if (catalogSort === 'popular') {
        const popularityDiff = (ownerCountByPet[right.id] || 0) - (ownerCountByPet[left.id] || 0);
        if (popularityDiff !== 0) return popularityDiff;
      }

      if (catalogSort === 'name') {
        return String(left.name || '').localeCompare(String(right.name || ''));
      }

      const rarityDiff = (RARITY_ORDER[left.rarity] ?? 99) - (RARITY_ORDER[right.rarity] ?? 99);
      if (rarityDiff !== 0) return rarityDiff;

      const popularityDiff = (ownerCountByPet[right.id] || 0) - (ownerCountByPet[left.id] || 0);
      if (popularityDiff !== 0) return popularityDiff;

      return String(left.name || '').localeCompare(String(right.name || ''));
    });

    return nextPets;
  }, [catalogSort, deferredActiveFilter, deferredCatalogQuery, ownerCountByPet, pets]);
  const selectedStudentRank = useMemo(() => {
    if (!selectedStudent) return null;
    const index = powerLeaderboard.findIndex((entry) => String(entry.student.id) === String(selectedStudent.id));
    return index >= 0 ? index + 1 : null;
  }, [powerLeaderboard, selectedStudent]);
  const selectedPowerTone = getPetPowerTone(selectedJourney.power_score);
  const ritualPlanner = getRitualPlanner({
    journey: selectedJourney,
    unlockStatus,
    canClaimAnotherPet,
    collectionLength: selectedCollection.length,
    collectionCapacity: selectedPetCapacity
  });
  const careActionButtons = ['feed', 'play', 'clean'];
  const ritualActionButtons = [];
  if (selectedJourney.can_hatch) ritualActionButtons.push('hatch');
  if (selectedJourney.can_evolve) ritualActionButtons.push('evolve');
  const selectedScoreBalance = Number(selectedJourney.score_balance ?? selectedStudent?.score ?? 0);
  const feedbackMetricMap = new Map((actionFeedback?.metrics || []).map((item) => [item.key, item.delta]));
  const feedbackStatChips = (actionFeedback?.metrics || [])
    .filter((item) => !['satiety', 'mood', 'cleanliness'].includes(item.key))
    .slice(0, 3);
  const handleCeremonyContinue = () => {
    if (ceremony?.profileTarget) {
      setProfileTarget(ceremony.profileTarget);
    }
    setCeremony(null);
  };

  return (
    <>
      <div className="space-y-6">
        <section className="card-game border-orange-200 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_340px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-orange-500 shadow-sm">
                <span className="text-lg">🐾</span>
                乐启享宠物工作台
              </div>
              <h3 className="mt-4 text-3xl font-black text-slate-800">把班级宠物做成一条完整的成长叙事线</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                这里不是简单发放宠物，而是班级情绪价值、成长反馈和课堂节奏的中枢。学生先领取宠物蛋，再通过课堂积分、喂养、互动、清洁完成孵化、升级和进化。
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[28px] bg-white/85 px-4 py-4 shadow-sm">
                  <div className="text-xs font-bold text-slate-400">已收藏宠物</div>
                  <div className="mt-2 text-3xl font-black text-orange-500">{summary.collectedPets}</div>
                  <div className="mt-2 text-xs text-slate-500">覆盖率 {summary.progress}%</div>
                </div>
                <div className="rounded-[28px] bg-white/85 px-4 py-4 shadow-sm">
                  <div className="text-xs font-bold text-slate-400">仪式队列</div>
                  <div className="mt-2 text-3xl font-black text-cyan-500">{actionQueue.length}</div>
                  <div className="mt-2 text-xs text-slate-500">待领取 / 可孵化 / 可进化</div>
                </div>
                <div className="rounded-[28px] bg-white/85 px-4 py-4 shadow-sm">
                  <div className="text-xs font-bold text-slate-400">平均培养力</div>
                  <div className="mt-2 text-3xl font-black text-fuchsia-500">{averagePower}</div>
                  <div className="mt-2 text-xs text-slate-500">控制差距，保留竞争感</div>
                </div>
                <div className="rounded-[28px] bg-white/85 px-4 py-4 shadow-sm">
                  <div className="text-xs font-bold text-slate-400">稳定照料</div>
                  <div className="mt-2 text-3xl font-black text-emerald-500">{stableCount}</div>
                  <div className="mt-2 text-xs text-slate-500">照料分 75 以上的学生</div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] bg-white/88 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold tracking-[0.24em] text-slate-400">本节聚焦</div>
                  <div className="mt-2 text-xl font-black text-slate-800">本节课聚光灯</div>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-500 shadow-sm">
                  {currentClass?.name || '未选择班级'}
                </span>
              </div>

              {spotlightEntry ? (
                <button
                  type="button"
                  onClick={() => previewStudent(spotlightEntry.student, spotlightEntry.journey)}
                  className="mt-5 block w-full rounded-[28px] bg-gradient-to-br from-white to-orange-50/70 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="pet-hero-frame flex h-24 w-24 items-center justify-center rounded-[28px]">
                      <PetArtwork
                        pet={spotlightEntry.student.pet}
                        journey={spotlightEntry.journey}
                        className="flex h-20 w-20 items-center justify-center"
                        imageClassName="h-16 w-16 object-contain"
                        fallbackClassName="text-4xl"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-xl font-black text-slate-800">{spotlightEntry.student.name}</div>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                          {spotlightEntry.student.team_name || '未分组'}
                        </span>
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-500">
                        {spotlightEntry.journey.name} · {spotlightEntry.journey.stage_name}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{spotlightEntry.journey.care_tip}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                      当前积分 {spotlightEntry.student.score || 0}
                    </span>
                    <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-black text-fuchsia-700">
                      培养力 {spotlightEntry.journey.power_score}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                      照料分 {spotlightEntry.journey.care_score}
                    </span>
                  </div>
                </button>
              ) : (
                <div className="mt-5 rounded-[28px] border-2 border-dashed border-orange-200 bg-orange-50/50 px-5 py-10 text-center text-sm text-slate-500">
                  先给学生领取宠物，聚光灯会自动展示当前班级最亮眼的成长对象。
                </div>
              )}
            </div>
          </div>
        </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="card-game border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-sky-50">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] text-cyan-500">培养操作台</div>
                <h3 className="mt-2 text-2xl font-black text-slate-800">培养控制台</h3>
                <p className="mt-2 text-sm text-slate-500">
                  班级「{currentClass?.name || '未选择'}」当前聚焦学生：
                  <span className="font-bold text-slate-700"> {selectedStudent?.name || '未选择'}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedStudent && (
                  <>
                    <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
                      当前积分 {selectedStudent.score || 0}
                    </span>
                    {selectedStudentRank && (
                      <span className="rounded-full bg-violet-100 px-3 py-2 text-xs font-black text-violet-700 shadow-sm">
                        排名第 {selectedStudentRank} 名
                      </span>
                    )}
                    <span
                      className="rounded-full bg-cyan-100 px-3 py-2 text-xs font-black text-cyan-700 shadow-sm"
                      data-testid="pet-center-collection-chip"
                    >
                      收藏 {selectedCollection.length}/{selectedPetCapacity}
                    </span>
                  </>
                )}
                <select
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  data-testid="pet-center-student-select"
                  className="min-w-[220px] rounded-2xl border-2 border-cyan-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-300"
                >
                  {students.length === 0 ? (
                    <option value="">当前班级还没有学生</option>
                  ) : (
                    students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} {student.team_name ? `· ${student.team_name}` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {selectedStudent ? (
              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  <div className="rounded-[32px] bg-white/88 p-5 shadow-sm">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-white text-5xl shadow-md">
                        {selectedStudent.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-2xl font-black text-slate-800">{selectedStudent.name}</h4>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${tone.bg} ${tone.text}`}>
                            {selectedJourney.status_label}
                          </span>
                          {selectedStudent.team_name && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                              {selectedStudent.team_name}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-slate-500">{selectedJourney.subtitle}</div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`pet-score-chip ${selectedPowerTone.bg} ${selectedPowerTone.text}`}>
                            培养力 {selectedJourney.power_score}
                          </span>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                            成长值 {selectedJourney.growth_value}
                          </span>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                            照料分 {selectedJourney.care_score}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[32px] bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold tracking-[0.18em] text-violet-500">收藏架</div>
                          <div className="mt-2 text-xl font-black text-slate-800">宠物收藏架</div>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{nextPetSlotHint}</p>
                        </div>
                        <div
                          className="rounded-[24px] bg-white/90 px-4 py-3 text-right shadow-sm"
                          data-testid="pet-center-collection-summary"
                        >
                          <div className="text-xs font-bold text-slate-400">当前容量</div>
                          <div className="mt-1 text-2xl font-black text-violet-600">
                            {selectedCollection.length}/{selectedPetCapacity}
                          </div>
                          <div className="mt-1 text-[11px] font-bold text-slate-500">
                            {canClaimAnotherPet ? '已解锁新的宠物位' : '继续进化可解锁下一位'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-[28px] border border-white/70 bg-white/82 px-4 py-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold tracking-[0.18em] text-slate-400">宠物位解锁</div>
                            <div className="mt-2 text-lg font-black text-slate-800">{unlockStatus.title}</div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">{unlockStatus.detail}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black shadow-sm ${
                            unlockStatus.unlockedAll
                              ? 'bg-slate-900 text-white'
                              : unlockStatus.progress >= 100
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-violet-100 text-violet-700'
                          }`}>
                            {unlockStatus.chip}
                          </span>
                        </div>

                        <div className="mt-4 h-3 rounded-full bg-slate-100">
                          <div
                            className="h-3 rounded-full transition-all"
                            style={{
                              width: `${unlockStatus.progress}%`,
                              background: unlockStatus.progress >= 100
                                ? 'linear-gradient(90deg, #34d399 0%, #22c55e 100%)'
                                : 'linear-gradient(90deg, #a855f7 0%, #38bdf8 100%)'
                            }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            进化完成 {unlockStatus.requirementCurrent}/{unlockStatus.requirementTotal}
                          </span>
                          {unlockStatus.nextSlotNumber && (
                            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                              目标宠物位 #{unlockStatus.nextSlotNumber}
                            </span>
                          )}
                          <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                            进度 {unlockStatus.progress}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {Array.from({ length: 3 }, (_, index) => {
                          const slot = selectedCollection[index];

                          if (slot) {
                            return (
                              <StudentPetShelfCard
                                key={slot.slot_id || `${slot.pet_id}-${index}`}
                                slot={slot}
                                busy={busyKey === `activate-${slot.slot_id}`}
                                onActivate={handleActivatePetSlot}
                                onPreview={handlePreviewCollectionSlot}
                              />
                            );
                          }

                          const unlocked = index < selectedPetCapacity;
                          const isNextOpenSlot = unlocked && index === selectedCollection.length;

                          return (
                            <div
                              key={`empty-slot-${index + 1}`}
                              className={`rounded-[28px] border px-4 py-4 shadow-sm ${
                                unlocked
                                  ? 'border-dashed border-cyan-200 bg-cyan-50/60'
                                  : 'border-dashed border-slate-200 bg-slate-50/80'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-black text-slate-700">展台 #{index + 1}</div>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                    unlocked ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {unlocked ? '待领取' : '未解锁'}
                                </span>
                              </div>
                              <div className="mt-4 rounded-[24px] border border-white/70 bg-[radial-gradient(circle_at_top,#ffffff_0%,rgba(255,255,255,0.94)_34%,rgba(236,248,255,0.9)_100%)] px-4 py-5 text-center shadow-inner">
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-white/92 text-4xl shadow-sm">
                                  {unlocked ? '🥚' : '🔒'}
                                </div>
                                <div className="mx-auto mt-3 h-3 w-20 rounded-full bg-gradient-to-r from-cyan-100 via-white to-cyan-100" aria-hidden="true" />
                                <div className="mt-3 text-sm font-black text-slate-700">
                                  {isNextOpenSlot ? '下一只喜欢的宠物' : unlocked ? '已解锁宠物位' : '进化后解锁'}
                                </div>
                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                  {unlocked
                                    ? '去图鉴区挑选一只新宠物，这个位置会直接变成新的收藏展台。'
                                    : '先把已拥有宠物培养到进化，再打开新的长期培养位。'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-3xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold text-slate-400">当前阶段</div>
                            <div className="mt-1 text-xl font-black text-slate-800">
                              Lv.{Math.max(selectedJourney.stage_level || 0, selectedJourney.claimed ? 1 : 0)} · {selectedJourney.stage_name}
                            </div>
                          </div>
                          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-700">
                            进度 {selectedJourney.progress}%
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-500">{selectedJourney.next_target}</p>
                        <div className="mt-4 h-3 rounded-full bg-white">
                          <div
                            className="h-3 rounded-full transition-all"
                            style={{
                              width: `${selectedJourney.progress}%`,
                              backgroundColor: selectedJourney.stage_color
                            }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePreviewSelectedStudent}
                        data-testid="pet-center-profile-summary-cta"
                        className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/70 to-sky-50 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="text-sm font-black text-slate-800">查看完整成长档案</div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          具体形态、成长轨迹、里程碑和收藏位解锁都集中在档案里，主页只保留课堂操作必需信息。
                        </p>
                        <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                          打开详细档案
                        </div>
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {false && actionFeedback && (
                      <PetActionFeedbackPanel feedback={actionFeedback} />
                    )}
                  </AnimatePresence>

                  {false && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {actionButtons.map((action) => {
                      const meta = ACTION_META[action];
                      const disabled = selectedCollection.length === 0 || Boolean(busyKey);
                      const isRitualAction = action === 'hatch' || action === 'evolve';
                      const isFeedbackAction = actionFeedback?.action === action;
                      const isWorking = busyKey === action;
                      const cardClass = action === 'evolve'
                        ? 'from-fuchsia-50 via-white to-pink-50 border-fuchsia-100'
                        : action === 'hatch'
                          ? 'from-amber-50 via-white to-orange-50 border-amber-100'
                          : 'from-white via-cyan-50/60 to-white border-cyan-100';

                      return (
                        <motion.button
                          key={action}
                          type="button"
                          onClick={() => handlePetAction(action)}
                          data-testid={`pet-action-${action}`}
                          disabled={disabled}
                          whileHover={disabled ? undefined : { y: -3, scale: 1.01 }}
                          whileTap={disabled ? undefined : { scale: 0.985 }}
                          className={`pet-care-action-card relative overflow-hidden rounded-[24px] border bg-gradient-to-br px-4 py-4 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${cardClass} ${
                            isFeedbackAction ? 'pet-care-action-card-active' : ''
                          }`}
                          style={{
                            boxShadow: isFeedbackAction
                              ? `0 18px 40px ${withAlpha(meta.accent || '#38bdf8', '30')}`
                              : undefined
                          }}
                        >
                          <span
                            className="pointer-events-none absolute inset-0 opacity-95"
                            style={{
                              background: `linear-gradient(160deg, rgba(255,255,255,0.97) 0%, ${meta.theme || '#ffffff'} 76%, ${withAlpha(meta.accent || '#38bdf8', '10')} 100%)`
                            }}
                            aria-hidden="true"
                          />
                          <span
                            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl"
                            style={{ backgroundColor: withAlpha(meta.accent || '#38bdf8', isFeedbackAction ? '34' : '20') }}
                            aria-hidden="true"
                          />
                          <span
                            className="pointer-events-none absolute -left-4 bottom-0 h-16 w-16 rounded-full blur-2xl"
                            style={{ backgroundColor: withAlpha(meta.accent || '#38bdf8', '16') }}
                            aria-hidden="true"
                          />
                          {(isWorking || isFeedbackAction) && (
                            <motion.span
                              className="pointer-events-none absolute inset-0 opacity-60"
                              initial={{ opacity: 0.2 }}
                              animate={{ opacity: [0.18, 0.5, 0.2] }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                              style={{
                                background: `radial-gradient(circle at top, ${withAlpha(meta.accent || '#38bdf8', '22')} 0%, rgba(255,255,255,0) 72%)`
                              }}
                              aria-hidden="true"
                            />
                          )}

                          <div className="relative">
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-white/92 text-2xl shadow-sm"
                                style={{ boxShadow: `0 10px 24px ${withAlpha(meta.accent || '#38bdf8', '18')}` }}
                              >
                                {meta.icon}
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black shadow-sm ${
                                isRitualAction ? 'bg-white/92 text-slate-500' : meta.badgeClass
                              }`}>
                                {isRitualAction ? '仪式' : meta.badge}
                              </span>
                            </div>
                            <div className="mt-4 text-sm font-black text-slate-800">
                              {isWorking ? '处理中...' : getPetActionLabel(selectedJourney, action)}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{meta.description}</p>
                            {!isRitualAction && (
                              <div className="mt-3 text-[11px] font-bold text-slate-500">
                                {isFeedbackAction ? '刚刚完成一次照护仪式' : meta.flavor}
                              </div>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>}
                </div>

                <div
                  className="relative overflow-hidden rounded-[34px] border border-white/80 p-5 text-slate-700"
                  style={buildSoftPanelStyle(selectedSpotlightTheme, selectedSpotlightAccent)}
                >
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl"
                    style={{ backgroundColor: withAlpha(selectedSpotlightAccent, '24') }}
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute -left-8 bottom-6 h-24 w-24 rounded-full blur-3xl"
                    style={{ backgroundColor: withAlpha(selectedSpotlightAccent, '16') }}
                    aria-hidden="true"
                  />

                  <div className="relative flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black tracking-[0.22em]" style={{ color: selectedSpotlightAccent }}>
                        宠物主角
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-800">{selectedJourney.name}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-black shadow-sm"
                        style={{ backgroundColor: withAlpha(selectedSpotlightAccent, '14'), color: selectedSpotlightAccent }}
                      >
                        {selectedSpotlightBadge}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black shadow-sm ${selectedSpotlightRarity.badgeClass}`}>
                        {selectedSpotlightRarity.label}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePreviewSelectedStudent}
                    data-testid="pet-center-spotlight-preview"
                    className="relative mt-4 block w-full text-left"
                  >
                    <div
                      className="rounded-[30px] border border-white/80 p-4 shadow-sm"
                      style={{
                        background: `linear-gradient(180deg, rgba(255,255,255,0.92) 0%, ${selectedSpotlightTheme} 100%)`
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-black text-slate-600 shadow-sm">
                          {selectedJourney.stage_name}
                        </span>
                        <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                          {selectedJourney.power_label}
                        </span>
                      </div>

                      <div className="pet-hero-frame mx-auto mt-4 flex h-56 w-full items-center justify-center rounded-[28px] bg-white/92">
                        <PetArtwork
                          pet={selectedStudent.pet}
                          journey={selectedJourney}
                          className="flex h-44 w-44 items-center justify-center"
                          imageClassName={`h-36 w-36 object-contain ${selectedJourney.is_dormant ? 'grayscale opacity-80' : ''}`}
                          fallbackClassName="text-7xl"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {actionFeedback && (
                        <PetActionFeedbackPanel
                          feedback={actionFeedback}
                          className="pointer-events-none absolute inset-x-4 bottom-4 z-20 sm:inset-x-6"
                        />
                      )}
                    </AnimatePresence>
                  </button>

                  <div
                    className="mt-5 rounded-[28px] border border-white/80 bg-white/82 px-4 py-4 shadow-sm"
                    data-testid="pet-care-action-cluster"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="text-xs font-black tracking-[0.18em]" style={{ color: selectedSpotlightAccent }}>
                          照料台
                        </div>
                        <div className="inline-flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                          <span className="rounded-full border border-white/80 bg-white/82 px-3 py-1.5 shadow-sm">
                            {selectedJourney.is_dormant ? '先赚分，再把它叫醒' : '操作后会直接同步到宠物状态'}
                          </span>
                          {selectedJourney.score_debt > 0 && (
                            <span className="rounded-full bg-rose-100 px-3 py-1.5 text-rose-700 shadow-sm">
                              欠账 {selectedJourney.score_debt} 分
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="rounded-[24px] border border-white/80 px-4 py-3 text-right shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, rgba(255,255,255,0.94) 0%, ${withAlpha(selectedSpotlightAccent, '12')} 100%)`,
                          boxShadow: `0 16px 34px ${withAlpha(selectedSpotlightAccent, '14')}`
                        }}
                      >
                        <div className="text-[11px] font-black" style={{ color: selectedSpotlightAccent }}>当前积分</div>
                        <div className="mt-1 text-2xl font-black text-slate-800">{selectedScoreBalance}</div>
                        <div className="mt-1 text-[11px] font-bold text-slate-500">
                          {selectedJourney.score_debt > 0 ? '先补回欠账再稳定照料' : '每次操作都会消耗积分'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {careItems.map((item) => {
                        const delta = feedbackMetricMap.get(item.key) ?? null;

                        return (
                          <CareMeter
                            key={item.key}
                            label={item.label}
                            value={item.value}
                            color={item.color}
                            delta={delta}
                            highlight={typeof delta === 'number'}
                          />
                        );
                      })}
                    </div>

                    {feedbackStatChips.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {feedbackStatChips.map((item) => (
                          <span
                            key={item.key}
                            className="rounded-full bg-white/86 px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-sm"
                          >
                            {item.label} {item.delta > 0 ? `+${item.delta}` : item.delta}
                          </span>
                        ))}
                        {actionFeedback?.scoreSpent > 0 && (
                          <span className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white shadow-sm">
                            消耗 {actionFeedback.scoreSpent} 分
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {careActionButtons.map((action) => {
                        const meta = ACTION_META[action];
                        const actionCost = getPetActionCost(selectedJourney, action);
                        const scoreShortage = Math.max(0, actionCost - selectedScoreBalance);
                        const disabled = selectedCollection.length === 0 || Boolean(busyKey) || scoreShortage > 0;
                        const isFeedbackAction = actionFeedback?.action === action;
                        const isWorking = busyKey === action;
                        const helperText = selectedJourney.is_dormant
                          ? (scoreShortage > 0 ? `还差 ${scoreShortage} 积分才能唤醒` : '立刻照料，让它慢慢醒来')
                          : (scoreShortage > 0 ? `还差 ${scoreShortage} 积分` : meta.flavor);

                        return (
                          <div key={action} className="pet-tip-trigger relative">
                            <motion.button
                              type="button"
                              onClick={() => handlePetAction(action)}
                              data-testid={`pet-action-${action}`}
                              title={`${meta.description} ${helperText}`}
                              disabled={disabled}
                              whileHover={disabled ? undefined : { y: -3, scale: 1.01 }}
                              whileTap={disabled ? undefined : { scale: 0.985 }}
                              className={`pet-care-action-card relative overflow-hidden rounded-[24px] border bg-gradient-to-br px-4 py-3.5 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                isFeedbackAction ? 'pet-care-action-card-active' : ''
                              }`}
                              style={{
                                backgroundImage: `linear-gradient(160deg, rgba(255,255,255,0.98) 0%, ${meta.theme || '#ffffff'} 76%, ${withAlpha(meta.accent || '#38bdf8', '10')} 100%)`,
                                borderColor: withAlpha(meta.accent || '#38bdf8', '26'),
                                boxShadow: isFeedbackAction
                                  ? `0 18px 40px ${withAlpha(meta.accent || '#38bdf8', '30')}`
                                  : `0 14px 30px ${withAlpha(meta.accent || '#38bdf8', '14')}`
                              }}
                            >
                              <span
                                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl"
                                style={{ backgroundColor: withAlpha(meta.accent || '#38bdf8', isFeedbackAction ? '34' : '18') }}
                                aria-hidden="true"
                              />
                              {(isWorking || isFeedbackAction) && (
                                <motion.span
                                  className="pointer-events-none absolute inset-0 opacity-60"
                                  initial={{ opacity: 0.2 }}
                                  animate={{ opacity: [0.18, 0.5, 0.2] }}
                                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                                  style={{
                                    background: `radial-gradient(circle at top, ${withAlpha(meta.accent || '#38bdf8', '22')} 0%, rgba(255,255,255,0) 72%)`
                                  }}
                                  aria-hidden="true"
                                />
                              )}

                              <div className="relative flex items-center gap-3">
                                <span
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white/92 text-2xl shadow-sm"
                                  style={{ boxShadow: `0 10px 24px ${withAlpha(meta.accent || '#38bdf8', '18')}` }}
                                >
                                  {meta.icon}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-black text-slate-800">
                                    {isWorking ? '处理中...' : getPetActionLabel(selectedJourney, action)}
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black shadow-sm ${meta.badgeClass}`}>
                                    -{actionCost} 积分
                                  </span>
                                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black shadow-sm ${
                                    scoreShortage > 0
                                      ? 'bg-rose-100 text-rose-700'
                                      : selectedJourney.is_dormant
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-white/92 text-slate-500'
                                  }`}>
                                    {scoreShortage > 0 ? `差 ${scoreShortage}` : selectedJourney.is_dormant ? '可唤醒' : meta.badge}
                                  </span>
                                </div>
                              </div>
                            </motion.button>
                            <ButtonTooltip text={`${meta.description} ${helperText}`} />
                          </div>
                        );
                      })}
                    </div>

                    {ritualActionButtons.length > 0 && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {ritualActionButtons.map((action) => {
                          const meta = ACTION_META[action];
                          const isFeedbackAction = actionFeedback?.action === action;
                          const isWorking = busyKey === action;
                          const cardClass = action === 'evolve'
                            ? 'from-fuchsia-50 via-white to-pink-50 border-fuchsia-100'
                            : 'from-amber-50 via-white to-orange-50 border-amber-100';

                          return (
                            <div key={action} className="pet-tip-trigger relative">
                              <motion.button
                                type="button"
                                onClick={() => handlePetAction(action)}
                                data-testid={`pet-action-${action}`}
                                title={meta.description}
                                disabled={selectedCollection.length === 0 || Boolean(busyKey)}
                                whileHover={busyKey ? undefined : { y: -3, scale: 1.01 }}
                                whileTap={busyKey ? undefined : { scale: 0.985 }}
                                className={`pet-care-action-card relative overflow-hidden rounded-[24px] border bg-gradient-to-br px-4 py-3.5 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${cardClass} ${
                                  isFeedbackAction ? 'pet-care-action-card-active' : ''
                                }`}
                              >
                                <div className="relative flex items-center gap-3">
                                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white/92 text-2xl shadow-sm">
                                    {meta.icon}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-black text-slate-800">
                                      {isWorking ? '处理中...' : getPetActionLabel(selectedJourney, action)}
                                    </div>
                                  </div>
                                  <span className="rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm">
                                    仪式
                                  </span>
                                </div>
                              </motion.button>
                              <ButtonTooltip text={meta.description} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="relative mt-5">
                    <div className="rounded-[24px] border border-white/80 bg-white/82 px-4 py-4 shadow-sm">
                      <div className="text-sm font-black text-slate-700">点击宠物卡片查看成长档案</div>
                      <p className="mt-2 text-xs leading-6 text-slate-500">具体形态、里程碑和收藏位都放在档案里，这里只保留课堂操作必需信息。</p>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-white/80 bg-white/86 px-3 py-3 text-center shadow-sm">
                        <div className="text-[11px] font-bold tracking-[0.14em] text-slate-500">积分</div>
                        <div className="mt-1 text-lg font-black text-slate-800">{selectedStudent.score || 0}</div>
                      </div>
                      <div className="rounded-2xl border border-white/80 bg-white/86 px-3 py-3 text-center shadow-sm">
                        <div className="text-[11px] font-bold tracking-[0.14em] text-slate-500">成长</div>
                        <div className="mt-1 text-lg font-black" style={{ color: selectedSpotlightAccent }}>
                          {selectedJourney.growth_value}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/80 bg-white/86 px-3 py-3 text-center shadow-sm">
                        <div className="text-[11px] font-bold tracking-[0.14em] text-slate-500">照料</div>
                        <div className="mt-1 text-lg font-black text-emerald-600">{selectedJourney.care_score}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePreviewSelectedStudent}
                    data-testid="pet-center-growth-passport"
                    className="relative mt-5 w-full rounded-[22px] px-4 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5"
                    style={{
                      background: 'linear-gradient(135deg, ' + withAlpha(selectedSpotlightAccent, "24") + ' 0%, rgba(255,255,255,0.95) 100%)',
                      border: '1px solid ' + withAlpha(selectedSpotlightAccent, "30")
                    }}
                  >
                    查看成长档案
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border-2 border-dashed border-cyan-200 bg-white/70 px-6 py-12 text-center text-sm text-slate-500">
                当前班级还没有学生，先去学员管理里添加学生。
              </div>
            )}
          </section>

          <section className="card-game border-pink-200 bg-gradient-to-br from-white via-orange-50/60 to-pink-50/70">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] text-pink-500">宠物图鉴</div>
                <h3 className="mt-2 text-2xl font-black text-slate-800">宠物图鉴与发放</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  先选学生，再点击卡片查看形态与成长档案，确认后即可领取或切换培养。
                </p>
              </div>
              <div className="rounded-[24px] bg-white/85 px-4 py-4 text-sm text-slate-500 shadow-sm">
                当前发放对象：
                <span className="ml-1 font-black text-slate-700">{selectedStudent?.name || '未选择学生'}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4 rounded-[28px] bg-white/75 p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                {FILTERS.map((filter) => {
                  const count = filter.key === 'all' ? pets.length : filterCounts[filter.key] || 0;
                  const isActive = activeFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => {
                        startTransition(() => {
                          setActiveFilter(filter.key);
                        });
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-black transition ${
                        isActive
                          ? 'bg-pink-500 text-white shadow-lg'
                          : 'bg-white text-slate-500 hover:bg-pink-50'
                      }`}
                    >
                      {filter.label} {count}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-2xl border border-pink-100 bg-white px-4 py-3 shadow-sm">
                  <div className="text-[11px] font-bold tracking-[0.18em] text-slate-400">搜索宠物</div>
                  <input
                    value={catalogQuery}
                    onChange={(event) => setCatalogQuery(event.target.value)}
                    placeholder="搜索宠物名称、种类或台词"
                    className="mt-2 w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
                <label className="rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
                  排序方式
                  <select
                    value={catalogSort}
                    onChange={(event) => {
                      startTransition(() => {
                        setCatalogSort(event.target.value);
                      });
                    }}
                    className="mt-2 w-full bg-transparent text-sm font-black text-slate-700 outline-none"
                  >
                    {CATALOG_SORTS.map((sort) => (
                      <option key={sort.key} value={sort.key}>
                        {sort.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6">
              {!catalogReady ? (
                <>
                  <div className="mb-4 flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
                    <span>宠物图鉴加载中，请稍等。</span>
                    <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-500">
                      载入图鉴...
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <CatalogSkeletonCard key={`catalog-skeleton-${index}`} />
                    ))}
                  </div>
                </>
              ) : filteredPets.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredPets.map((pet) => (
                    <PetCatalogCard
                      key={pet.id}
                      pet={pet}
                      ownerCount={ownerCountByPet[pet.id] || 0}
                      selectedStudent={selectedStudent}
                      busy={busyKey.startsWith('claim-')}
                      onClaim={handleClaim}
                      onPreview={handlePreviewCatalogPet}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[32px] border-2 border-dashed border-pink-200 bg-white/70 px-6 py-14 text-center text-sm text-slate-500">
                  没有匹配的宠物结果，换一个关键词或者切换筛选条件试试。
                </div>
              )}
            </div>
          </section>

        </div>

        <div className="space-y-6 xl:sticky xl:top-6 self-start">
          <section className="card-game border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] text-amber-500">待办队列</div>
                <h3 className="mt-2 text-xl font-black text-slate-800">仪式与待办队列</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  这里优先展示待领取、可孵化、可进化的学生，方便老师快速完成课堂节奏推进。
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
                {actionQueue.length} 项
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {actionQueue.length > 0 ? (
                actionQueue.map((entry) => {
                  const status = getRosterStatusMeta(entry.journey);

                  return (
                    <div key={entry.student.id} className="rounded-[24px] bg-white/90 px-4 py-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(String(entry.student.id))}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
                            {entry.student.avatar}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-black text-slate-800">{entry.student.name}</div>
                            <div className="mt-1 truncate text-xs text-slate-500">
                              {entry.journey.name} · {entry.journey.stage_name}
                            </div>
                            <div className="mt-2 text-[11px] leading-5 text-slate-500">{status.detail}</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => previewStudent(entry.student, entry.journey)}
                          className="rounded-full bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-700"
                        >
                          查看
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${status.className}`}>{status.label}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 shadow-sm">
                          积分 {entry.student.score || 0}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[24px] border-2 border-dashed border-amber-200 bg-white/70 px-5 py-10 text-center text-sm text-slate-500">
                  当前没有积压待办，班级宠物节奏很健康。
                </div>
              )}
            </div>
          </section>

          <section className="card-game border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] text-violet-500">班级培养榜</div>
                <h3 className="mt-2 text-xl font-black text-slate-800">班级培养力榜</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  榜单强调激励而不是拉开差距，分数主要来自成长值、照料状态和阶段奖励。
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-600 shadow-sm">
                前 {powerLeaderboard.length} 名
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {powerLeaderboard.map((entry, index) => {
                const powerTone = getPetPowerTone(entry.journey.power_score);

                return (
                  <button
                    key={entry.student.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudentId(String(entry.student.id));
                      previewStudent(entry.student, entry.journey);
                    }}
                    className="w-full rounded-[24px] bg-white/85 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                        #{index + 1}
                      </div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                        <PetArtwork
                          pet={entry.student.pet}
                          journey={entry.journey}
                          className="flex h-12 w-12 items-center justify-center"
                          imageClassName="h-10 w-10"
                          fallbackClassName="text-2xl"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-800">{entry.student.name}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {entry.journey.name} · {entry.journey.stage_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`pet-score-chip ${powerTone.bg} ${powerTone.text}`}>培养力 {entry.journey.power_score}</div>
                        <div className="mt-2 text-[11px] font-bold text-slate-400">{entry.journey.power_label}</div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {powerLeaderboard.length === 0 && (
                <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-white/60 px-6 py-10 text-center text-sm text-slate-500">
                  当前班级还没有可展示的宠物培养数据。
                </div>
              )}
            </div>
          </section>

          <section className="card-game border-slate-200 bg-gradient-to-br from-white to-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] text-slate-400">学员列表</div>
                <h3 className="mt-2 text-xl font-black text-slate-800">学生宠物列表</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">快速切换培养对象，查看谁还在蛋态、谁准备孵化。</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {students.length} 人
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {ROSTER_FILTERS.map((filter) => {
                const isActive = rosterFilter === filter.key;
                const count = rosterCounts[filter.key] || 0;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setRosterFilter(filter.key)}
                    className={`rounded-full px-3 py-2 text-xs font-black transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {filter.label} {count}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 max-h-[720px] space-y-3 overflow-y-auto pr-1">
              {rosterEntries.map((entry) => (
                <StudentRosterCard
                  key={entry.student.id}
                  student={entry.student}
                  journey={entry.journey}
                  selected={String(entry.student.id) === String(selectedStudentId)}
                  onSelect={(id) => setSelectedStudentId(String(id))}
                  onPreview={previewStudent}
                />
              ))}

              {rosterEntries.length === 0 && (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                  当前筛选条件下没有学生。
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      </div>

      <PetProfileModal
        open={Boolean(profileTarget)}
        studentName={profileTarget?.studentName}
        pet={profileTarget?.pet}
        journey={profileTarget?.journey}
        collection={profileTarget?.collection}
        petCapacity={profileTarget?.petCapacity}
        collectionSlotId={profileTarget?.slotId}
        onClose={closeProfile}
      />
      <PetCeremonyOverlay
        ceremony={ceremony}
        onClose={() => setCeremony(null)}
        onContinue={handleCeremonyContinue}
      />
    </>
  );
}
