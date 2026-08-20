import React from 'react'
import { Composition } from 'remotion'
import { ShortsVideo } from './ShortsVideo'
import { DailyPicks, dailyDuration } from './daily/DailyPicks'
import { DailyResults, resultDuration } from './result/DailyResults'
import { WeekendTop5, top5Duration } from './weekend/WeekendTop5'
import { FPS, HEIGHT, WIDTH } from './theme'
import { buildTimeline } from './timeline'
import { INTRO_FRAMES } from './components/Intro'
import type { ShortsProps } from './types'
import type { DailyProps } from './daily/types'
import type { ResultProps } from './result/types'

// ── 포맷 D — 원 매치 딥다이브 (야구) ─────────────────────
const MATCH_SAMPLE: ShortsProps = {
  showLogos: false,
  bgm: '',
  backgrounds: { hook: null, matchup: null, pitcher: null, analysis: null, reveal: null, cta: null },
  game: {
    id: 1,
    league: 'KBO',
    home: { ko: '한화 이글스', en: 'Hanwha Eagles', ab: 'HH', c1: '#FF6600', c2: '#000000', logo: '' },
    away: { ko: 'KIA 타이거즈', en: 'KIA Tigers', ab: 'KIA', c1: '#EA0029', c2: '#06141F', logo: '' },
    winRate: { home: 86, away: 14 },
    pick: { team: '한화 이글스', side: 'home', stars: 5, confidence: 86, grade: 'PICK' },
    pitchers: {
      home: { name: '류현진', era: 3.91, whip: 1.23, k: 84 },
      away: { name: '황동하', era: 4.9, whip: 1.49, k: 58 },
    },
    aiAnalysis:
      '류현진은 최근 5경기에서 평균 6이닝 2실점으로 안정적인 이닝 소화를 보여주고 있습니다. ' +
      '황동하는 좌타 상대 피안타율이 3할을 넘어 한화 상위 타선에 고전할 가능성이 큽니다.',
    matchTime: '2026-08-20T10:00:00.000Z',
    matchDate: '2026-08-20',
    status: 'scheduled',
  },
}

// ── 포맷 A — 데일리 픽 리포트 ────────────────────────────
const L = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`
const LG = (id: number) => `https://media.api-sports.io/football/leagues/${id}.png`

const DAILY_SAMPLE: DailyProps = {
  date: '2026-08-20',
  sport: 'football',
  groupLabel: '유럽 축구',
  windowLabel: '오늘 밤 ~ 내일 새벽',
  totalMatches: 18,
  bgm: '',
  backgrounds: { opener: null, pick: null, summary: null, cta: null },
  picks: [
    {
      matchId: 'a',
      league: 'PL',
      leagueLabel: '프리미어리그',
      leagueLogo: LG(39),
      home: { name: '맨체스터 시티', logo: L(50), position: 2, points: 58, form: ['W','W','D','W','W'] },
      away: { name: '리버풀', logo: L(40), position: 7, points: 41, form: ['W','L','D','W','L'] },
      pickSide: 'HOME',
      pickTeam: '맨체스터 시티',
      probability: 68,
      odds3: { home: 68, draw: 20, away: 12 },
      stars: 4,
      matchTime: '2026-08-20T14:30:00.000Z',
    },
    {
      matchId: 'b',
      league: 'PD',
      leagueLabel: '라리가',
      leagueLogo: LG(140),
      home: { name: '레알 마드리드', logo: L(541), position: 1, points: 62, form: ['W','W','W','D','W'] },
      away: { name: '헤타페', logo: L(546), position: 14, points: 28, form: ['L','D','L','W','L'] },
      pickSide: 'HOME',
      pickTeam: '레알 마드리드',
      probability: 74,
      odds3: { home: 74, draw: 17, away: 9 },
      stars: 5,
      matchTime: '2026-08-20T18:00:00.000Z',
    },
    {
      matchId: 'c',
      league: 'SA',
      leagueLabel: '세리에A',
      leagueLogo: LG(135),
      home: { name: '인터 밀란', logo: L(505), position: 3, points: 54, form: ['W','D','W','W','L'] },
      away: { name: '토리노', logo: L(503), position: 11, points: 33, form: ['D','L','W','L','D'] },
      pickSide: 'HOME',
      pickTeam: '인터 밀란',
      probability: 63,
      odds3: { home: 63, draw: 23, away: 14 },
      stars: 4,
      matchTime: '2026-08-20T18:45:00.000Z',
    },
  ],
}


// ── 포맷 B — 어제 성적표 ─────────────────────────────────
const R = (
  league, leagueLabel, lgId, hn, hid, an, aid, hs, as_, pickSide, prob, isCorrect, isDraw
) => ({
  matchId: `${hn}-${an}`,
  league,
  leagueLabel,
  leagueLogo: LG(lgId),
  home: { name: hn, logo: L(hid) },
  away: { name: an, logo: L(aid) },
  homeScore: hs,
  awayScore: as_,
  pickSide,
  pickTeam: pickSide === 'HOME' ? hn : an,
  probability: prob,
  isCorrect,
  isDraw,
})

const RESULT_SAMPLE: ResultProps = {
  date: '2026-08-19',
  sport: 'football',
  groupLabel: '유럽 축구',
  bgm: '',
  backgrounds: { hook: null, results: null, score: null, cta: null },
  results: [
    R('PL', '프리미어리그', 39, '맨체스터 시티', 50, '풀럼', 36, 3, 1, 'HOME', 71, true, false),
    R('PD', '라리가', 140, '레알 마드리드', 541, '오사수나', 727, 2, 0, 'HOME', 76, true, false),
    R('SA', '세리에A', 135, '인터 밀란', 505, '엠폴리', 511, 1, 1, 'HOME', 68, false, true),
    R('BL1', '분데스리가', 78, '바이에른 뮌헨', 157, '아우크스부르크', 170, 4, 1, 'HOME', 79, true, false),
    R('FL1', '리그1', 61, 'PSG', 85, '랑스', 116, 0, 2, 'HOME', 66, false, false),
  ],
  summary: { total: 5, correct: 3, draws: 1, accuracy: 60 },
  cumulative: { decisive: 596, correct: 435, accuracy: 73, drawCount: 176, drawRate: 22 },
}

// ── 포맷 E — 주말 TOP 5 ─────────────────────────────────
const P = (league, label, lgId, hn, hid, an, aid, prob, stars, hp, hpt, hf, ap, apt, af, time) => ({
  matchId: `${hn}-${an}`,
  league,
  leagueLabel: label,
  leagueLogo: LG(lgId),
  home: { name: hn, logo: L(hid), position: hp, points: hpt, form: hf },
  away: { name: an, logo: L(aid), position: ap, points: apt, form: af },
  pickSide: 'HOME',
  pickTeam: hn,
  probability: prob,
  odds3: { home: prob, draw: Math.round((100 - prob) * 0.62), away: 100 - prob - Math.round((100 - prob) * 0.62) },
  stars,
  matchTime: time,
})

const TOP5_SAMPLE: DailyProps = {
  date: '2026-08-22',
  sport: 'football',
  groupLabel: '유럽 축구',
  totalMatches: 34,
  bgm: '',
  backgrounds: { opener: null, pick: null, summary: null, cta: null },
  picks: [
    P('PD', '라리가', 140, '레알 마드리드', 541, '헤타페', 546, 78, 5, 1, 62, ['W','W','W','D','W'], 14, 28, ['L','D','L','W','L'], '2026-08-22T18:00:00.000Z'),
    P('BL1', '분데스리가', 78, '바이에른 뮌헨', 157, '보훔', 176, 75, 5, 1, 65, ['W','W','W','W','D'], 17, 19, ['L','L','D','L','L'], '2026-08-22T15:30:00.000Z'),
    P('PL', '프리미어리그', 39, '맨체스터 시티', 50, '입스위치', 677, 71, 5, 2, 58, ['W','W','D','W','W'], 18, 21, ['L','D','L','L','W'], '2026-08-22T14:00:00.000Z'),
    P('SA', '세리에A', 135, '인터 밀란', 505, '베네치아', 517, 68, 4, 3, 54, ['W','D','W','W','L'], 19, 17, ['L','L','W','L','D'], '2026-08-23T18:45:00.000Z'),
    P('FL1', '리그1', 61, 'PSG', 85, '르아브르', 111, 66, 4, 1, 60, ['W','W','L','W','W'], 15, 24, ['D','L','L','W','L'], '2026-08-23T19:00:00.000Z'),
  ],
}

export const RemotionRoot: React.FC = () => (
  <>
    {/* 포맷 A — 오늘의 픽 */}
    <Composition
      id="DailyPicks"
      component={DailyPicks}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={DAILY_SAMPLE}
      calculateMetadata={({ props }) => ({
        durationInFrames: dailyDuration(props.picks.length),
      })}
    />

    {/* 포맷 B — 어제 성적표 */}
    <Composition
      id="DailyResults"
      component={DailyResults}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={RESULT_SAMPLE}
      calculateMetadata={({ props }) => ({
        durationInFrames: resultDuration(props.results.length),
      })}
    />

    {/* 포맷 E — 주말 TOP 5 */}
    <Composition
      id="WeekendTop5"
      component={WeekendTop5}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={TOP5_SAMPLE}
      calculateMetadata={({ props }) => ({
        durationInFrames: top5Duration(props.picks.length),
      })}
    />

    {/* 포맷 D — 빅매치 딥다이브 */}
    <Composition
      id="Shorts"
      component={ShortsVideo}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={MATCH_SAMPLE}
      calculateMetadata={({ props }) => ({
        durationInFrames: INTRO_FRAMES + buildTimeline(props.game).total,
      })}
    />
  </>
)
