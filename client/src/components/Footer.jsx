import { ORG_INFO } from '../utils/certificates';

// 备案信息底部组件
export default function Footer({ className = '' }) {
  return (
    <div className={`text-center py-3 ${className}`}>
      <p className="text-gray-400 text-xs">
        {ORG_INFO.name}
      </p>
      <p className="text-gray-400 text-xs mt-1">
        <a 
          href={ORG_INFO.icpUrl}
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-gray-500 transition-colors"
        >
          {ORG_INFO.icp}
        </a>
      </p>
    </div>
  );
}
