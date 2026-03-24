import { forwardRef } from 'react';
import { getRank } from '../../utils/ranks';
import { ORG_INFO } from '../../utils/certificates';
import { formatScore } from '../../utils/score';

// 学员结营报告模板
const StudentReport = forwardRef(({ 
  student, 
  className: campClassName,
  photos = [],
  aiComment = '',
  scoreLogs = [],
  teacherName = '老师',
}, ref) => {
  if (!student) return null;

  const rank = getRank(student.score);
  const displayDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // 统计奖励和惩罚
  const rewards = scoreLogs.filter(log => log.delta > 0);
  const penalties = scoreLogs.filter(log => log.delta < 0);
  const totalRewardPoints = rewards.reduce((sum, log) => sum + log.delta, 0);
  const totalPenaltyPoints = Math.abs(penalties.reduce((sum, log) => sum + log.delta, 0));

  return (
    <div 
      ref={ref}
      className="w-[600px] bg-gradient-to-b from-orange-50 via-white to-amber-50"
      style={{ fontFamily: '"Microsoft YaHei", "SimHei", sans-serif' }}
    >
      {/* 头部 */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 text-center">
        <div className="text-sm opacity-80 mb-1">{ORG_INFO.name}</div>
        <h1 className="text-2xl font-black mb-1">🎓 结营报告</h1>
        <p className="text-sm opacity-80">{ORG_INFO.campName}</p>
      </div>

      <div className="p-6">
        {/* 学员信息卡片 */}
        <div className="bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl p-4 mb-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center text-4xl">
              {student.avatar}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black">{student.name}</h2>
              {student.team_name && (
                <p className="text-white/80 text-sm">⚔️ {student.team_name}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl">{rank.icon}</div>
              <div className="text-sm font-bold">{rank.name}</div>
            </div>
          </div>
        </div>

        {/* 积分统计 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl p-3 text-center border border-orange-200">
            <div className="text-2xl font-black text-orange-600">{formatScore(student.score)}</div>
            <div className="text-xs text-orange-500">总积分</div>
          </div>
          <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-xl p-3 text-center border border-green-200">
            <div className="text-2xl font-black text-green-600">+{formatScore(totalRewardPoints)}</div>
            <div className="text-xs text-green-500">获得积分</div>
          </div>
          <div className="bg-gradient-to-br from-red-100 to-red-50 rounded-xl p-3 text-center border border-red-200">
            <div className="text-2xl font-black text-red-600">-{formatScore(totalPenaltyPoints)}</div>
            <div className="text-xs text-red-500">扣除积分</div>
          </div>
        </div>

        {/* 积分记录 */}
        {scoreLogs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              📊 积分明细
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-48 overflow-y-auto shadow-sm">
              {scoreLogs.slice(0, 10).map((log, index) => (
                <div 
                  key={log.id || index}
                  className={`flex items-center justify-between px-3 py-2 text-sm ${
                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={log.delta > 0 ? 'text-green-500' : 'text-red-500'}>
                      {log.delta > 0 ? '🎉' : '😅'}
                    </span>
                    <span className="text-gray-700">{log.reason || '积分变动'}</span>
                  </div>
                  <span className={`font-bold ${log.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {log.delta > 0 ? '+' : ''}{formatScore(log.delta)}
                  </span>
                </div>
              ))}
              {scoreLogs.length > 10 && (
                <div className="text-center text-gray-400 text-xs py-2 bg-gray-50">
                  还有 {scoreLogs.length - 10} 条记录...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 照片墙 */}
        {photos.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              📸 精彩瞬间
            </h3>
            <div className={`grid gap-2 ${
              photos.length === 1 ? 'grid-cols-1' :
              photos.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
            }`}>
              {photos.map((photo, index) => (
                <div 
                  key={photo.id || index}
                  className="aspect-square rounded-lg overflow-hidden shadow-md"
                >
                  <img 
                    src={photo.url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI老师寄语 */}
        {aiComment && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              💌 老师寄语
            </h3>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 shadow-sm">
              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                {aiComment}
              </p>
              <div className="text-right mt-3 text-amber-600 text-sm font-medium">
                —— {teacherName}
              </div>
            </div>
          </div>
        )}

        {/* 底部 */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-lg font-bold text-orange-600 mb-1">{ORG_INFO.name}</p>
          <p className="text-gray-500 text-sm">
            感谢参与{ORG_INFO.campName}，期待下次再见！
          </p>
          <p className="text-gray-400 text-xs mt-2">
            {displayDate}
          </p>
        </div>
      </div>
    </div>
  );
});

StudentReport.displayName = 'StudentReport';

export default StudentReport;
