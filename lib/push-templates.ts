/**
 * 푸시 알림 메시지 템플릿
 *
 * 이벤트 키:
 *  축구: kickoff, goal, halftime, fulltime, yellowCard, redCard, substitution
 *  야구: firstPitch, score, inningChange, homerun, gameEnd
 *
 * locale: 'ko' | 'en' (default 'ko')
 */

export type SoccerEvent =
  | 'kickoff' | 'goal' | 'halftime' | 'secondHalf' | 'fulltime'
  | 'yellowCard' | 'redCard' | 'substitution'

export type BaseballEvent =
  | 'firstPitch' | 'score' | 'inningChange' | 'homerun' | 'gameEnd'

export type Locale = 'ko' | 'en'

export interface EventContext {
  homeTeam: string                    // 표시용 팀명 (locale에 맞게)
  awayTeam: string
  homeScore?: number
  awayScore?: number
  elapsed?: number                    // 축구 경기 분 (예: 67)
  inning?: string                     // 야구 이닝 (예: '5', '5T', '5B')
  player?: string                     // 골/카드 선수명, 타자명
  assist?: string                     // 어시스트 선수명 (축구 골)
  scoringTeam?: 'home' | 'away'       // 득점/카드 발생 팀
  detail?: string                     // 'Normal Goal' | 'Penalty' | 'Own Goal' | 야구 'Solo HR' 등
}

interface NotificationText {
  title: string
  body: string
}

// 점수 표시 헬퍼
function score(ctx: EventContext): string {
  const h = ctx.homeScore ?? 0
  const a = ctx.awayScore ?? 0
  return `${h} - ${a}`
}

// 득점 팀 표시
function scoringTeamLabel(ctx: EventContext, locale: Locale): string {
  if (!ctx.scoringTeam) return ''
  return ctx.scoringTeam === 'home' ? ctx.homeTeam : ctx.awayTeam
}

// ──────────────────────────────────────────────────────────────────
// 축구 템플릿
// ──────────────────────────────────────────────────────────────────

const SOCCER_TEMPLATES: Record<
  SoccerEvent,
  Record<Locale, (ctx: EventContext) => NotificationText>
> = {
  kickoff: {
    ko: (c) => ({
      title: '⚽ 경기 시작',
      body: `${c.homeTeam} vs ${c.awayTeam} 킥오프!`,
    }),
    en: (c) => ({
      title: '⚽ Kickoff',
      body: `${c.homeTeam} vs ${c.awayTeam} just kicked off!`,
    }),
  },
  goal: {
    ko: (c) => {
      // detail 분기: Own Goal / Penalty / Normal Goal
      const isOwnGoal = c.detail?.toLowerCase().includes('own')
      const isPenalty = c.detail?.toLowerCase().includes('penalty')
      const titlePrefix = isOwnGoal ? '⚽ 자책골' : isPenalty ? '⚽ PK 골!' : '⚽ 골!'
      const playerPart = c.player ? `${c.player}` : ''
      const assistPart = c.assist && !isOwnGoal ? ` (도움: ${c.assist})` : ''
      const minutePart = c.elapsed ? ` ${c.elapsed}'` : ''
      return {
        title: `${titlePrefix} ${scoringTeamLabel(c, 'ko')}`,
        body:
          (playerPart || minutePart ? `${playerPart}${assistPart}${minutePart} · ` : '') +
          `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
      }
    },
    en: (c) => {
      const isOwnGoal = c.detail?.toLowerCase().includes('own')
      const isPenalty = c.detail?.toLowerCase().includes('penalty')
      const titlePrefix = isOwnGoal ? '⚽ Own Goal' : isPenalty ? '⚽ Penalty Goal!' : '⚽ Goal!'
      const playerPart = c.player ? `${c.player}` : ''
      const assistPart = c.assist && !isOwnGoal ? ` (assist: ${c.assist})` : ''
      const minutePart = c.elapsed ? ` ${c.elapsed}'` : ''
      return {
        title: `${titlePrefix} ${scoringTeamLabel(c, 'en')}`,
        body:
          (playerPart || minutePart ? `${playerPart}${assistPart}${minutePart} · ` : '') +
          `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
      }
    },
  },
  halftime: {
    ko: (c) => ({
      title: '⏸ 하프타임',
      body: `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
    en: (c) => ({
      title: '⏸ Half-time',
      body: `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
  },
  secondHalf: {
    ko: (c) => ({
      title: '▶ 후반 시작',
      body: `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
    en: (c) => ({
      title: '▶ Second Half',
      body: `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
  },
  fulltime: {
    ko: (c) => ({
      title: '🏁 경기 종료',
      body: `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
    en: (c) => ({
      title: '🏁 Full-time',
      body: `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
  },
  yellowCard: {
    ko: (c) => ({
      title: `🟨 옐로카드 — ${scoringTeamLabel(c, 'ko')}`,
      body: (c.player ? `${c.player} ` : '') + (c.elapsed ? `${c.elapsed}'` : ''),
    }),
    en: (c) => ({
      title: `🟨 Yellow Card — ${scoringTeamLabel(c, 'en')}`,
      body: (c.player ? `${c.player} ` : '') + (c.elapsed ? `${c.elapsed}'` : ''),
    }),
  },
  redCard: {
    ko: (c) => ({
      title: `🟥 레드카드 — ${scoringTeamLabel(c, 'ko')}`,
      body: (c.player ? `${c.player} ` : '') + (c.elapsed ? `${c.elapsed}'` : ''),
    }),
    en: (c) => ({
      title: `🟥 Red Card — ${scoringTeamLabel(c, 'en')}`,
      body: (c.player ? `${c.player} ` : '') + (c.elapsed ? `${c.elapsed}'` : ''),
    }),
  },
  substitution: {
    ko: (c) => ({
      title: `🔄 교체 — ${scoringTeamLabel(c, 'ko')}`,
      body: (c.player ? `${c.player} ` : '') + (c.elapsed ? `${c.elapsed}'` : ''),
    }),
    en: (c) => ({
      title: `🔄 Substitution — ${scoringTeamLabel(c, 'en')}`,
      body: (c.player ? `${c.player} ` : '') + (c.elapsed ? `${c.elapsed}'` : ''),
    }),
  },
}

// ──────────────────────────────────────────────────────────────────
// 야구 템플릿
// ──────────────────────────────────────────────────────────────────

const BASEBALL_TEMPLATES: Record<
  BaseballEvent,
  Record<Locale, (ctx: EventContext) => NotificationText>
> = {
  firstPitch: {
    ko: (c) => ({
      title: '⚾ 경기 시작',
      body: `${c.homeTeam} vs ${c.awayTeam} 플레이볼!`,
    }),
    en: (c) => ({
      title: '⚾ Play Ball',
      body: `${c.homeTeam} vs ${c.awayTeam} just started!`,
    }),
  },
  score: {
    ko: (c) => ({
      title: `⚾ ${scoringTeamLabel(c, 'ko')} 득점!`,
      body:
        (c.inning ? `${c.inning}회 · ` : '') +
        `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
    en: (c) => ({
      title: `⚾ ${scoringTeamLabel(c, 'en')} scored!`,
      body:
        (c.inning ? `Inning ${c.inning} · ` : '') +
        `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
  },
  inningChange: {
    ko: (c) => ({
      title: `⚾ ${c.inning ?? ''}회`,
      body: `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
    en: (c) => ({
      title: `⚾ Inning ${c.inning ?? ''}`,
      body: `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
  },
  homerun: {
    ko: (c) => ({
      title: `💣 홈런! ${scoringTeamLabel(c, 'ko')}`,
      body:
        (c.player ? `${c.player} ` : '') +
        (c.inning ? `(${c.inning}회) · ` : '') +
        `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
    en: (c) => ({
      title: `💣 Home Run! ${scoringTeamLabel(c, 'en')}`,
      body:
        (c.player ? `${c.player} ` : '') +
        (c.inning ? `(Inning ${c.inning}) · ` : '') +
        `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
  },
  gameEnd: {
    ko: (c) => ({
      title: '🏁 경기 종료',
      body: `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
    en: (c) => ({
      title: '🏁 Final',
      body: `${c.homeTeam} ${score(c)} ${c.awayTeam}`,
    }),
  },
}

// ──────────────────────────────────────────────────────────────────
// 메인 API
// ──────────────────────────────────────────────────────────────────

export function renderSoccerNotification(
  event: SoccerEvent,
  ctx: EventContext,
  locale: Locale = 'ko'
): NotificationText {
  const tmpl = SOCCER_TEMPLATES[event]?.[locale] ?? SOCCER_TEMPLATES[event]?.['ko']
  if (!tmpl) {
    return { title: '⚽ TrendSoccer', body: `${ctx.homeTeam} vs ${ctx.awayTeam}` }
  }
  return tmpl(ctx)
}

export function renderBaseballNotification(
  event: BaseballEvent,
  ctx: EventContext,
  locale: Locale = 'ko'
): NotificationText {
  const tmpl = BASEBALL_TEMPLATES[event]?.[locale] ?? BASEBALL_TEMPLATES[event]?.['ko']
  if (!tmpl) {
    return { title: '⚾ TrendSoccer', body: `${ctx.homeTeam} vs ${ctx.awayTeam}` }
  }
  return tmpl(ctx)
}

// 외주 요청 payload 구조 그대로 빌드하는 헬퍼
export function buildEventPayload(params: {
  sport: 'soccer' | 'baseball'
  matchId: number | string
  event: SoccerEvent | BaseballEvent
  extra?: Record<string, any>
}): Record<string, string> {
  const { sport, matchId, event, extra } = params
  const out: Record<string, string> = {
    type: 'match_event',
    sport,
    matchId: String(matchId),
    event,
  }
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== null && v !== undefined) out[k] = String(v)
    }
  }
  return out
}
