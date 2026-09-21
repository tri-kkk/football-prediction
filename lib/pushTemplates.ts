// lib/pushTemplates.ts
// 리텐션 푸시 템플릿 — TrendSoccer 실제 기능/페이지 기반.
// {변수}는 발송 전 관리자가 실제 값으로 치환 (예: {팀A}, {N}, {리그}).
// topic: app_general(일반 공지) / match_events(경기 이벤트) / promo(광고성, v2 동의자만)
// ⚠️ B29: 기존 'marketing' 토픽은 폐지되고 'promo' 로 교체됨 (marketing 은 발송 차단)
// ⚠️ B32: deeplink 값을 v2.0 앱 라우트로 갱신, v2 미지원 템플릿 5개 폐기.
//         (폐기: 프리미엄 24h 선공개 / 팀 지수 소개 / 팀 지수 급등·급락 / 프리미엄 48h 무료 / 연간 구독 할인)
//         허용 경로 목록·검증은 lib/deeplinkAllowlist.ts 참조.

export type PushTopic = 'app_general' | 'match_events' | 'promo'

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
  // ══════════ 오늘의 콘텐츠 (일일 습관) ══════════
  {
    id: 'daily_pick',
    name: '오늘의 추천 픽',
    category: '오늘의 콘텐츠',
    topic: 'match_events',
    ko: { title: '⚽ 오늘의 추천 경기 도착', body: '오늘 주목할 {N}경기 분석과 예측이 준비됐어요. 지금 확인해보세요.' },
    en: { title: "⚽ Today's picks are in", body: '{N} match previews and predictions are ready. Check them now.' },
    deeplink: '/reports/soccer/premium',
    timing: '매일 오전 9시 (반복)',
  },
  {
    id: 'weekend_preview',
    name: '주말 빅매치 프리뷰',
    category: '오늘의 콘텐츠',
    topic: 'match_events',
    ko: { title: '🔥 주말 빅매치 프리뷰', body: '이번 주말 5대 리그 주요 경기 분석을 한눈에. 놓치지 마세요.' },
    en: { title: '🔥 Weekend big-match preview', body: "This weekend's top fixtures across the big 5 leagues — all in one place." },
    deeplink: '/feed/preview',
    timing: '매주 금요일 저녁 7시 (반복)',
  },
  {
    id: 'kickoff_reminder',
    name: '경기 임박 리마인더',
    category: '오늘의 콘텐츠',
    topic: 'match_events',
    ko: { title: '⏰ {팀A} vs {팀B} 곧 시작', body: '킥오프 1시간 전! 예측·배당 흐름·예상 스코어를 지금 확인하세요.' },
    en: { title: '⏰ {팀A} vs {팀B} kicks off soon', body: '1 hour to kickoff — check the prediction, odds movement and score now.' },
    deeplink: '/matches',
    timing: '킥오프 1시간 전 (수동)',
  },

  // ══════════ 적중·신뢰 (재방문 유도) ══════════
  {
    id: 'hit_yesterday',
    name: '어제 정확도 성적',
    category: '적중·신뢰',
    topic: 'app_general',
    ko: { title: '🎯 어제 예측 {N}경기 정확!', body: '트렌드사커 예측이 어제도 통했어요. 정확도 결과와 오늘의 픽을 확인하세요.' },
    en: { title: '🎯 {N} predictions hit yesterday!', body: 'Our model nailed it again. See the results and today’s picks.' },
    deeplink: '/home',
    timing: '경기 다음날 오전 (수동)',
  },
  {
    id: 'weekly_accuracy',
    name: '주간 정확도 리포트',
    category: '적중·신뢰',
    topic: 'app_general',
    ko: { title: '📊 이번 주 정확도 {N}%', body: '지난 한 주 예측 성적을 정리했어요. 어떤 픽이 통했는지 확인해보세요.' },
    en: { title: '📊 {N}% accuracy this week', body: 'Your weekly prediction scorecard is ready. See which picks landed.' },
    deeplink: '/home',
    timing: '매주 월요일 오전 (반복)',
  },

  // ══════════ 시그니처 기능 (차별화·기능 인지) ══════════
  {
    id: 'new_blog',
    name: '신규 분석 리포트',
    category: '시그니처 기능',
    topic: 'app_general',
    ko: { title: '📝 새 분석 리포트 공개', body: '{팀A} vs {팀B} 심층 분석이 올라왔어요. 예상 스코어까지 지금 확인.' },
    en: { title: '📝 New analysis published', body: 'In-depth {팀A} vs {팀B} breakdown with predicted score. Read it now.' },
    deeplink: '/reports/soccer',
    timing: '콘텐츠 발행 시 (수동)',
  },
  {
    id: 'highlights',
    name: '하이라이트 클립',
    category: '시그니처 기능',
    topic: 'app_general',
    ko: { title: '🎬 어젯밤 하이라이트 도착', body: '{리그} 주요 경기 하이라이트를 짧게 몰아보기. 지금 감상하세요.' },
    en: { title: '🎬 Last night’s highlights', body: 'Catch up on {리그} in quick clips. Watch now.' },
    deeplink: '/feed/highlights',
    timing: '경기 다음날 오전 (수동/반복)',
  },
  {
    id: 'baseball',
    name: '야구 분석 (KBO/NPB)',
    category: '시그니처 기능',
    topic: 'match_events',
    ko: { title: '⚾ 오늘의 야구 분석', body: 'KBO·NPB 오늘 경기 승부 예측이 준비됐어요. 지금 확인하세요.' },
    en: { title: '⚾ Today’s baseball picks', body: 'KBO & NPB predictions for today are ready. Check them now.' },
    deeplink: '/reports/baseball',
    timing: '야구 시즌 매일 (반복)',
  },

  // ══════════ 라이브 (실시간 재유입) ══════════
  {
    id: 'live_now',
    name: '라이브 경기 진행중',
    category: '라이브',
    topic: 'match_events',
    ko: { title: '🔴 {팀A} {N}-{M} {팀B} 진행중', body: '실시간 스코어와 예측 적중 여부를 지금 확인하세요.' },
    en: { title: '🔴 LIVE {팀A} {N}-{M} {팀B}', body: 'Follow the live score and see if our prediction lands.' },
    deeplink: '/matches',
    timing: '주요 경기 진행 중 (수동)',
  },

  // ══════════ 휴면 복귀 ══════════
  {
    id: 'winback',
    name: '휴면 복귀 유도',
    category: '휴면 복귀',
    topic: 'app_general',
    ko: { title: '👋 오랜만이에요!', body: '그동안 예측 정확도가 더 좋아졌어요. 오늘의 추천 경기를 확인해보세요.' },
    en: { title: '👋 We’ve missed you!', body: 'Our predictions got even sharper. Come see today’s recommended matches.' },
    deeplink: '/home',
    timing: '미접속 7~14일 (수동/세그먼트)',
  },
  {
    id: 'winback_results',
    name: '놓친 정확도 요약',
    category: '휴면 복귀',
    topic: 'app_general',
    ko: { title: '🔥 그동안 이만큼 적중했어요', body: '안 본 사이 정확히 맞힌 픽이 이렇게 많아요. 최근 성적을 확인해보세요.' },
    en: { title: '🔥 Look what you missed', body: 'A lot of picks landed while you were away. See the recent results.' },
    deeplink: '/home',
    timing: '미접속 14일+ (수동/세그먼트)',
  },
]

export const TEMPLATE_CATEGORIES = Array.from(new Set(PUSH_TEMPLATES.map((t) => t.category)))
