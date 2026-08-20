// remotion/timeline.ts
// 경기 데이터에 따라 씬 구성을 동적으로 만든다.
// AI 분석 텍스트가 없는 경기는 analysis 씬을 통째로 건너뛰고,
// 그만큼의 시간을 pitcher / reveal 에 나눠 준다. (빈 씬이 뜨는 것보다 낫다)

import { SCENE_FRAMES, type SceneKey } from './theme'
import type { Game } from './types'

export interface TimelineEntry {
  key: SceneKey
  from: number
  frames: number
}

export interface Timeline {
  entries: TimelineEntry[]
  total: number
  /** 씬별 시작 프레임 조회용 */
  at: Partial<Record<SceneKey, TimelineEntry>>
}

/**
 * AI 분석 원문에서 영상에 쓸 1~2문장을 뽑는다.
 * 마크다운 머리글·목록 기호·굵게 표시를 걷어내고, 너무 짧은 조각은 버린다.
 */
export function pickAnalysisLines(raw: string | null | undefined, max = 2): string[] {
  if (!raw) return []

  const cleaned = raw
    .replace(/```[\s\S]*?```/g, ' ')   // 코드블록
    .replace(/^#{1,6}\s+/gm, '')        // 머리글
    .replace(/^[-*•]\s+/gm, '')         // 목록 기호
    .replace(/\*\*(.+?)\*\*/g, '$1')    // 굵게
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const sentences = cleaned
    .split(/(?<=[.!?]|다\.|요\.|죠\.|음\.|임\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12 && s.length <= 120)

  return sentences.slice(0, max)
}

export function buildTimeline(game: Game): Timeline {
  const hasAnalysis = pickAnalysisLines(game.aiAnalysis).length > 0
  const hasPitchers = !!(game.pitchers?.home.name && game.pitchers?.away.name)

  const order: SceneKey[] = ['hook', 'matchup']
  if (hasPitchers) order.push('pitcher')
  if (hasAnalysis) order.push('analysis')
  order.push('reveal', 'cta')

  // 생략된 씬의 시간을 남은 씬에 되돌려준다 (전체 길이를 일정하게 유지)
  const skipped =
    (hasPitchers ? 0 : SCENE_FRAMES.pitcher) + (hasAnalysis ? 0 : SCENE_FRAMES.analysis)
  const bonusTargets: SceneKey[] = order.filter((k) => k === 'pitcher' || k === 'reveal' || k === 'matchup')
  const bonus = bonusTargets.length ? Math.floor(skipped / bonusTargets.length) : 0

  const entries: TimelineEntry[] = []
  const at: Partial<Record<SceneKey, TimelineEntry>> = {}
  let cursor = 0

  for (const key of order) {
    const frames = SCENE_FRAMES[key] + (bonusTargets.includes(key) ? bonus : 0)
    const entry = { key, from: cursor, frames }
    entries.push(entry)
    at[key] = entry
    cursor += frames
  }

  return { entries, total: cursor, at }
}
