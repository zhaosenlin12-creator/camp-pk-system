import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import CertificateTemplate from './CertificateTemplate';
import { CERTIFICATE_TEMPLATES, getStudentCertificateTypes, getTeamCertificateTypes, CERTIFICATE_TYPES } from '../../utils/certificates';
import { useStore } from '../../store/useStore';
import { formatScore } from '../../utils/score';

export default function CertificateManager() {
  const { students, teams, currentClass } = useStore();
  const [selectedType, setSelectedType] = useState(CERTIFICATE_TYPES.FIRST_PRIZE);
  const [targetType, setTargetType] = useState('student'); // 'student' | 'team'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const certificateRef = useRef(null);

  const studentCertTypes = getStudentCertificateTypes();
  const teamCertTypes = getTeamCertificateTypes();

  // 导出为图片 - 优化性能
  const handleExport = useCallback(async () => {
    if (!certificateRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const dataUrl = canvas.toDataURL('image/png');
      
      // 下载图片
      const link = document.createElement('a');
      const recipient = targetType === 'student' ? selectedStudent?.name : selectedTeam?.name;
      link.download = `奖状_${recipient}_${CERTIFICATE_TEMPLATES[selectedType]?.name}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [selectedType, selectedStudent, selectedTeam, targetType]);

  // 生成预览
  const handlePreview = () => {
    if (targetType === 'student' && !selectedStudent) {
      alert('请先选择学员');
      return;
    }
    if (targetType === 'team' && !selectedTeam) {
      alert('请先选择战队');
      return;
    }
    setShowPreview(true);
  };

  const currentCertTypes = targetType === 'student' ? studentCertTypes : teamCertTypes;

  return (
    <div className="card-game">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        🏆 奖状生成器
      </h3>

      {/* 目标类型选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">选择类型</label>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setTargetType('student');
              setSelectedType(CERTIFICATE_TYPES.FIRST_PRIZE);
              setSelectedTeam(null);
            }}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              targetType === 'student'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            👤 学员奖状
          </button>
          <button
            onClick={() => {
              setTargetType('team');
              setSelectedType(CERTIFICATE_TYPES.BEST_TEAM);
              setSelectedStudent(null);
            }}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              targetType === 'team'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⚔️ 战队奖状
          </button>
        </div>
      </div>

      {/* 选择获奖者 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {targetType === 'student' ? '选择学员' : '选择战队'}
        </label>
        {targetType === 'student' ? (
          <select
            value={selectedStudent?.id || ''}
            onChange={(e) => {
              const student = students.find(s => s.id === parseInt(e.target.value));
              setSelectedStudent(student || null);
            }}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 outline-none"
          >
            <option value="">-- 请选择学员 --</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>
                {student.avatar} {student.name} ({formatScore(student.score)}分)
                {student.team_name && ` - ${student.team_name}`}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={selectedTeam?.id || ''}
            onChange={(e) => {
              const team = teams.find(t => t.id === parseInt(e.target.value));
              setSelectedTeam(team || null);
            }}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 outline-none"
          >
            <option value="">-- 请选择战队 --</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                ⚔️ {team.name} ({formatScore(team.score)}分)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 奖状类型选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">选择奖状类型</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {currentCertTypes.map(cert => (
            <motion.button
              key={cert.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedType(cert.id)}
              className={`p-3 rounded-xl border-2 transition-all text-left ${
                selectedType === cert.id
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{cert.icon}</div>
              <div className="font-bold text-gray-800 text-sm">{cert.name}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePreview}
          className="flex-1 btn-game btn-orange"
        >
          👁️ 预览奖状
        </motion.button>
      </div>

      {/* 预览弹窗 */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">奖状预览</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* 奖状预览 */}
              <div className="flex justify-center mb-6 overflow-auto">
                <CertificateTemplate
                  ref={certificateRef}
                  type={selectedType}
                  recipientName={targetType === 'student' ? selectedStudent?.name : selectedTeam?.name}
                  className={currentClass?.name}
                  score={targetType === 'student' ? selectedStudent?.score : selectedTeam?.score}
                  teamName={targetType === 'student' ? selectedStudent?.team_name : null}
                />
              </div>

              {/* 导出按钮 */}
              <div className="flex justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExport}
                  disabled={isExporting}
                  className="btn-game btn-success px-8"
                >
                  {isExporting ? '⏳ 导出中...' : '📥 下载奖状'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowPreview(false)}
                  className="btn-game bg-gray-200 text-gray-700 hover:bg-gray-300 px-8"
                >
                  关闭
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
