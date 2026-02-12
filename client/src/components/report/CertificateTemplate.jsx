import { forwardRef } from 'react';
import { CERTIFICATE_TEMPLATES, getRankCertificateStyle, CERTIFICATE_TYPES, ORG_INFO } from '../../utils/certificates';
import { getRank } from '../../utils/ranks';

// 装饰图案组件
const DecorativePattern = ({ pattern }) => {
  const patterns = {
    gold: (
      <>
        <div className="absolute top-3 left-3 w-16 h-16 border-l-4 border-t-4 border-amber-400/60 rounded-tl-lg" />
        <div className="absolute top-3 right-3 w-16 h-16 border-r-4 border-t-4 border-amber-400/60 rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 w-16 h-16 border-l-4 border-b-4 border-amber-400/60 rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 w-16 h-16 border-r-4 border-b-4 border-amber-400/60 rounded-br-lg" />
      </>
    ),
    silver: (
      <>
        <div className="absolute top-3 left-3 w-16 h-16 border-l-4 border-t-4 border-gray-400/60 rounded-tl-lg" />
        <div className="absolute top-3 right-3 w-16 h-16 border-r-4 border-t-4 border-gray-400/60 rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 w-16 h-16 border-l-4 border-b-4 border-gray-400/60 rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 w-16 h-16 border-r-4 border-b-4 border-gray-400/60 rounded-br-lg" />
      </>
    ),
  };
  
  return patterns[pattern] || patterns.gold;
};

// 奖状模板组件
const CertificateTemplate = forwardRef(({ 
  type, 
  recipientName, 
  className: campClassName,
  score,
  teamName,
  date,
  customTitle,
}, ref) => {
  const template = CERTIFICATE_TEMPLATES[type];
  if (!template) return null;

  // 段位奖状特殊处理
  let finalTemplate = { ...template };
  let rankInfo = null;
  
  if (type === CERTIFICATE_TYPES.RANK_CERTIFICATE && score !== undefined) {
    rankInfo = getRank(score);
    const rankStyle = getRankCertificateStyle(rankInfo);
    finalTemplate = {
      ...template,
      ...rankStyle,
      title: rankInfo.name,
      decoration: rankInfo.icon,
      description: `在2025寒假创赛营中通过不懈努力，最终积分${score}分，成功达成`,
    };
  }

  const displayDate = date || new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div 
      ref={ref}
      className={`relative w-[700px] h-[500px] bg-gradient-to-br ${finalTemplate.bgGradient}`}
      style={{ fontFamily: '"Microsoft YaHei", "SimHei", sans-serif' }}
    >
      {/* 外边框 */}
      <div 
        className="absolute inset-3 border-4 rounded-lg"
        style={{ borderColor: finalTemplate.borderColor }}
      />
      
      {/* 内边框 */}
      <div 
        className="absolute inset-5 border-2 rounded-lg"
        style={{ borderColor: `${finalTemplate.borderColor}80` }}
      />

      {/* 角落装饰 */}
      <DecorativePattern pattern={finalTemplate.pattern} />

      {/* 顶部装饰带 */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 rounded-b-full"
        style={{ backgroundColor: finalTemplate.borderColor }}
      />

      {/* 内容区域 */}
      <div className="relative h-full flex flex-col items-center justify-center px-16 py-10 text-center">
        {/* 机构名称 */}
        <div 
          className="text-sm font-bold tracking-widest mb-2 opacity-70"
          style={{ color: finalTemplate.textColor }}
        >
          {ORG_INFO.name}
        </div>

        {/* 顶部图标 */}
        <div className="text-5xl mb-3 drop-shadow-lg">
          {finalTemplate.icon}
        </div>

        {/* 标题 */}
        <h1 
          className="text-4xl font-black mb-1 tracking-wider"
          style={{ color: finalTemplate.accentColor }}
        >
          {customTitle || finalTemplate.title}
        </h1>
        
        <p 
          className="text-base mb-4 opacity-80"
          style={{ color: finalTemplate.textColor }}
        >
          {finalTemplate.subtitle}
        </p>

        {/* 分隔线 */}
        <div 
          className="w-32 h-0.5 mb-4 rounded-full"
          style={{ backgroundColor: finalTemplate.borderColor }}
        />

        {/* 获奖描述 */}
        <p 
          className="text-sm mb-3 max-w-md leading-relaxed opacity-80"
          style={{ color: finalTemplate.textColor }}
        >
          {finalTemplate.description}
        </p>

        {/* 获奖者信息 */}
        <div 
          className="rounded-xl px-10 py-4 mb-4"
          style={{ backgroundColor: `${finalTemplate.borderColor}20` }}
        >
          <p 
            className="text-xs mb-1 opacity-70"
            style={{ color: finalTemplate.textColor }}
          >
            {template.isTeam ? '授予战队' : '授予学员'}
          </p>
          <p 
            className="text-3xl font-black tracking-wide"
            style={{ color: finalTemplate.accentColor }}
          >
            {recipientName || '学员姓名'}
          </p>
          {campClassName && (
            <p 
              className="text-xs mt-1 opacity-70"
              style={{ color: finalTemplate.textColor }}
            >
              {campClassName}
            </p>
          )}
          {teamName && !template.isTeam && (
            <p 
              className="text-xs mt-1 opacity-60"
              style={{ color: finalTemplate.textColor }}
            >
              所属战队：{teamName}
            </p>
          )}
        </div>

        {/* 段位/积分信息 */}
        {type === CERTIFICATE_TYPES.RANK_CERTIFICATE && rankInfo && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{rankInfo.icon}</span>
            <span 
              className="font-bold text-sm"
              style={{ color: finalTemplate.textColor }}
            >
              {rankInfo.name} · {score}分
            </span>
          </div>
        )}

        {/* 底部信息 */}
        <div className="mt-auto flex items-center justify-between w-full px-4">
          <div 
            className="text-xs opacity-60"
            style={{ color: finalTemplate.textColor }}
          >
            {displayDate}
          </div>
          <div 
            className="text-sm font-bold"
            style={{ color: finalTemplate.accentColor }}
          >
            {ORG_INFO.name}
          </div>
        </div>
      </div>

      {/* 底部装饰带 */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: finalTemplate.borderColor }}
      />
    </div>
  );
});

CertificateTemplate.displayName = 'CertificateTemplate';

export default CertificateTemplate;
