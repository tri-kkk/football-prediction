'use client'
import { useState, useEffect } from 'react'

interface Notice {
  id: number
  message: string
  message_en: string | null
  is_active: boolean
  display_order: number
  start_at: string | null
  end_at: string | null
}

interface NoticeBannerProps {
  lang?: 'ko' | 'en'
  darkMode?: boolean
}

export default function NoticeBanner({ lang = 'ko', darkMode = true }: NoticeBannerProps) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [animState, setAnimState] = useState<'idle' | 'exit' | 'enter'>('idle')
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 이미 닫은 적 있으면 표시 안 함
    const alreadySeen = sessionStorage.getItem('notice_dismissed')
    if (alreadySeen) {
      setDismissed(true)
      return
    }

    fetch('/api/admin/notices')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const now = new Date()
        const filtered = data.filter(n => {
          if (!n.is_active) return false
          if (n.start_at && new Date(n.start_at) > now) return false
          if (n.end_at && new Date(n.end_at) < now) return false
          return true
        })
        setNotices(filtered)
        if (filtered.length > 0) {
          setTimeout(() => setVisible(true), 1000)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (notices.length <= 1) return
    const timer = setInterval(() => {
      setAnimState('exit')
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % notices.length)
        setAnimState('enter')
      }, 300)
    }, 5000)
    return () => clearInterval(timer)
  }, [notices.length])

  useEffect(() => {
    if (animState !== 'enter') return
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimState('idle'))
    })
    return () => cancelAnimationFrame(raf)
  }, [animState])

  const handleDismiss = () => {
    sessionStorage.setItem('notice_dismissed', '1')
    setVisible(false)
    setTimeout(() => setDismissed(true), 400)
  }

  if (dismissed || notices.length === 0) return null

  const current = notices[currentIndex]
  const text = (lang === 'en' && current.message_en) ? current.message_en : current.message

  return (
    <div style={{
      position: 'fixed',
      top: '64px',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '-20px'})`,
      opacity: visible ? 1 : 0,
      transition: 'transform 0.4s ease, opacity 0.4s ease',
      zIndex: 9998,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px 6px 10px',
        background: darkMode ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.92)',
        border: `1px solid ${darkMode ? '#2a2a2a' : '#e5e7eb'}`,
        borderRadius: '20px',
        boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(8px)',
        maxWidth: '420px',
        minWidth: '200px',
      }}>
        <span style={{
          flexShrink: 0,
          width: '6px', height: '6px',
          borderRadius: '50%',
          background: '#f97316',
          boxShadow: '0 0 6px rgba(249,115,22,0.7)',
        }} />

        <span style={{
          fontSize: '12px',
          fontWeight: 400,
          color: darkMode ? '#c0c0c0' : '#374151',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity: animState === 'exit' ? 0 : 1,
          transform:
            animState === 'exit'  ? 'translateY(-5px)' :
            animState === 'enter' ? 'translateY(5px)'  :
            'translateY(0)',
        }}>
          {text}
        </span>

        {notices.length > 1 && (
          <div style={{ flexShrink: 0, display: 'flex', gap: '3px', alignItems: 'center' }}>
            {notices.map((_, i) => (
              <div key={i} style={{
                width: i === currentIndex ? '12px' : '4px',
                height: '3px', borderRadius: '2px',
                background: i === currentIndex ? '#f97316' : (darkMode ? '#444' : '#d1d5db'),
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
        )}

        <button onClick={handleDismiss} style={{
          flexShrink: 0,
          width: '16px', height: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none',
          color: darkMode ? '#555' : '#9ca3af',
          fontSize: '10px', cursor: 'pointer', padding: 0,
        }}>
          ✕
        </button>
      </div>
    </div>
  )
}