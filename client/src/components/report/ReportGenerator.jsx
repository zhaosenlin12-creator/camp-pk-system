import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { useStore } from '../../store/useStore';
import { getRank } from '../../utils/ranks';
import { STUDENT_TRAITS } from '../../utils/certificates';
import { formatScore } from '../../utils/score';
import StudentReport from './StudentReport';

export default function ReportGenerator() {
  const { students, teams, currentClass } = useStore();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [aiComment, setAiComment] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [scoreLogs, setScoreLogs] = useState([]);
  const [reportId, setReportId] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teacherName, setTeacherName] = useState('老师');
  
  // 学生表现选项
  const [selectedTraits, setSelectedTraits] = useState({
    learning: '',
    teamwork: '',
    creativity: '',
    personality: '',
  });
  
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  // 获取学员积分记录
  useEffect(() => {
    if (selectedStudent && currentClass) {
      fetchStudentScoreLogs(selectedStudent.id);
    }
  }, [selectedStudent, currentClass]);

  const fetchStudentScoreLogs = async (studentId) => {
    try {
      const res = await fetch(`/api/students/${studentId}/score-logs`);
      if (res.ok) {
        const logs = await res.json();
        setScoreLogs(logs);
      }
    } catch (err) {
      console.error('获取积分记录失败:', err);
      setScoreLogs([]);
    }
  };

  // 处理照片上传
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > 9) {
      alert('最多上传9张照片');
      return;
    }

    files.forEach(file => {
      // 压缩图片以提高性能
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 800;
          let { width, height } = img;
          
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPhotos(prev => [...prev, {
            id: Date.now() + Math.random(),
            url: compressedUrl,
            name: file.name
          }]);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // 删除照片
  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // 构建AI提示词
  const buildAIPrompt = () => {
    const traits = [];
    Object.entries(selectedTraits).forEach(([key, value]) => {
      if (value) {
        const category = STUDENT_TRAITS[key];
        const option = category.options.find(o => o.value === value);
        if (option) {
          traits.push(`${category.label}：${option.label}（${option.desc}）`);
        }
      }
    });
    
    let prompt = '';
    if (traits.length > 0) {
      prompt = `学生的表现特点：\n${traits.join('\n')}\n\n`;
    }
    if (customPrompt) {
      prompt += `老师的额外要求：${customPrompt}`;
    }
    return prompt;
  };

  // AI生成寄语
  const generateAIComment = async () => {
    if (!selectedStudent) {
      alert('请先选择学员');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const studentInfo = {
        name: selectedStudent.name,
        score: selectedStudent.score,
        rank: getRank(selectedStudent.score),
        teamName: selectedStudent.team_name,
        scoreLogs: scoreLogs.slice(0, 20),
      };

      const res = await fetch('/api/ai/generate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentInfo,
          customPrompt: buildAIPrompt() || '请根据学员的表现生成一段温馨、鼓励的老师寄语，约100-150字。'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiComment(data.comment);
      } else {
        const error = await res.json();
        alert(error.error || 'AI生成失败，请重试');
      }
    } catch (err) {
      console.error('AI生成失败:', err);
      alert('AI生成失败，请检查网络连接');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // 保存报告并生成分享链接
  const saveAndShare = async () => {
    if (!selectedStudent) {
      alert('请先选择学员');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          class_id: currentClass.id,
          photos: photos.map(p => p.url),
          ai_comment: aiComment,
          traits: selectedTraits,
          teacher_name: teacherName,
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReportId(data.id);
        const url = `${window.location.origin}/report/view/${data.id}`;
        setShareUrl(url);
        setShowShareModal(true);
      } else {
        alert('保存失败，请重试');
      }
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请检查网络');
    } finally {
      setIsSaving(false);
    }
  };

  // 复制链接 - 兼容性处理
  const copyShareUrl = async () => {
    try {
      // 优先使用现代API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        alert('链接已复制！');
      } else {
        // 降级方案：使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          alert('链接已复制！');
        } else {
          alert('复制失败，请手动复制链接');
        }
      }
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制链接');
    }
  };

  // 导出报告为图片（优化性能）
  const handleExport = useCallback(async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const dataUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.download = `结营报告_${selectedStudent?.name}_${currentClass?.name}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [selectedStudent, currentClass]);

  // 预览报告
  const handlePreview = () => {
    if (!selectedStudent) {
      alert('请先选择学员');
      return;
    }
    setShowPreview(true);
  };

  // 更新表现选项
  const updateTrait = (category, value) => {
    setSelectedTraits(prev => ({
      ...prev,
      [category]: prev[category] === value ? '' : value
    }));
  };

  return (
    <div className="space-y-6">
      {/* 学员选择 */}
      <div className="card-game">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          📄 生成结营报告
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">选择学员</label>
          <select
            value={selectedStudent?.id || ''}
            onChange={(e) => {
              const student = students.find(s => s.id === parseInt(e.target.value));
              setSelectedStudent(student || null);
              setAiComment('');
              setPhotos([]);
              setSelectedTraits({ learning: '', teamwork: '', creativity: '', personality: '' });
              setReportId(null);
              setShareUrl('');
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
        </div>

        {selectedStudent && (
          <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{selectedStudent.avatar}</div>
              <div>
                <div className="font-bold text-lg text-gray-800">{selectedStudent.name}</div>
                <div className="text-sm text-gray-600">
                  {selectedStudent.team_name && `${selectedStudent.team_name} · `}
                  {getRank(selectedStudent.score).icon} {getRank(selectedStudent.score).name}
                </div>
                <div className="text-orange-600 font-bold">总积分：{formatScore(selectedStudent.score)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 照片上传 */}
      {selectedStudent && (
        <div className="card-game">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📸 营期照片（最多9张）</h3>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            {photos.map(photo => (
              <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group">
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
            
            {photos.length < 9 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 flex flex-col items-center justify-center text-gray-400 hover:text-orange-500 transition-colors"
              >
                <span className="text-3xl">+</span>
                <span className="text-xs">添加照片</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>
      )}

      {/* 学生表现选项 */}
      {selectedStudent && (
        <div className="card-game">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🌟 学生表现（选择后AI寄语更精准）</h3>
          
          <div className="space-y-4">
            {Object.entries(STUDENT_TRAITS).map(([key, category]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {category.label}
                </label>
                <div className="flex flex-wrap gap-2">
                  {category.options.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateTrait(key, option.value)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        selectedTraits[key] === option.value
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={option.desc}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI寄语生成 */}
      {selectedStudent && (
        <div className="card-game">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🤖 AI老师寄语</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              补充说明（可选）
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="例如：请重点表扬该学员的进步，语气活泼一些..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 outline-none resize-none"
              rows={2}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateAIComment}
            disabled={isGeneratingAI}
            className="w-full btn-game btn-purple mb-4"
          >
            {isGeneratingAI ? '⏳ AI生成中...' : '✨ 生成AI寄语'}
          </motion.button>

          {aiComment && (
            <div className="p-4 bg-purple-50 rounded-xl">
              <div className="text-sm text-purple-600 font-medium mb-2">老师寄语：</div>
              <textarea
                value={aiComment}
                onChange={(e) => setAiComment(e.target.value)}
                className="w-full p-3 rounded-lg border border-purple-200 focus:border-purple-400 outline-none resize-none text-gray-700"
                rows={4}
              />
              <p className="text-xs text-gray-400 mt-2">* 可以手动编辑修改</p>
              
              {/* 老师署名 */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-gray-600">署名：</span>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="老师名字"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-400 outline-none text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      {selectedStudent && (
        <div className="card-game">
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePreview}
              className="flex-1 btn-game btn-orange"
            >
              👁️ 预览报告
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveAndShare}
              disabled={isSaving}
              className="flex-1 btn-game btn-success"
            >
              {isSaving ? '⏳ 保存中...' : '🔗 生成分享链接'}
            </motion.button>
          </div>
        </div>
      )}

      {/* 预览弹窗 */}
      <AnimatePresence>
        {showPreview && selectedStudent && (
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
                <h3 className="text-xl font-bold text-gray-800">报告预览</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* 报告预览 */}
              <div className="flex justify-center mb-6 overflow-auto">
                <StudentReport
                  ref={reportRef}
                  student={selectedStudent}
                  className={currentClass?.name}
                  photos={photos}
                  aiComment={aiComment}
                  scoreLogs={scoreLogs}
                  teacherName={teacherName}
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
                  {isExporting ? '⏳ 导出中...' : '📥 下载报告'}
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

      {/* 分享链接弹窗 */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">报告已生成！</h3>
                <p className="text-gray-600 text-sm mb-4">
                  分享链接给家长，即可在线查看结营报告
                </p>
                
                <div className="bg-gray-100 rounded-xl p-3 mb-4">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="w-full bg-transparent text-center text-sm text-gray-700 outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={copyShareUrl}
                    className="flex-1 btn-game btn-orange"
                  >
                    📋 复制链接
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 btn-game bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    关闭
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
