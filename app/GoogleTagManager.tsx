'use client'

import { useEffect } from 'react'

// Window 인터페이스 확장
declare global {
  interface Window {
    dataLayer: any[]
  }
}

export default function GoogleTagManager() {
  useEffect(() => {
    // dataLayer 초기화
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    })

    // GTM 스크립트 동적 삽입
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-TPC2QWKF'
    document.head.appendChild(script)
  }, [])

  return (
    <noscript>
      <iframe
        src="https://www.googletagmanager.com/ns.html?id=GTM-TPC2QWKF"
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  )
}
