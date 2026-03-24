import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { useStore } from '../store/useStore'
import { formatScore } from '../utils/score'

export default function ReportPage() {
  const { shortId, reportId } = useParams()
  const { getReportByShortId } = useStore()

  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const reportRef = useRef(null)

  useEffect(() => {
    const id = shortId || reportId
    if (!id) {
      setError('报告ID无效')
      setLoading(false)
      return
    }

    let active = true
    ;(async () => {
      try {
        const data = await getReportByShortId(id)
        if (active) {
          setReport(data)
          setError('')
        }
      } catch (err) {
        if (active) setError(err.message || '报告加载失败')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [shortId, reportId])

  const handleExportImage = async () => {
    if (!reportRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY
      })
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = url
      link.download = `${report?.student_name || '学员'}-结营报告.png`
      link.click()
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-2xl font-bold">
        报告加载中...
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card-game max-w-xl w-full text-center">
          <div className="text-5xl mb-3">😢</div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">报告暂不可用</h1>
          <p className="text-gray-500">{error || '未找到报告'}</p>
          <Link to="/" className="inline-block mt-4 text-cyan-600 font-bold">返回首页</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleExportImage}
            disabled={exporting}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold disabled:opacity-50"
          >
            {exporting ? '导出中...' : '🖼️ 导出报告图片'}
          </button>
        </div>

        <div ref={reportRef} className="space-y-6 bg-white rounded-2xl p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-game bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-800">📘 结营成长报告</h1>
                <p className="text-gray-500 mt-1">{report.class_name || ''}</p>
              </div>
              <div className="text-sm text-gray-500">
                生成时间：{new Date(report.created_at).toLocaleString()}
              </div>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-white border border-gray-100 flex items-center gap-4">
              <div className="text-5xl">{report.student_avatar || '🎓'}</div>
              <div className="flex-1">
                <div className="text-2xl font-black text-gray-800">{report.student_name}</div>
                <div className="text-gray-500 mt-1">
                  {report.team_name ? `战队：${report.team_name} · ` : ''}
                  当前积分：{formatScore(report.student_score)}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="card-game">
            <h2 className="text-xl font-black text-gray-800 mb-3">💌 老师寄语</h2>
            <div className="whitespace-pre-wrap leading-7 text-gray-700">{report.ai_comment || '暂无寄语'}</div>
            <div className="mt-4 text-right text-gray-500">—— {report.teacher_name || '老师'}</div>
          </div>

          {Array.isArray(report.photos) && report.photos.length > 0 && (
            <div className="card-game">
              <h2 className="text-xl font-black text-gray-800 mb-3">📸 学习瞬间</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.photos.map((photo, idx) => (
                  <img
                    key={`${photo}-${idx}`}
                    src={photo}
                    alt={`photo-${idx}`}
                    className="w-full h-48 object-cover rounded-xl border border-gray-100"
                  />
                ))}
              </div>
            </div>
          )}

          {Array.isArray(report.score_logs) && report.score_logs.length > 0 && (
            <div className="card-game">
              <h2 className="text-xl font-black text-gray-800 mb-3">📈 近期积分记录</h2>
              <div className="space-y-2">
                {report.score_logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-700">{log.reason || '课堂表现'}</div>
                      <div className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</div>
                    </div>
                    <div className={`font-black text-lg ${Number(log.delta) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {Number(log.delta) >= 0 ? '+' : ''}{formatScore(log.delta)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
