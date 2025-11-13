// app/components/ads/MonetagOnclick.tsx
'use client'

import Script from 'next/script'
import { useEffect } from 'react'

export default function MonetagOnclick() {
  useEffect(() => {
    let lastClick = 0
    const cooldown = 60000 // 1분 = 60,000ms
    
    const handleClick = () => {
      const now = Date.now()
      const timeSinceLastClick = now - lastClick
      
      if (timeSinceLastClick < cooldown) {
        console.log(`🕐 쿨다운 중... ${Math.ceil((cooldown - timeSinceLastClick) / 1000)}초 남음`)
        return
      }
      
      lastClick = now
      console.log('✅ Monetag Onclick 실행')
    }
    
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])
  
  return (
    <Script
      id="monetag-onclick"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(s){
            s.dataset.zone='10181857',
            s.src='https://al5sm.com/tag.min.js'
          })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))
        `
      }}
    />
  )
}