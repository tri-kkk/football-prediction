// lib/deeplinkAllowlist.ts
// B32: v2.0 앱이 딥링크(data.deeplink)·배너(link_url)에서 해석하는 허용 경로 목록과 검증기.
// - 목록 밖의 "앱 내부 경로(/로 시작)"는 저장 자체를 막는다 (관리자 입력 검증, B32 요청 4 / B37 요청 3).
// - 외부 URL(http/https), 스킴·슬래시 없는 호스트(예: m.spolive.com), 빈 값은 허용한다.
//   (앱 동작: 내부 경로=앱 내 이동 / http(s)=외부 브라우저 / 호스트만=배너 link_url 만 https 부착 / 빈 값=앱만 열림)
// ⚠️ 앱 코드(topic_push_deeplink.dart)의 목록과 반드시 동기화. 화면 경로 변경 시 앱팀 통보 → 이 파일 갱신.

// 딥링크로 열 수 있는 v2 정적 경로 (매핑표 3장). 끝에 '/'를 붙이지 않는다.
export const V2_ALLOWED_PATHS: readonly string[] = [
  '/home',
  '/matches',
  '/reports',
  '/reports/soccer',
  '/reports/soccer/premium',
  '/reports/baseball',
  '/reports/combo',
  '/feed',
  '/feed/preview',
  '/feed/news',
  '/feed/highlights',
  '/menu',
  '/menu/subscribe',
  '/menu/notification-settings',
  '/menu/help',
  '/menu/terms',
  '/menu/privacy',
]

const ALLOWED_SET = new Set(V2_ALLOWED_PATHS)

// B32 정정(2026-09-30): 푸시 딥링크와 배너 link_url 은 요구가 달라 채널별로 허용 목록을 분리한다.
//  - 토픽 푸시: 로그인된 사용자에게 로그인 화면은 무의미 → /login 차단(현행 유지).
//  - 배너: 게스트 유도용 「로그인하고 시작하기」 동선이 정상 → /login 허용.
// 두 채널 모두 계속 차단: /signup/*, /menu/payment/*, 단건조회(/matches/:sport/:id · /reports/combo/:id) —
//   이들은 허용 목록·별칭에 없으므로 기본 차단 규칙으로 자동 차단된다.
export type DeeplinkChannel = 'push' | 'banner'
const BANNER_EXTRA_ALLOWED = new Set(['/login'])

// B32: 배너(advertisements) 중 앱 홈 배너 슬롯만 딥링크 허용 목록을 강제한다.
//      웹 배너 슬롯(web_home_top, desktop_banner, sidebar 등)은 웹 라우팅을 쓰므로 검증 대상 아님.
export function isAppBannerSlot(slotType?: string | null): boolean {
  return typeof slotType === 'string' && slotType.startsWith('mobile_app_')
}

// 동적 허용: /feed/preview/{slug} (블로그 slug 상세). slug 는 영문·숫자·하이픈·언더스코어.
const DYNAMIC_ALLOWED = [/^\/feed\/preview\/[A-Za-z0-9_-]+$/]

// v1 → v2 별칭 (매핑표 2장). 앱은 별칭을 받아 처리하지만, 신규 저장은 v2 경로로 강제한다.
export const V1_TO_V2_ALIAS: Record<string, string> = {
  '/premium': '/reports/soccer/premium',
  '/blog': '/feed/preview',
  '/': '/home',
  // '/results' 는 v2에서 '이동 없음(앱만 열림)' — 대응 경로가 없어 별칭 매핑에서 제외.
}

export interface DeeplinkCheck {
  ok: boolean
  kind: 'empty' | 'internal' | 'external' | 'host' | 'blocked'
  reason?: string
  suggestion?: string   // v1 별칭 등 권장 v2 경로
  normalized?: string   // 저장에 쓸 정규화 값 (허용 목록은 정식 표기로 보정). ok=true 일 때 이 값을 저장한다.
}

// 정규화용 소문자→정식표기 맵 (자유 입력의 대소문자 변형을 정식 표기로 흡수).
const CANON_BY_LOWER = new Map<string, string>(V2_ALLOWED_PATHS.map((p) => [p.toLowerCase(), p]))
const BANNER_CANON_BY_LOWER = new Map<string, string>(
  [...V2_ALLOWED_PATHS, ...BANNER_EXTRA_ALLOWED].map((p) => [p.toLowerCase(), p]),
)

/**
 * 딥링크·link_url 값이 저장 가능한지 검증하고, 저장용 정규화 값(normalized)을 돌려준다.
 * 저장을 막는 경우는 "허용 목록에 없는 앱 내부 경로(/로 시작)" 뿐이다.
 * 정규화: 앞뒤 공백 제거 + 끝 슬래시 제거 + 허용 목록은 대소문자 무시 매칭 후 정식 표기로 저장.
 *   → 자유 입력의 '/login/','/Login','/login ' 변형이 모두 '/login' 으로 저장돼 앱 무동작을 방지.
 * @param channel 'push'(기본, 토픽 푸시 deeplink) | 'banner'(배너 link_url — /login 추가 허용)
 */
export function validateDeeplink(
  raw?: string | null,
  channel: DeeplinkChannel = 'push',
): DeeplinkCheck {
  const v = (raw ?? '').trim()
  if (!v) return { ok: true, kind: 'empty', normalized: '' }

  // 외부 URL — 허용 (URL 은 대소문자 민감 → trim 만)
  if (/^https?:\/\//i.test(v)) return { ok: true, kind: 'external', normalized: v }

  // 앱 내부 경로
  if (v.startsWith('/')) {
    const p = v.replace(/\/+$/, '') || '/' // 끝 슬래시 제거 (루트는 '/')
    const lower = p.toLowerCase()
    const canonMap = channel === 'banner' ? BANNER_CANON_BY_LOWER : CANON_BY_LOWER
    const canon = canonMap.get(lower)
    if (canon) return { ok: true, kind: 'internal', normalized: canon }
    // 동적 slug 는 대소문자 보존 (slug 가 대소문자 민감할 수 있음)
    if (DYNAMIC_ALLOWED.some((re) => re.test(p))) return { ok: true, kind: 'internal', normalized: p }
    if (V1_TO_V2_ALIAS[lower]) {
      return {
        ok: false,
        kind: 'blocked',
        reason: `'${v}' 는 v1 경로입니다. v2 경로 '${V1_TO_V2_ALIAS[lower]}' 로 저장하세요.`,
        suggestion: V1_TO_V2_ALIAS[lower],
      }
    }
    return {
      ok: false,
      kind: 'blocked',
      reason: `허용 목록에 없는 앱 내부 경로입니다: '${v}'. 허용 경로 중 하나를 선택하세요.`,
    }
  }

  // 스킴·슬래시 없는 값 (예: m.spolive.com) — 배너 link_url 만 유효(https 부착), 허용
  return { ok: true, kind: 'host', normalized: v }
}
