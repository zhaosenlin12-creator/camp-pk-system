import { memo, useEffect, useMemo, useState } from 'react';
import { getPetStageArtwork, getPetVisualMeta } from '../utils/petVisuals';

function FallbackGlyph({ pet, meta, fallbackClassName = '' }) {
  return (
    <div
      className={`pet-stage-fallback flex h-full w-full items-center justify-center rounded-[30%] ${fallbackClassName}`.trim()}
      style={{
        background: `radial-gradient(circle at 30% 18%, rgba(255,255,255,0.98), ${meta?.theme || '#FFF7ED'} 56%, ${meta?.accent || '#F59E0B'}22 100%)`,
        color: meta?.accent || '#F59E0B'
      }}
      aria-hidden="true"
    >
      <span className="text-[min(42%,5rem)] leading-none">{pet?.emoji || meta?.emoji || '🐾'}</span>
    </div>
  );
}

function PetIllustration({
  pet,
  className = '',
  imageClassName = '',
  fallbackClassName = '',
  stageLevel = 1,
  slotState = 'hatched',
  visualState = 'pet',
  priority = false,
  loadingStrategy = 'lazy',
  idleMotion = 'none'
}) {
  const meta = getPetVisualMeta(pet);
  const stageArtwork = useMemo(
    () => getPetStageArtwork(pet, { stageLevel, slotState, visualState }),
    [pet, slotState, stageLevel, visualState]
  );
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [stageArtwork?.src]);

  if (visualState === 'egg') return null;

  const motionClassName = idleMotion === 'float'
    ? 'pet-illustration-motion-float'
    : idleMotion === 'soft'
      ? 'pet-illustration-motion-soft'
      : 'pet-illustration-static';

  return (
    <div className={className}>
      {stageArtwork?.src && !imageFailed ? (
        <img
          src={stageArtwork.src}
          alt={stageArtwork.alt}
          loading={priority ? 'eager' : loadingStrategy}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          draggable="false"
          className={`pet-illustration pet-stage-image ${motionClassName} ${imageClassName}`.trim()}
          onError={() => setImageFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <FallbackGlyph
          pet={pet}
          meta={meta}
          fallbackClassName={`${imageClassName} ${fallbackClassName}`.trim()}
        />
      )}
    </div>
  );
}

function arePetIllustrationPropsEqual(prevProps, nextProps) {
  return (
    prevProps.pet?.id === nextProps.pet?.id
    && prevProps.pet?.assetKey === nextProps.pet?.assetKey
    && prevProps.className === nextProps.className
    && prevProps.imageClassName === nextProps.imageClassName
    && prevProps.fallbackClassName === nextProps.fallbackClassName
    && prevProps.stageLevel === nextProps.stageLevel
    && prevProps.slotState === nextProps.slotState
    && prevProps.visualState === nextProps.visualState
    && prevProps.priority === nextProps.priority
    && prevProps.loadingStrategy === nextProps.loadingStrategy
    && prevProps.idleMotion === nextProps.idleMotion
  );
}

export default memo(PetIllustration, arePetIllustrationPropsEqual);
