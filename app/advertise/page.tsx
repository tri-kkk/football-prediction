'use client'

import { useLanguage } from '../contexts/LanguageContext'

export default function AdvertisePage() {
  const { language } = useLanguage()
  
  const content = {
    ko: {
      title: '당신의 브랜드를',
      titleHighlight: '경기의 중심에',
      desc: '매주 수만 명의 축구 팬들이 모이는 곳.\n프리미어리그부터 챔피언스리그까지, 가장 몰입도 높은 순간에 함께하세요.',
      strengths: [
        { title: 'Targeted', desc: '축구 팬 특화' },
        { title: 'Engaged', desc: '높은 체류 시간' },
        { title: 'Growing', desc: '빠른 성장세' },
      ],
      contactLabel: 'Contact',
      email: 'trikilab2025@gmail.com',
      partners: 'Sports · Lifestyle · Tech 브랜드 환영',
    },
    en: {
      title: 'Put your brand',
      titleHighlight: 'in the game',
      desc: 'Where passionate football fans gather every week.\nFrom Premier League to Champions League, be there at peak moments.',
      strengths: [
        { title: 'Targeted', desc: 'Football fans only' },
        { title: 'Engaged', desc: 'High dwell time' },
        { title: 'Growing', desc: 'Rapid growth' },
      ],
      contactLabel: 'Contact',
      email: 'trikilab2025@gmail.com',
      partners: 'Sports · Lifestyle · Tech brands welcome',
    }
  }
  
  const t = content[language]

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      
      {/* Background Graphics */}
      <div className="absolute inset-0 pointer-events-none">
        
        {/* Large Gradient Orbs */}
        <div className="absolute top-0 -left-40 w-[600px] h-[600px] bg-emerald-500/30 rounded-full blur-[150px]" />
        <div className="absolute -bottom-20 -right-40 w-[500px] h-[500px] bg-blue-500/25 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
        
        {/* Animated Rotating Rings - Top Right */}
        <svg className="absolute -top-10 -right-10 w-[400px] h-[400px]" viewBox="0 0 400 400">
          <defs>
            <linearGradient id="ringGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6"/>
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.6"/>
            </linearGradient>
            <linearGradient id="ringGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2"/>
            </linearGradient>
          </defs>
          <circle cx="200" cy="200" r="150" fill="none" stroke="url(#ringGradient1)" strokeWidth="1">
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="30s" repeatCount="indefinite"/>
          </circle>
          <circle cx="200" cy="200" r="120" fill="none" stroke="url(#ringGradient2)" strokeWidth="1" strokeDasharray="8 4">
            <animateTransform attributeName="transform" type="rotate" from="360 200 200" to="0 200 200" dur="25s" repeatCount="indefinite"/>
          </circle>
          <circle cx="200" cy="200" r="90" fill="none" stroke="url(#ringGradient1)" strokeWidth="0.5">
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="20s" repeatCount="indefinite"/>
          </circle>
        </svg>
        
        {/* Football Field Abstract - Bottom Left */}
        <svg className="absolute -bottom-16 -left-16 w-[350px] h-[350px] opacity-40" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="fieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2"/>
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="40" fill="none" stroke="url(#fieldGradient)" strokeWidth="1"/>
          <circle cx="100" cy="100" r="3" fill="#10b981" opacity="0.6"/>
          <line x1="100" y1="20" x2="100" y2="180" stroke="url(#fieldGradient)" strokeWidth="1"/>
          <path d="M 20 60 L 50 60 L 50 140 L 20 140" fill="none" stroke="url(#fieldGradient)" strokeWidth="1"/>
          <path d="M 50 80 Q 70 100 50 120" fill="none" stroke="url(#fieldGradient)" strokeWidth="1"/>
          <path d="M 20 30 Q 30 20 40 20" fill="none" stroke="url(#fieldGradient)" strokeWidth="1"/>
          <path d="M 20 170 Q 30 180 40 180" fill="none" stroke="url(#fieldGradient)" strokeWidth="1"/>
        </svg>
        
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-emerald-400/40 rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-emerald-300/60 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-2/3 right-1/4 w-2 h-2 bg-blue-300/30 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        
        {/* Subtle grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
        
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-white">{t.title}</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
              {t.titleHighlight}
            </span>
          </h1>
          
          {/* Description */}
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 whitespace-pre-line leading-relaxed">
            {t.desc}
          </p>
          
          {/* Strengths - Pills */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {t.strengths.map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-700/50 bg-white/[0.03]">
                <span className="text-white font-medium">{item.title}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400 text-sm">{item.desc}</span>
              </div>
            ))}
          </div>
          
          {/* Contact Email */}
          <div className="inline-flex flex-col items-center">
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-3">{t.contactLabel}</span>
            <a 
              href={`mailto:${t.email}`}
              className="text-2xl md:text-3xl font-light text-white hover:text-emerald-400 transition-colors tracking-wide"
            >
              {t.email}
            </a>
          </div>
          
          {/* Partners note */}
          <p className="mt-16 text-sm text-gray-600">{t.partners}</p>
          
        </div>
      </div>
      
      {/* Bottom Gradient Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
      
    </div>
  )
}