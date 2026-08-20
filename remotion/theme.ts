// remotion/theme.ts
// 네이티브 1080x1920 기준 디자인 토큰.
// 기존 ShortsGenerator 는 360x640 캔버스에 그린 뒤 화면녹화로 3배 확대했기 때문에
// 텍스트/로고가 전부 업스케일 되어 뭉개졌다. 여기서는 처음부터 3배 크기로 그린다.

export const WIDTH = 1080
export const HEIGHT = 1920
export const FPS = 60

/** 구버전(360px 캔버스) 수치를 그대로 옮길 때 쓰는 배율 */
export const S = 3

export const BRAND_C1 = '#A3FF4C'
export const BRAND_C2 = '#62F4FF'

/** 팀 컬러가 API 매칭 실패로 회색 폴백일 때 쓰는 판정 기준 */
export const FALLBACK_TEAM_COLOR = '#1f2937'

export const LEAGUE_BADGE: Record<string, { bg: string; fg: string }> = {
  KBO: { bg: '#D5001C', fg: '#FFFFFF' },
  NPB: { bg: '#0B2D5E', fg: '#FFFFFF' },
  MLB: { bg: '#002D72', fg: '#FFFFFF' },
}

export type SceneKey = 'hook' | 'matchup' | 'pitcher' | 'analysis' | 'reveal' | 'cta'

/**
 * 씬 길이 (프레임, 60fps).
 *
 * v2 스토리라인 — "답 숨기기" 구조.
 * 구버전은 훅에서 승률과 픽을 다 공개해버려서 나머지 19초를 볼 이유가 없었고,
 * 같은 정보(승률/픽)가 훅·승률씬·CTA 세 번 반복됐다.
 * 이제 승률은 reveal 씬에서 단 한 번, 클라이맥스로만 공개한다.
 *
 *   hook     확신도(별점)만 보여주고 승률은 스크램블로 가림  → "얼마길래?"
 *   matchup  누가 붙는지
 *   pitcher  근거 1 — 선발 투수 스탯 비교
 *   analysis 근거 2 — AI 분석 코멘트 (데이터 없으면 자동 생략)
 *   reveal   답 공개 — 승률 카운트업
 *   cta      픽 + 사이트 유도
 */
export const SCENE_FRAMES: Record<SceneKey, number> = {
  hook: 150,      // 2.5s
  matchup: 180,   // 3.0s
  pitcher: 300,   // 5.0s
  analysis: 240,  // 4.0s
  reveal: 270,    // 4.5s
  cta: 150,       // 2.5s
}

/** 씬 전환 크로스페이드 길이 */
export const XFADE = 12

export const SAFE = {
  top: 260,     // 헤더 아래 안전 영역
  bottom: 440,  // 하단 바 + 유튜브 쇼츠 UI 안전 영역
  side: 72,
}
