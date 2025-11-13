'use client'

import Script from 'next/script'

export default function MonetagVignette() {
  return (
    <Script
      id="monetag-vignette"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(s){
            s.dataset.zone='10181943',
            s.src='https://gizokraijaw.net/vignette.min.js'
          })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))
        `
      }}
    />
  )
}
