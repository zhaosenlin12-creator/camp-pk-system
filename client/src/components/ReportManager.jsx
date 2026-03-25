import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { getRank } from '../utils/ranks'
import { formatScore } from '../utils/score'

const MAX_PHOTOS = 9

export default function ReportManager() {
  const {
    currentClass,
    students,
    reports,
    fetchClassReports,
    fetchStudentScoreLogs,
    uploadReportPhotos,
    generateAiComment,
    createReport
  } = useStore()

  const [studentId, setStudentId] = useState('')
  const [teacherName, setTeacherName] = useState('老师')
  const [customPrompt, setCustomPrompt] = useState('')
  const [aiComment, setAiComment] = useState('')
  const [uploadedPhotos, setUploadedPhotos] = useState([])
  const [loadingAi, setLoadingAi] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastLink, setLastLink] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (currentClass) {
      fetchClassReports(currentClass.id)
    }
  }, [currentClass])

  const selectedStudent = useMemo(
    () => students.find(s => s.id === Number(studentId)),
    [students, studentId]
  )

  const buildReportUrl = (shortId) => `${window.location.origin}/report/${shortId}`

  const handleGenerate = async () => {
    if (!selectedStudent) {
      setError('请先选择学员')
      return
    }

    setError('')
    setLoadingAi(true)

    try {
      const scoreLogs = await fetchStudentScoreLogs(selectedStudent.id)
      const rank = getRank(selectedStudent.score)
      const studentInfo = {
        name: selectedStudent.name,
        score: selectedStudent.score,
        rank,
        teamName: selectedStudent.team_name,
        scoreLogs
      }
      const result = await generateAiComment({ studentInfo, customPrompt })
      setAiComment(result.comment || '')
    } catch (err) {
      setError(err.message || 'AI生成失败，请稍后再试')
    } finally {
      setLoadingAi(false)
    }
  }

  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return

    const remain = MAX_PHOTOS - uploadedPhotos.length
    if (remain <= 0) {
      setError('最多上传9张图片')
      return
    }

    const toUpload = files.slice(0, remain)
    if (files.length > remain) {
      setError(`最多上传9张，已自动取前${remain}张`) 
    } else {
      setError('')
    }

    setUploading(true)
    try {
      const result = await uploadReportPhotos(toUpload)
      setUploadedPhotos(prev => [...prev, ...(result.photos || [])].slice(0, MAX_PHOTOS))
    } catch (err) {
      setError(err.message || '图片上传失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    await handleUploadFiles(files)
  }

  const movePhoto = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= uploadedPhotos.length) return
    setUploadedPhotos(prev => {
      const arr = [...prev]
      const tmp = arr[index]
      arr[index] = arr[target]
      arr[target] = tmp
      return arr
    })
  }

  const removePhoto = (index) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!selectedStudent) {
      setError('请先选择学员')
      return
    }
    if (!aiComment.trim()) {
      setError('请先生成或填写老师寄语')
      return
    }

    setError('')
    setSaving(true)

    try {
      const result = await createReport({
        student_id: selectedStudent.id,
        class_id: currentClass.id,
        photos: uploadedPhotos,
        ai_comment: aiComment.trim(),
        teacher_name: teacherName.trim() || '老师',
        traits: {}
      })

      const link = buildReportUrl(result.id)
      setLastLink(link)
      await fetchClassReports(currentClass.id)
    } catch (err) {
      setError(err.message || '保存报告失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-medium">
          {error}
        </div>
      )}

      <div className="card-game bg-gradient-to-br from-cyan-50 to-blue-50">
        <h3 className="text-xl font-black text-gray-800 mb-4">📄 结营报告生成</h3>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">学员</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300"
            >
              <option value="">请选择学员</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.avatar} {s.name}（{formatScore(s.score)}分）
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">老师署名</label>
            <input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300"
              placeholder="例如：森林老师"
            />
          </div>
        </div>

        {selectedStudent && (
          <div className="mb-4 p-3 rounded-xl bg-white border border-gray-100 text-sm text-gray-600">
            当前学员：<span className="font-bold text-gray-800">{selectedStudent.name}</span>
            {selectedStudent.team_name ? ` · 战队：${selectedStudent.team_name}` : ''}
            {` · 积分：${formatScore(selectedStudent.score)}`}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">AI寄语附加要求（可选）</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-gray-300"
            placeholder="例如：突出团队合作，语气更活泼"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">老师寄语</label>
          <textarea
            value={aiComment}
            onChange={(e) => setAiComment(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 rounded-xl border border-gray-300"
            placeholder="可点击“AI生成寄语”，也可以手动编辑"
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-gray-600">上传照片（最多9张）</label>
            <span className="text-xs text-gray-500">{uploadedPhotos.length}/{MAX_PHOTOS}</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onFileChange}
            disabled={uploading || uploadedPhotos.length >= MAX_PHOTOS}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
          />
          {uploading && <p className="text-sm text-cyan-600 mt-2">图片上传中...</p>}

          {uploadedPhotos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {uploadedPhotos.map((url, index) => (
                <div key={`${url}-${index}`} className="rounded-xl border border-gray-200 bg-white p-2">
                  <img
                    src={url}
                    alt={`上传图${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => movePhoto(index, -1)}
                        className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        title="上移"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 1)}
                        className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        title="下移"
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={loadingAi || !selectedStudent}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold disabled:opacity-50"
          >
            {loadingAi ? 'AI生成中...' : '🤖 AI生成寄语'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedStudent}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold disabled:opacity-50"
          >
            {saving ? '保存中...' : '💾 保存报告'}
          </button>
        </div>

        {lastLink && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-xl bg-green-50 border border-green-200"
          >
            <div className="text-green-700 font-medium mb-2">✅ 报告已生成</div>
            <div className="text-sm break-all text-green-800">{lastLink}</div>
            <button
              className="mt-2 text-sm text-green-700 underline"
              onClick={() => navigator.clipboard?.writeText(lastLink)}
            >
              复制链接
            </button>
          </motion.div>
        )}
      </div>

      <div className="card-game">
        <h3 className="text-lg font-bold text-gray-800 mb-3">🗂️ 已生成报告</h3>
        {reports.length === 0 ? (
          <p className="text-gray-400">当前班级还没有报告</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {reports.map(item => {
              const link = buildReportUrl(item.short_id)
              return (
                <div key={item.short_id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-800">{item.student_avatar} {item.student_name}</div>
                    <div className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                  <a className="text-sm text-cyan-600 hover:text-cyan-700 font-bold" href={link} target="_blank" rel="noreferrer">
                    打开报告
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
