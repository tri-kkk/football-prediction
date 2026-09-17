// lib/promoPolicy.ts
// 광고성(promo) 푸시 공통 정책 — B30
//  · promo 토픽이거나 제목에 (광고)/(AD)가 있으면 "광고성"으로 간주
//  · 광고성은 → 토픽을 promo 로 고정, 제목 앞 (광고) 자동표기, 본문에 수신거부 안내 자동첨부
//  · 광고성은 → 야간(21:00~08:00 KST) 발송 차단
// send-topic / schedule / send-scheduled-push 세 경로에서 공통 사용(멱등).

export type PushLocaleText = { title: string; body: string }

export const AD_TAG_KO = '(광고)'
export const AD_TAG_EN = '(AD)'
export const UNSUB_KO = '무료수신거부: 앱 > 메뉴 > 알림 설정'
export const UNSUB_EN = 'Unsubscribe: App > Menu > Notification settings'

// 야간(21:00~08:00 KST) 여부 — 즉시 발송용
export function isNightKST(d: Date = new Date()): boolean {
  const kst = new Date(d.getTime() + 9 * 3600 * 1000)
  const h = kst.getUTCHours()
  return h >= 21 || h < 8
}

// KST 특정 시(hour, 0~23)가 야간인지 — 예약(daily/weekly run_hour) 검증용
export function isNightHourKST(hour: number): boolean {
  return hour >= 21 || hour < 8
}

function hasAdTag(title?: string): boolean {
  if (!title) return false
  return title.includes(AD_TAG_KO) || title.toUpperCase().includes(AD_TAG_EN)
}

// 광고성 콘텐츠 판정: promo 토픽 또는 제목에 (광고)/(AD)
export function isPromoContent(topic: string, ko?: PushLocaleText, en?: PushLocaleText): boolean {
  if (topic === 'promo') return true
  return hasAdTag(ko?.title) || hasAdTag(en?.title)
}

function withAdTag(
  text: PushLocaleText | undefined,
  tag: string,
  unsub: string,
): PushLocaleText | undefined {
  if (!text) return text
  const title = hasAdTag(text.title) ? text.title : `${tag} ${text.title}`
  const body = text.body?.includes(unsub) ? text.body : `${text.body}\n\n${unsub}`
  return { title, body }
}

// 광고성이면 토픽 promo 고정 + (광고) 표기 + 수신거부 첨부. 아니면 원본 그대로.
// 멱등: 이미 (광고)·수신거부가 있으면 중복 추가하지 않음.
export function applyPromoPolicy(input: { topic: string; ko?: PushLocaleText; en?: PushLocaleText }) {
  const promo = isPromoContent(input.topic, input.ko, input.en)
  if (!promo) return { topic: input.topic, ko: input.ko, en: input.en, isPromo: false as const }
  return {
    topic: 'promo',
    ko: withAdTag(input.ko, AD_TAG_KO, UNSUB_KO),
    en: withAdTag(input.en, AD_TAG_EN, UNSUB_EN),
    isPromo: true as const,
  }
}
