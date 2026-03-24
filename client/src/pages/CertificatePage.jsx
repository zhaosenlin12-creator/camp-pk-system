import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { useStore } from '../store/useStore'
import { formatScore } from '../utils/score'

export default function CertificatePage() {
  const { shortId } = useParams()
  const { getCertificateByShortId } = useStore()

  const [certificate, setCertificate] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const certRef = useRef(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await getCertificateByShortId(shortId)
        if (active) {
          setCertificate(data)
          setError('')
        }
      } catch (err) {
        if (active) setError(err.message || '奖状加载失败')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [shortId])

  const handleExportImage = async () => {
    if (!certRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fffaf0'
      })
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = url
      link.download = `${certificate?.student_name || '学员'}-奖状.png`
      link.click()
    } catch (err) {
      console.error(err)
      alert('导出失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white text-2xl font-bold">奖状加载中...</div>

  if (error || !certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card-game max-w-xl w-full text-center">
          <div className="text-5xl mb-3">😢</div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">奖状暂不可用</h1>
          <p className="text-gray-500">{error || '未找到奖状'}</p>
          <Link to="/" className="inline-block mt-4 text-cyan-600 font-bold">返回首页</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex justify-end">
          <button
            onClick={handleExportImage}
            disabled={exporting}
            className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold disabled:opacity-50"
          >
            {exporting ? '导出中...' : '🖼️ 导出奖状图片'}
          </button>
        </div>

        <div ref={certRef} className="bg-amber-50 rounded-3xl p-4 md:p-8 border-8 border-yellow-400 shadow-2xl">
          <div className="bg-white rounded-2xl border-2 border-yellow-200 p-6 md:p-10 text-center">
            <div className="text-5xl mb-3">🏅</div>
            <h1 className="text-4xl font-black text-amber-700 mb-2">{certificate.title || '优秀学员奖状'}</h1>
            <p className="text-gray-500 mb-6">{certificate.class_name}</p>

            <div className="text-2xl text-gray-700 mb-2">兹颁发给</div>
            <div className="text-5xl font-black text-gray-800 mb-4">{certificate.student_avatar} {certificate.student_name}</div>

            <div className="text-lg text-gray-700 leading-8 max-w-3xl mx-auto">
              {certificate.subtitle || '在创赛营中表现优异，特发此状以资鼓励。'}
            </div>

            <div className="mt-6 text-gray-600">
              {certificate.team_name ? `所属战队：${certificate.team_name} · ` : ''}
              当前积分：{formatScore(certificate.student_score)}
            </div>

            <div className="mt-10 flex items-end justify-between">
              <div className="text-left">
                <div className="text-sm text-gray-400">颁发日期</div>
                <div className="font-bold text-gray-700">{new Date(certificate.issued_at || certificate.created_at).toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">颁发人</div>
                <div className="font-bold text-gray-700">{certificate.teacher_name || '老师'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
