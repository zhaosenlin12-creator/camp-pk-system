export default function BrandMark({
  title = '乐享宠物',
  subtitle = '',
  className = '',
  imageClassName = 'h-16 w-16',
  imageWrapperClassName = '',
  titleClassName = 'text-3xl font-black text-slate-900',
  subtitleClassName = 'mt-1 text-sm text-slate-500',
  titleStyle
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className={`overflow-hidden rounded-[28px] bg-white/90 p-2 shadow-lg ring-1 ring-white/70 ${imageWrapperClassName}`}>
        <img
          src="/brand-logo.png"
          alt="乐享宠物"
          className={`block object-contain ${imageClassName}`}
          loading="eager"
          decoding="async"
        />
      </div>

      <div>
        <div className={titleClassName} style={titleStyle}>{title}</div>
        {subtitle ? <div className={subtitleClassName}>{subtitle}</div> : null}
      </div>
    </div>
  );
}
