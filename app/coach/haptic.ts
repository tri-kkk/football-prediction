// app/coach/haptic.ts — 모바일 진동 피드백 (지원 안 하면 무시).
export function haptic(ms = 8): void {
  try { (navigator as any)?.vibrate?.(ms); } catch { /* noop */ }
}
