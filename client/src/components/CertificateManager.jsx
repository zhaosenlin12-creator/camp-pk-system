import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { formatScore } from '../utils/score'

export default function CertificateManager() {
  const {
    currentClass,
    students,
    certificates,
    fetchClassCertificates,
    createCertificate
  } = useStore()

  const [studentId, setStudentId] = useState('')
  const [title, setTitle] = useState('优秀学员奖状')
  const [subtitle, setSubtitle] = useState('在创赛营中表现优异，特发此状以资鼓励。')
  const [teacherName, setTeacherName] = useState('老师')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastLink, setLastLink] = useState('')

  useEffect(() => {
    if (currentClass) {
      fetchClassCertificates(currentClass.id)
    }
  }, [currentClass])

  const selectedStudent = useMemo(
    () => students.find(s => s.id === Number(studentId)),
    [students, studentId]
  )

  const buildLink = (shortId) => `${window.location.origin}/certificate/${shortId}`

  const handleCreate = async () => {
    if (!selectedStudent) {
      setError('请先选择学员')
      return
    }

    setError('')
    setSaving(true)

    try {
      const result = await createCertificate({
        student_id: selectedStudent.id,
        class_id: currentClass.id,
        title,
        subtitle,
        teacher_name: teacherName
      })
      const link = buildLink(result.id)
      setLastLink(link)
      await fetchClassCertificates(currentClass.id)
    } catch (err) {
      setError(err.message || '生成奖状失败')
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

      <div className="card-game bg-gradient-to-br from-yellow-50 to-amber-50">
        <h3 className="text-xl font-black text-gray-800 mb-4">🏅 奖状生成与导出</h3>

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
            <label className="block text-sm text-gray-600 mb-1">颁发人</label>
            <input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300"
              placeholder="例如：森林老师"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">奖状标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-300"
            placeholder="例如：编程之星奖状"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">奖状寄语</label>
          <textarea
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-gray-300"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={!selectedStudent || saving}
          className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold disabled:opacity-50"
        >
          {saving ? '生成中...' : '生成奖状'}
        </button>

        {lastLink && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-xl bg-green-50 border border-green-200"
          >
            <div className="text-green-700 font-medium mb-2">✅ 奖状已生成</div>
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
        <h3 className="text-lg font-bold text-gray-800 mb-3">🗂️ 已生成奖状</h3>
        {certificates.length === 0 ? (
          <p className="text-gray-400">当前班级还没有奖状</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {certificates.map(item => {
              const link = buildLink(item.short_id)
              return (
                <div key={item.short_id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-800">{item.student_avatar} {item.student_name}</div>
                    <div className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                  <a className="text-sm text-amber-600 hover:text-amber-700 font-bold" href={link} target="_blank" rel="noreferrer">
                    打开奖状
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
