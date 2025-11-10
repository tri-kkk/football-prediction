'use client'

import { useEffect, useRef } from 'react'

export default function HilltopAdsSidebar() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    if (scriptLoadedRef.current || !containerRef.current) return

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.referrerPolicy = 'no-referrer-when-downgrade'
    
    const inlineScript = `
      (function(ouigqhq){
        var d = document,
            s = d.createElement('script'),
            l = d.scripts[d.scripts.length - 1];
        s.settings = ouigqhq || {};
        s.src = "//aggressivestruggle.com/b_XgVZs.dSG/l/0cYVW/cE/GeJmt9/u/Z/UElLkEPoThYh2YO/TYYt0DNQD/Y-txN-jtYX5iNGjZQo0zNhwQ";
        s.async = true;
        s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({})
    `
    
    script.text = inlineScript
    containerRef.current.appendChild(script)
    scriptLoadedRef.current = true

    return () => {
      if (containerRef.current && script.parentNode) {
        containerRef.current.removeChild(script)
      }
      scriptLoadedRef.current = false
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full flex justify-center" />
  )
}