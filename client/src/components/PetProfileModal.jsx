import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PetArtwork from './PetArtwork';
import { getPetCareItems, getPetPowerTone, getStudentPetJourney, getStudentPetUnlockStatus } from '../utils/petJourney';
import { getPetPreviewStages, getPetVisualMeta } from '../utils/petVisuals';
import { soundManager } from '../utils/sounds';

function MetricCard({ label, value, accent }) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/82 px-4 py-4 text-center shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function HeaderStatPill({ label, value, toneClassName = 'bg-white/88 text-slate-600' }) {
  return (
    <div className={`rounded-[22px] px-4 py-3 shadow-sm ${toneClassName}`}>
      <div className="text-[11px] font-black uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

function getCollectionSpotlightCopy(journey, meta, unlockStatus) {
  if (!journey.claimed) {
    return '先领取第一只宠物，这里就会变成学生自己的完整成长档案。';
  }

  if (journey.can_evolve) {
    return '已经满足进化条件，很适合做一场全班都能看到的高光进化仪式。';
  }

  if (journey.can_hatch) {
    return '孵化条件已经就绪，这个时刻最适合做成全班奖励。';
  }

  if (unlockStatus.progress >= 100 && unlockStatus.nextSlotNumber) {
    return `第 ${unlockStatus.nextSlotNumber} 个收藏位已解锁，可以继续领取新的喜欢宠物。`;
  }

  return meta?.vibe || journey.stage_description;
}

function CollectionShowcaseCard({
  pet,
  journey,
  meta,
  accent,
  currentSlotIndex,
  collectionCount,
  collectionCapacity,
  unlockStatus
}) {
  const powerTone = getPetPowerTone(journey.power_score);
  const spotlightCopy = getCollectionSpotlightCopy(journey, meta, unlockStatus);

  return (
    <div
      className="rounded-[32px] border border-white/70 px-5 py-5 shadow-[0_18px_40px_rgba(35,49,79,0.1)]"
      style={{
        background: `linear-gradient(180deg, ${journey.theme || meta?.theme || '#FFF7ED'} 0%, rgba(255,255,255,0.96) 100%)`
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black tracking-[0.2em] text-slate-400">主角档案</div>
          <div className="mt-2 text-xl font-black text-slate-800">{journey.name}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
              第 {currentSlotIndex} 收藏位
            </span>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-black text-cyan-700 shadow-sm">
              当前培养中
            </span>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black shadow-sm ${powerTone.bg} ${powerTone.text}`}>
          培养力 {journey.power_score}
        </span>
      </div>

      <div className="mt-5 grid items-center gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
        <div className="pet-hero-frame flex h-[120px] w-[120px] items-center justify-center rounded-[32px] bg-white/92">
          <PetArtwork
            pet={pet}
            journey={journey}
            className="flex h-[98px] w-[98px] items-center justify-center"
            imageClassName="h-[84px] w-[84px] object-contain"
            fallbackClassName="text-5xl"
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
              {journey.stage_name}
            </span>
            {meta && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-600 shadow-sm">
                {meta.badge}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{spotlightCopy}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <HeaderStatPill label="收藏" value={`${collectionCount}/${collectionCapacity}`} />
            <HeaderStatPill label="成长" value={journey.growth_value} />
            <HeaderStatPill label="照料" value={journey.care_score} toneClassName={`${powerTone.bg} ${powerTone.text}`} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-black tracking-[0.16em] text-slate-400">
          <span>新宠物位进度</span>
          <span>{unlockStatus.progress}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/90">
          <div
            className="h-2.5 rounded-full transition-all"
            style={{
              width: `${unlockStatus.progress}%`,
              background: `linear-gradient(90deg, ${accent} 0%, #38bdf8 100%)`
            }}
          />
        </div>
      </div>
    </div>
  );
}

function getPreviewHeadline(journey, meta, previewMode, activePreviewLevel) {
  if (previewMode === 'preview') {
    return `${meta?.shortName || journey.name || '课堂伙伴'} 的 Lv.${activePreviewLevel} 预览形态。`;
  }

  if (!journey.claimed) {
    return '当前还没有正式绑定宠物，领取后这里会变成学生自己的成长档案。';
  }

  if (journey.visual_state === 'egg') {
    return '现在还是宠物蛋阶段，学生会对“什么时候破壳”天然更有期待感。';
  }

  if (journey.can_evolve) {
    return '已经具备进化条件，现在最适合安排一场公开的高光仪式。';
  }

  return journey.stage_description;
}

function getStageFocusCopy(journey, previewMode, activePreviewLevel) {
  if (previewMode === 'preview') {
    return `当前查看的是未来预览，学生会更直观地知道继续努力后能长成什么样。Lv.${activePreviewLevel} 越高，仪式感越强。`;
  }

  if (!journey.claimed) {
    return '先去宠物中心为学生绑定一只课堂伙伴，再回来查看完整成长路径。';
  }

  if (journey.visual_state === 'egg') {
    return journey.can_hatch
      ? '已经满足孵化条件，现在就能把“宠物出生”的奖励感做出来。'
      : '优先补课堂积分和照料动作，让宠物蛋尽快来到可以孵化的节点。';
  }

  if (journey.slot_state === 'evolved') {
    return '终阶形态已经解锁，后续重点是维持状态、强化展示和为后面的战斗玩法铺路。';
  }

  return `继续提升成长值和照料评分，就能向下一阶段冲刺。当前成长轨迹已经在稳定成型。`;
}

function buildMilestoneState(journey, previewStages, previewMode, activePreviewLevel) {
  const currentLevel = previewMode === 'preview'
    ? activePreviewLevel
    : journey.visual_state === 'egg'
      ? 0
      : Math.max(1, journey.stage_level || 1);

  return previewStages.map((stage) => ({
    ...stage,
    unlocked: stage.level <= currentLevel,
    active: previewMode === 'preview' ? activePreviewLevel === stage.level : currentLevel === stage.level
  }));
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

function buildPetMilestones(currentCollectionSlot, journey) {
  return [
    {
      key: 'claim',
      label: '领取',
      done: Boolean(currentCollectionSlot?.pet_claimed_at || journey.claimed),
      time: formatMilestoneStamp(currentCollectionSlot?.pet_claimed_at),
      detail: '专属宠物加入收藏架'
    },
    {
      key: 'hatch',
      label: '孵化',
      done: Boolean(currentCollectionSlot?.pet_hatched_at || journey.visual_state === 'pet'),
      time: formatMilestoneStamp(currentCollectionSlot?.pet_hatched_at),
      detail: '宠物正式出生'
    },
    {
      key: 'evolve',
      label: '进化',
      done: Boolean(currentCollectionSlot?.pet_evolved_at || journey.slot_state === 'evolved'),
      time: formatMilestoneStamp(currentCollectionSlot?.pet_evolved_at),
      detail: '进入高阶形态'
    }
  ];
}

export default function PetProfileModal({
  open,
  studentName,
  pet,
  journey: rawJourney,
  collection = [],
  petCapacity = 1,
  collectionSlotId = null,
  onClose
}) {
  const journey = getStudentPetJourney({ pet_journey: rawJourney || {} });
  const meta = getPetVisualMeta(pet);
  const previewStages = useMemo(() => getPetPreviewStages(pet), [pet]);
  const collectionSlots = useMemo(() => (Array.isArray(collection) ? collection : []), [collection]);
  const [activePreviewLevel, setActivePreviewLevel] = useState(1);
  const [previewMode, setPreviewMode] = useState('current');
  const powerTone = getPetPowerTone(journey.power_score);
  const accent = journey.accent || meta?.accent || '#F59E0B';

  useEffect(() => {
    if (!open) return;
    setPreviewMode('current');
    setActivePreviewLevel(Math.max(1, Math.min(5, journey.stage_level || 1)));
  }, [journey.stage_level, open]);

  useEffect(() => {
    if (!open) return undefined;
    soundManager.playPetProfileOpen();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const currentVisualState = previewMode === 'current' ? journey.visual_state : 'pet';
  const currentSlotState =
    previewMode === 'current'
      ? journey.slot_state
      : activePreviewLevel >= 5
        ? 'evolved'
        : 'hatched';
  const currentStageLevel = previewMode === 'current'
    ? Math.max(1, journey.stage_level || 1)
    : activePreviewLevel;
  const displayedStageName =
    previewMode === 'preview'
      ? `Lv.${activePreviewLevel} 预览形态`
      : journey.stage_name;
  const headline = getPreviewHeadline(journey, meta, previewMode, activePreviewLevel);
  const stageFocusCopy = getStageFocusCopy(journey, previewMode, activePreviewLevel);
  const milestoneStages = buildMilestoneState(journey, previewStages, previewMode, activePreviewLevel);
  const currentCollectionSlot = collectionSlots.find((slot) => slot.slot_id === collectionSlotId)
    || collectionSlots.find((slot) => slot.is_active)
    || collectionSlots.find((slot) => slot.pet_id === pet?.id)
    || null;
  const collectionCapacity = Math.max(1, Number(petCapacity) || collectionSlots.length || 1);
  const currentSlotIndex = currentCollectionSlot?.slot_index || 1;
  const shelfSlots = Array.from({ length: collectionCapacity }, (_, index) => collectionSlots[index] || null);
  const unlockStatus = getStudentPetUnlockStatus({
    pet_collection: collectionSlots,
    pet_capacity: collectionCapacity,
    active_pet_slot_id: collectionSlotId
  });
  const milestoneTimeline = buildPetMilestones(currentCollectionSlot, journey);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 18 }}
          transition={{ type: 'spring', stiffness: 240, damping: 24 }}
          data-testid="pet-profile-modal"
          className="max-h-[92vh] w-full max-w-[1180px] overflow-auto rounded-[40px] border border-white/60 bg-[linear-gradient(180deg,#fffaf6_0%,#f4fbff_100%)] p-6 shadow-[0_30px_80px_rgba(35,49,79,0.28)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-sm">
                <span>宠物成长档案</span>
              </div>
              <h3 className="mt-4 text-3xl font-black text-slate-800">{pet?.name || journey.name}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {studentName ? `${studentName} 的课堂搭档。` : '班级宠物成长档案。'}
                {meta ? ` ${meta.vibe}` : ' 领取后会显示完整成长路径。'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {collectionSlots.length > 0 && (
                  <>
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
                      收藏 {collectionSlots.length}/{collectionCapacity}
                    </span>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700 shadow-sm">
                      第 {currentSlotIndex} 收藏位
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black shadow-sm ${
                      currentCollectionSlot?.is_active
                        ? 'bg-cyan-100 text-cyan-700'
                        : 'bg-white text-slate-500'
                    }`}>
                      {currentCollectionSlot?.is_active ? '当前培养中' : '收藏展示中'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm transition hover:bg-slate-50"
            >
              关闭
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-[32px] border border-white/70 bg-white/82 px-5 py-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black text-white">
                  成长档案
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                  {journey.status_label}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                  {journey.stage_name}
                </span>
              </div>

              <p className="mt-4 text-base font-black leading-7 text-slate-800">{headline}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{stageFocusCopy}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <HeaderStatPill label="当前等级" value={`Lv.${Math.max(journey.stage_level || 0, journey.claimed ? 1 : 0)}`} />
                <HeaderStatPill label="培养力" value={journey.power_score} toneClassName={`${powerTone.bg} ${powerTone.text}`} />
                <HeaderStatPill label="成长" value={journey.growth_value} />
                <HeaderStatPill label="照料" value={journey.care_score} />
              </div>

              <div className="mt-5 rounded-[26px] bg-slate-50/90 px-4 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">下一步目标</div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                    {unlockStatus.chip}
                  </span>
                </div>
                <p className="mt-3 text-sm font-black leading-6 text-slate-800">{journey.next_target}</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">{journey.care_tip}</p>
              </div>
            </div>

            <CollectionShowcaseCard
              pet={pet}
              journey={journey}
              meta={meta}
              accent={accent}
              currentSlotIndex={currentSlotIndex}
              collectionCount={collectionSlots.length}
              collectionCapacity={collectionCapacity}
              unlockStatus={unlockStatus}
            />
          </div>

          {collectionSlots.length > 0 && (
            <div className="mt-6 rounded-[30px] border border-white/70 bg-white/78 px-5 py-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-800">宠物收藏架</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">
                    已拥有的伙伴会长期保留，满级后可以继续培养下一只喜欢的宠物。
                  </div>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black text-white">
                  已解锁 {collectionSlots.length}/{collectionCapacity}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {shelfSlots.map((slot, index) => (
                  <div
                    key={slot?.slot_id || `slot-${index + 1}`}
                    className={`rounded-[24px] border px-4 py-4 shadow-sm ${
                      slot
                        ? slot.is_active
                          ? 'border-cyan-200 bg-cyan-50/80'
                          : 'border-white/70 bg-white/90'
                        : 'border-dashed border-slate-200 bg-slate-50/85'
                    }`}
                  >
                    {slot ? (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="pet-hero-frame flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/92">
                            <PetArtwork
                              pet={slot.pet}
                              journey={slot.journey}
                              className="flex h-10 w-10 items-center justify-center"
                              imageClassName="h-8 w-8 object-contain"
                              fallbackClassName="text-xl"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-black text-slate-800">{slot.journey.name}</div>
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm">
                                #{slot.slot_index || index + 1}
                              </span>
                            </div>
                            <div className="mt-2 text-xs font-semibold text-slate-500">
                              {slot.journey.stage_name} · {slot.journey.status_label}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${getPetPowerTone(slot.journey.power_score).bg} ${getPetPowerTone(slot.journey.power_score).text}`}>
                            培养力 {slot.journey.power_score}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                            slot.is_active ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {slot.is_active ? '当前培养位' : '已收藏'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full min-h-[96px] flex-col justify-center">
                        <div className="text-sm font-black text-slate-600">空收藏位 #{index + 1}</div>
                        <div className="mt-2 text-xs leading-5 text-slate-400">
                          解锁后可以继续给学生领取下一只喜欢的宠物。
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[24px] bg-slate-50/90 px-4 py-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold tracking-[0.18em] text-slate-400">下一个收藏位</div>
                    <div className="mt-2 text-base font-black text-slate-800">{unlockStatus.title}</div>
                    <div className="mt-2 text-xs leading-6 text-slate-500">{unlockStatus.detail}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black ${
                    unlockStatus.unlockedAll
                      ? 'bg-slate-900 text-white'
                      : unlockStatus.progress >= 100
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-violet-100 text-violet-700'
                  }`}>
                    {unlockStatus.chip}
                  </span>
                </div>

                <div className="mt-4 h-2.5 rounded-full bg-white">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${unlockStatus.progress}%`,
                      background: unlockStatus.progress >= 100
                        ? 'linear-gradient(90deg, #34d399 0%, #22c55e 100%)'
                        : 'linear-gradient(90deg, #8b5cf6 0%, #38bdf8 100%)'
                    }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black text-slate-500">
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                    进化完成 {unlockStatus.requirementCurrent}/{unlockStatus.requirementTotal}
                  </span>
                  {unlockStatus.nextSlotNumber && (
                    <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                      目标宠物位 #{unlockStatus.nextSlotNumber}
                    </span>
                  )}
                </div>
              </div>

              <div
                className="mt-4 rounded-[24px] border border-white/80 px-4 py-4 text-slate-700 shadow-[0_16px_36px_rgba(59,130,246,0.12)]"
                style={{
                  background: `linear-gradient(145deg, rgba(255,255,255,0.96) 0%, ${journey.theme || meta?.theme || '#FFF7ED'} 100%)`
                }}
              >
                <div className="text-[11px] font-black tracking-[0.18em] text-slate-500">收藏提醒</div>
                <div className="mt-2 text-lg font-black" style={{ color: accent }}>
                  {unlockStatus.unlockedAll
                    ? '收藏位已满，接下来重点是灵活切换当前培养宠物。'
                    : unlockStatus.progress >= 100
                      ? `第 ${unlockStatus.nextSlotNumber || collectionSlots.length + 1} 个收藏位已经解锁`
                      : '继续完成进化，就能解锁新的长期培养位'}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{journey.next_target}</p>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="rounded-[36px] bg-[radial-gradient(circle_at_top,#ffffff_0%,#fff6ec_42%,#eef7ff_100%)] px-6 py-6 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm">
                  <span>{previewMode === 'current' ? '当前状态' : '成长预览'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewMode(previewMode === 'current' ? 'preview' : 'current')}
                  className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm transition hover:bg-slate-50"
                >
                  {previewMode === 'current' ? '查看等级形态' : '回到当前状态'}
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                  {displayedStageName}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
                  {journey.status_label}
                </span>
                {meta && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-600 shadow-sm">
                    {meta.badge}
                  </span>
                )}
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div>
                  <motion.div
                    key={`${currentSlotState}-${currentStageLevel}-${currentVisualState}`}
                    initial={{ opacity: 0, scale: 0.88, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex justify-center"
                  >
                    <PetArtwork
                      pet={pet}
                      journey={journey}
                      previewLevel={currentStageLevel}
                      previewSlotState={currentSlotState}
                      previewVisualState={currentVisualState}
                      className="pet-hero-frame flex h-[300px] w-[300px] items-center justify-center rounded-[44px]"
                      imageClassName="h-[260px] w-[260px]"
                    />
                  </motion.div>

                  <div className="mt-4 flex justify-center">
                    <span className={`rounded-full px-5 py-2 text-sm font-black ${powerTone.bg} ${powerTone.text}`}>
                      {journey.power_label} · 培养力 {journey.power_score}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[30px] border border-white/70 bg-white/82 px-5 py-5 shadow-sm">
                    <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">阶段重点</div>
                    <p className="mt-3 text-base font-black leading-7 text-slate-800">{headline}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{stageFocusCopy}</p>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-black tracking-[0.16em] text-slate-400">
                        <span>阶段进度</span>
                        <span>{journey.progress}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div
                          className="h-2.5 rounded-full transition-all"
                          style={{
                            width: `${journey.progress}%`,
                            background: `linear-gradient(90deg, ${accent} 0%, #38bdf8 100%)`
                          }}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black text-slate-500">
                        <span className="rounded-full bg-slate-50 px-3 py-1 shadow-sm">成长 {journey.growth_value}</span>
                        <span className="rounded-full bg-slate-50 px-3 py-1 shadow-sm">照料 {journey.care_score}</span>
                        <span className="rounded-full bg-slate-50 px-3 py-1 shadow-sm">当前 {journey.status_label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-white/70 bg-white/82 px-5 py-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-black text-slate-700">成长轨迹</div>
                      <div className="text-xs font-bold text-slate-500">
                        {previewMode === 'preview' ? '点击下方卡片切换预览' : '当前已解锁进度'}
                      </div>
                    </div>

                    {previewStages.length > 0 ? (
                      <div className="mt-4 grid grid-cols-5 gap-2">
                        {milestoneStages.map((stage) => (
                          <button
                            key={stage.level}
                            type="button"
                            onClick={() => {
                              setPreviewMode('preview');
                              setActivePreviewLevel(stage.level);
                            }}
                            className={`rounded-[20px] border px-2 py-3 text-center transition ${
                              stage.active
                                ? 'border-pink-300 bg-pink-50 shadow-lg shadow-pink-100'
                                : stage.unlocked
                                  ? 'border-emerald-100 bg-white hover:border-cyan-200'
                                  : 'border-slate-100 bg-slate-50/70 hover:border-cyan-100'
                            }`}
                          >
                            <div className="text-[11px] font-black text-slate-700">{stage.chip}</div>
                            <div className="mt-1 text-[10px] font-bold text-slate-400">{stage.title}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">当前没有可预览的成长形态。</p>
                    )}
                  </div>
                </div>
              </div>

              {previewStages.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-slate-700">点击查看各等级形态</div>
                    <div className="text-xs font-bold text-slate-500">让学生提前看到“养大之后的样子”</div>
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-3">
                    {previewStages.map((stage) => {
                      const active = previewMode === 'preview' && activePreviewLevel === stage.level;

                      return (
                        <button
                          key={stage.level}
                          type="button"
                          onClick={() => {
                            setPreviewMode('preview');
                            setActivePreviewLevel(stage.level);
                          }}
                          className={`rounded-[24px] border bg-white px-3 py-3 text-center transition ${
                            active ? 'border-pink-300 shadow-lg shadow-pink-100' : 'border-slate-100 hover:border-cyan-200'
                          }`}
                        >
                          <PetArtwork
                            pet={pet}
                            journey={journey}
                            previewLevel={stage.level}
                            previewSlotState={stage.level >= 5 ? 'evolved' : 'hatched'}
                            previewVisualState="pet"
                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                            imageClassName="h-14 w-14"
                          />
                          <div className="mt-2 text-xs font-black text-slate-700">{stage.chip}</div>
                          <div className="mt-1 text-[11px] text-slate-400">{stage.title}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-[32px] border border-white/70 bg-white/82 px-5 py-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {journey.stage_name}
                  </span>
                  {meta && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-600">
                      {meta.badge}
                    </span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${powerTone.bg} ${powerTone.text}`}>
                    {journey.power_label}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{headline}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="成长值" value={journey.growth_value} accent={accent} />
                <MetricCard label="照料评分" value={journey.care_score} accent={accent} />
                <MetricCard label="阶段等级" value={`Lv.${Math.max(journey.stage_level || 0, journey.claimed ? 1 : 0)}`} accent={accent} />
                <MetricCard label="培养力" value={journey.power_score} accent={accent} />
              </div>

              <div className="rounded-[32px] border border-white/70 bg-white/82 px-5 py-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-black text-slate-700">成长里程碑</div>
                  <div className="text-xs font-bold text-slate-500">这只宠物的重要时刻会被记录下来</div>
                </div>

                <div className="mt-4 space-y-3">
                  {milestoneTimeline.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 rounded-[22px] bg-slate-50/90 px-4 py-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${
                        item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {item.done ? '✓' : '…'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-black text-slate-800">{item.label}</div>
                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm">
                            {item.time}
                          </span>
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/70 bg-white/82 px-5 py-5 shadow-sm">
                <div className="text-sm font-black text-slate-700">当前状态条</div>
                <div className="mt-4 space-y-3">
                  {getPetCareItems(journey).map((item) => (
                    <div key={item.key}>
                      <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div
                          className="h-2.5 rounded-full transition-all"
                          style={{ width: `${item.value}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/70 bg-white/82 px-5 py-5 shadow-sm">
                <div className="text-sm font-black text-slate-700">下一步目标</div>
                <p className="mt-3 text-sm font-black leading-6 text-slate-800">{journey.next_target}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{journey.care_tip}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
