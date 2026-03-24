import PetIllustration from './PetIllustration';

function EggArtwork({
  accent = '#F59E0B',
  canHatch = false,
  evolved = false,
  className = '',
  imageClassName = ''
}) {
  return (
    <div className={className}>
      <div className={`relative flex items-center justify-center ${imageClassName}`.trim()}>
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

      </div>
    </div>
  );
}

export default function PetArtwork({
  pet,
  journey,
  className = '',
  imageClassName = '',
  fallbackClassName = '',
  previewLevel = null,
  previewSlotState = null,
  previewVisualState = null
}) {
  const accent = journey?.accent || pet?.accent || '#F59E0B';
  const visualState = previewVisualState || journey?.visual_state || 'pet';
  const slotState = previewSlotState || journey?.slot_state || 'hatched';
  const stageLevel = previewLevel ?? journey?.stage_level ?? 1;
  const shouldRenderEgg = !pet || visualState === 'egg';

  if (shouldRenderEgg) {
    return (
      <EggArtwork
        accent={accent}
        canHatch={Boolean(journey?.can_hatch)}
        evolved={slotState === 'evolved'}
        className={className}
        imageClassName={imageClassName}
      />
    );
  }

  return (
    <PetIllustration
      pet={pet}
      className={className}
      imageClassName={imageClassName}
      stageLevel={stageLevel}
      slotState={slotState}
      visualState={visualState}
      fallbackClassName={fallbackClassName}
    />
  );
}
