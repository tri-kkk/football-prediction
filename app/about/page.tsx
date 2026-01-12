'use client'

import { useLanguage } from '../contexts/LanguageContext'

export default function AboutPage() {
  const { language } = useLanguage()
  
  const content = {
    ko: {
      tagline: 'About',
      title: '데이터로 읽는',
      titleHighlight: '축구의 흐름',
      desc: 'AI 기반 실시간 분석으로 경기의 흐름을 예측합니다.\n프리미어리그부터 챔피언스리그까지, 모든 빅매치를 더 깊이 즐기세요.',
      features: [
        { title: 'AI 분석', desc: '4시즌 데이터 기반' },
        { title: '실시간', desc: '배당 트렌드 추적' },
        { title: '6대 리그', desc: '주요 리그 커버' },
      ],
      mission: '축구 팬들이 경기를 더 깊이 이해하고 즐길 수 있도록',
      contactLabel: 'Contact',
      email: 'tikilab2025@gmail.com',
    },
    en: {
      tagline: 'About',
      title: 'Read the game',
      titleHighlight: 'through data',
      desc: 'AI-powered real-time analysis to predict match flow.\nFrom Premier League to Champions League, enjoy every big match deeper.',
      features: [
        { title: 'AI Analysis', desc: '4 seasons of data' },
        { title: 'Real-time', desc: 'Odds trend tracking' },
        { title: '6 Leagues', desc: 'Major leagues covered' },
      ],
      mission: 'Helping football fans understand and enjoy the game more deeply',
      contactLabel: 'Contact',
      email: 'tikilab2025@gmail.com',
    }
  }
  
  const t = content[language]

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      
      {/* Background Graphics */}
      <div className="absolute inset-0 pointer-events-none">
        
        {/* Large Gradient Orbs */}
        <div className="absolute top-0 -right-40 w-[600px] h-[600px] bg-blue-500/25 rounded-full blur-[150px]" />
        <div className="absolute -bottom-20 -left-40 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
        
        {/* Animated Rotating Rings - Top Left */}
        <svg className="absolute -top-10 -left-10 w-[400px] h-[400px]" viewBox="0 0 400 400">
          <defs>
            <linearGradient id="aboutRingGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6"/>
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6"/>
            </linearGradient>
            <linearGradient id="aboutRingGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2"/>
            </linearGradient>
          </defs>
          <circle cx="200" cy="200" r="150" fill="none" stroke="url(#aboutRingGradient1)" strokeWidth="1">
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="30s" repeatCount="indefinite"/>
          </circle>
          <circle cx="200" cy="200" r="120" fill="none" stroke="url(#aboutRingGradient2)" strokeWidth="1" strokeDasharray="8 4">
            <animateTransform attributeName="transform" type="rotate" from="360 200 200" to="0 200 200" dur="25s" repeatCount="indefinite"/>
          </circle>
          <circle cx="200" cy="200" r="90" fill="none" stroke="url(#aboutRingGradient1)" strokeWidth="0.5">
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="20s" repeatCount="indefinite"/>
          </circle>
        </svg>
        
        {/* Football Abstract - Bottom Right */}
        <svg className="absolute -bottom-16 -right-16 w-[300px] h-[300px] opacity-30" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="aboutFieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2"/>
            </linearGradient>
          </defs>
          {/* Football pentagon pattern */}
          <circle cx="100" cy="100" r="80" fill="none" stroke="url(#aboutFieldGradient)" strokeWidth="1"/>
          <polygon points="100,40 140,70 125,115 75,115 60,70" fill="none" stroke="url(#aboutFieldGradient)" strokeWidth="0.5"/>
          <circle cx="100" cy="100" r="30" fill="none" stroke="url(#aboutFieldGradient)" strokeWidth="0.5"/>
        </svg>
        
        {/* Floating particles */}
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-blue-400/40 rounded-full animate-pulse" />
        <div className="absolute top-1/3 left-1/3 w-1.5 h-1.5 bg-emerald-400/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/3 right-1/3 w-1 h-1 bg-blue-300/60 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-2/3 left-1/4 w-2 h-2 bg-emerald-300/30 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        
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
          <p className="text-blue-400 text-sm font-medium tracking-widest uppercase mb-6">{t.tagline}</p>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-white">{t.title}</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {t.titleHighlight}
            </span>
          </h1>
          
          {/* Description */}
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 whitespace-pre-line leading-relaxed">
            {t.desc}
          </p>
          
          {/* Features - Pills */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {t.features.map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-700/50 bg-white/[0.03]">
                <span className="text-white font-medium">{item.title}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400 text-sm">{item.desc}</span>
              </div>
            ))}
          </div>
          
          {/* Mission Quote */}
          <p className="text-gray-500 italic mb-16">"{t.mission}"</p>
          
          {/* Contact Email */}
          <div className="inline-flex flex-col items-center">
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-3">{t.contactLabel}</span>
            <a 
              href={`mailto:${t.email}`}
              className="text-2xl md:text-3xl font-light text-white hover:text-blue-400 transition-colors tracking-wide"
            >
              {t.email}
            </a>
          </div>
          
        </div>
      </div>
      
      {/* Bottom Gradient Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
      
    </div>
  )
}