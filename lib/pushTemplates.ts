// lib/pushTemplates.ts
// 리텐션 푸시 메시지 템플릿. 관리자 발송 폼의 프리셋으로 사용.
// {변수}는 발송 전 관리자가 실제 값으로 치환 (예: {팀A}, {N}).

export type PushTopic = 'app_general' | 'match_events' | 'marketing'

export interface PushTemplate {
  id: string
  name: string            // 관리자 목록 라벨
  category: string        // 그룹
  topic: PushTopic
  ko: { title: string; body: string }
  en: { title: string; body: string }
  deeplink?: string
  timing?: string         // 추천 발송 타이밍
}

export const PUSH_TEMPLATES: PushTemplate[] = [
  // ── 일일 습관 형성 (리텐션 핵심) ──
  {
    id: 'daily_pick',
    name: '오늘의 픽',
    category: '일일 습관',
    topic: 'app_general',
    ko: { title: '⚽ 오늘의 추천 경기 도착', body: '오늘 주목할 경기 분석과 예측이 준비됐어요. 지금 확인해보세요.' },
    en: { title: "⚽ Today's picks are in", body: "Fresh match analysis and predictions are ready. Check them now." },
    deeplink: '/',
    timing: '매일 오전 9시 (반복)',
  },
  {
    id: 'weekend_preview',
    name: '주말 라운드 프리뷰',
    category: '일일 습관',
    topic: 'match_events',
    ko: { title: '🔥 주말 빅매치 프리뷰', body: '이번 주말 5대 리그 주요 경기 분석을 한눈에. 놓치지 마세요.' },
    en: { title: '🔥 Weekend big-match preview', body: "This weekend's top fixtures across the big 5 leagues — all in one place." },
    deeplink: '/',
    timing: '매주 금요일 저녁 7시 (반복)',
  },

  // ── 적중/신뢰 (재방문 유도) ──
  {
    id: 'hit_yesterday',
    name: '어제 적중 자랑',
    category: '적중·신뢰',
    topic: 'app_general',
    ko: { title: '🎯 어제 예측 {N}경기 적중!', body: '트렌드사커 예측이 어제도 통했어요. 오늘의 픽도 확인해보세요.' },
    en: { title: '🎯 {N} predictions hit yesterday!', body: 'Our model nailed it again. See today’s picks now.' },
    deeplink: '/',
    timing: '경기 다음날 오전 (수동)',
  },
  {
    id: 'match_reminder',
    name: '경기 임박 리마인더',
    category: '적중·신뢰',
    topic: 'match_events',
    ko: { title: '⏰ {팀A} vs {팀B} 곧 시작', body: '킥오프 1시간 전! 예측과 배당 흐름을 지금 확인하세요.' },
    en: { title: '⏰ {팀A} vs {팀B} kicks off soon', body: '1 hour to kickoff — check the prediction and odds movement now.' },
    deeplink: '/',
    timing: '킥오프 1시간 전 (수동/자동)',
  },

  // ── 신규 기능/콘텐츠 (재방문·기능 인지) ──
  {
    id: 'team_index_open',
    name: '팀 지수 오픈',
    category: '신규 기능',
    topic: 'app_general',
    ko: { title: '📈 신규! 팀 지수 분석', body: '리그별 팀 실력을 주식처럼 지수로. 우리 팀 지수 지금 확인해보세요.' },
    en: { title: '📈 New! Team Index', body: 'Every team’s strength as a live stock-style index. Check your team now.' },
    deeplink: '/stocks',
    timing: '기능 출시 시 1회 (수동)',
  },
  {
    id: 'new_blog',
    name: '신규 분석 글',
    category: '신규 기능',
    topic: 'app_general',
    ko: { title: '📝 새 분석 리포트 공개', body: '{팀A} vs {팀B} 심층 분석이 올라왔어요. 지금 읽어보세요.' },
    en: { title: '📝 New analysis published', body: 'In-depth breakdown of {팀A} vs {팀B} is up. Read it now.' },
    deeplink: '/blog',
    timing: '콘텐츠 발행 시 (수동)',
  },

  // ── 휴면 복귀 ──
  {
    id: 'winback',
    name: '휴면 복귀 유도',
    category: '휴면 복귀',
    topic: 'app_general',
    ko: { title: '👋 오랜만이에요!', body: '그동안 예측 적중률이 더 좋아졌어요. 오늘의 추천 경기를 확인해보세요.' },
    en: { title: '👋 We’ve missed you!', body: 'Our predictions got even sharper. Come see today’s recommended matches.' },
    deeplink: '/',
    timing: '미접속 7~14일 사용자 (수동/세그먼트)',
  },

  // ── 마케팅/프리미엄 (별도 동의자만) ──
  {
    id: 'premium_promo',
    name: '프리미엄 프로모션',
    category: '마케팅',
    topic: 'marketing',
    ko: { title: '⭐ 프리미엄 48시간 무료', body: '광고 없이, 24시간 먼저 보는 예측. 지금 무료로 체험해보세요.' },
    en: { title: '⭐ 48h Premium free', body: 'Ad-free picks, 24h earlier. Start your free trial now.' },
    deeplink: '/premium',
    timing: '프로모션 기간 (수동, 동의자 한정)',
  },
]

export const TEMPLATE_CATEGORIES = Array.from(new Set(PUSH_TEMPLATES.map((t) => t.category)))
