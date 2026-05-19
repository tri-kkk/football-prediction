// 🔥 리그 필터 칩 — 현재 매치에 있는 리그만 동적으로 노출
// PC: 한 줄 + 접기/펼치기 (10개 초과 시), 모바일: 가로 스크롤
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import type { UnifiedMatch } from './types'
import { LEAGUES } from '../../data/leagues'

interface LeagueChip {
  code: string
  label: string
  logo?: string
  count: number
}

interface Props {
  activeLeague?: string | null
  // 매치 리스트 — 여기서 실제 노출할 리그 추출
  matches: UnifiedMatch[]
}

// 리그 코드 → 짧은 표시 이름 (칩 라벨 — 길면 자르기)
const SHORT_NAME: Record<string, string> = {
  PL: 'PL',
  PD: '라리가',
  BL1: '분데스',
  SA: '세리에A',
  FL1: '리그1',
  CL: 'UCL',
  EL: 'UEL',
  UECL: 'UECL',
  PPL: '포르투갈',
  DED: '에레디비시',
  ELC: '챔피언십',
  SD: '라리가2',
  BL2: '분데스2',
  FL2: '리그2',
  TSL: '쉬페르리그',
  SPL: '스코티시',
  SSL: '스위스',
  GSL: '그리스',
  DSL: '덴마크',
  JPL: '벨기에',
  ABL: '오스트리아',
  J1: 'J1리그',
  J2: 'J2리그',
  KL1: 'K리그1',
  KL2: 'K리그2',
  K1: 'K리그1',
  K2: 'K리그2',
  EGY: '이집트',
  RSA: '남아공',
  MAR: '모로코',
  DZA: '알제리',
  TUN: '튀니지',
  SAL: '사우디',
  CSL: '중국',
  BSA: '브라질',
  ARG: '아르헨티나',
  MLS: 'MLS',
  LMX: '리가MX',
  ALG: 'A리그',
  ACL: 'ACL',
  ACL2: 'ACL2',
  FAC: 'FA컵',
  EFL: 'EFL컵',
  CDR: '코파델레이',
  CIT: '코파이탈리아',
  CDF: '쿠프드프랑스',
  KNV: 'KNVB',
  DFB: 'DFB포칼',
  TDP: '타사드포르투갈',
  WC: '월드컵',
  UNL: 'UNL',
  COP: '리베르타도레스',
  COS: '수다메리카나',
  AFCON: '아프리카컵',
  AMATCH: 'A매치',
  KBO: 'KBO',
  MLB: 'MLB',
  NPB: 'NPB',
  CPBL: 'CPBL',
}

// 영어 표기 (광고 송출 영어권 일반 대상)
// 외부 컴포넌트(UnifiedMatchCard 등)에서 재사용하기 위해 export
export const SHORT_NAME_EN: Record<string, string> = {
  PL: 'EPL',
  PD: 'La Liga',
  BL1: 'Bundesliga',
  SA: 'Serie A',
  FL1: 'Ligue 1',
  CL: 'UCL',
  EL: 'UEL',
  UECL: 'UECL',
  PPL: 'Primeira',
  DED: 'Eredivisie',
  ELC: 'Championship',
  SD: 'La Liga 2',
  BL2: 'Bundesliga 2',
  FL2: 'Ligue 2',
  TSL: 'Süper Lig',
  SPL: 'Scottish',
  SSL: 'Swiss',
  GSL: 'Greek',
  DSL: 'Danish',
  JPL: 'Belgian',
  ABL: 'Austrian',
  J1: 'J1 League',
  J2: 'J2 League',
  KL1: 'K League 1',
  KL2: 'K League 2',
  K1: 'K League 1',
  K2: 'K League 2',
  EGY: 'Egypt',
  RSA: 'South Africa',
  MAR: 'Morocco',
  DZA: 'Algeria',
  TUN: 'Tunisia',
  SAL: 'Saudi',
  CSL: 'China',
  BSA: 'Brazil',
  ARG: 'Argentina',
  MLS: 'MLS',
  LMX: 'Liga MX',
  ALG: 'A-League',
  ACL: 'ACL',
  ACL2: 'ACL2',
  FAC: 'FA Cup',
  EFL: 'EFL Cup',
  CDR: 'Copa del Rey',
  CIT: 'Coppa Italia',
  CDF: 'Coupe de France',
  KNV: 'KNVB',
  DFB: 'DFB-Pokal',
  TDP: 'Taça de Portugal',
  WC: 'World Cup',
  UNL: 'UNL',
  COP: 'Libertadores',
  COS: 'Sudamericana',
  AFCON: 'AFCON',
  AMATCH: 'Intl. Friendly',
  KBO: 'KBO',
  MLB: 'MLB',
  NPB: 'NPB',
  CPBL: 'CPBL',
}

// 리그 코드 → 엠블럼 URL — LEAGUES (단일 소스) 에서 자동 생성 + 야구/별칭 보강
const FALLBACK_LOGO: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  // 1) LEAGUES 에서 자동 생성 (축구 전체)
  LEAGUES.forEach((l) => {
    if (!l.isEmoji && l.logo && typeof l.logo === 'string' && l.logo.startsWith('http')) {
      map[l.code] = l.logo
    }
  })
  // 2) 별칭 (DB 코드가 LEAGUES 코드와 다를 때)
  map.K1 = 'https://media.api-sports.io/football/leagues/292.png'  // KL1 별칭
  map.K2 = 'https://media.api-sports.io/football/leagues/293.png'  // KL2 별칭
  map.SB = 'https://media.api-sports.io/football/leagues/136.png'  // 세리에B (LEAGUES 에는 없음)
  // 3) 야구
  map.KBO = 'https://media.api-sports.io/baseball/leagues/5.png'
  map.MLB = 'https://media.api-sports.io/baseball/leagues/1.png'
  map.NPB = 'https://media.api-sports.io/baseball/leagues/2.png'
  map.CPBL = 'https://media.api-sports.io/baseball/leagues/6.png'
  return map
})()

const MAX_VISIBLE_DESKTOP = 10  // PC: 10개까지 노출, 그 이상은 접기

export default function LeagueChips({ activeLeague, matches }: Props) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const [expanded, setExpanded] = useState(false)

  // 매치 기반 동적 리그 리스트 (코드 + 로고 + 개수)
  const list = useMemo<LeagueChip[]>(() => {
    const map = new Map<string, LeagueChip>()
    matches.forEach((m) => {
      const code = m.league
      if (!code) return
      const existing = map.get(code)
      if (existing) {
        existing.count += 1
      } else {
        const labelMap = isEn ? SHORT_NAME_EN : SHORT_NAME
        map.set(code, {
          code,
          label: labelMap[code] || m.leagueName || code,
          // 매치의 leagueLogo 우선 → 없으면 폴백 맵
          logo: m.leagueLogo || FALLBACK_LOGO[code],
          count: 1,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count
      return a.code.localeCompare(b.code)
    })
  }, [matches, isEn])

  if (list.length === 0) return null

  const hasMore = list.length > MAX_VISIBLE_DESKTOP
  // PC: 접힘 상태면 MAX_VISIBLE_DESKTOP 까지, 펼침이면 전체
  const desktopVisible = expanded ? list : list.slice(0, MAX_VISIBLE_DESKTOP)

  const allChip = (
    <Link
      key="all"
      href="/"
      scroll={false}
      className={[
        'shrink-0 inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs font-bold transition-colors border',
        !activeLeague
          ? 'bg-gray-800 text-white border-emerald-500/50'
          : 'bg-gray-900/60 text-gray-400 hover:bg-gray-800 border-gray-800 hover:text-gray-200',
      ].join(' ')}
    >
      <span className="w-5 h-5 rounded-md bg-gray-700 flex items-center justify-center shrink-0 text-[11px]">
        🌐
      </span>
      <span>{isEn ? 'All' : '전체'}</span>
    </Link>
  )

  const renderChip = (l: LeagueChip) => {
    const active = activeLeague === l.code
    return (
      <Link
        key={l.code}
        href={`/?league=${l.code}`}
        scroll={false}
        className={[
          'shrink-0 inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs font-medium transition-colors border',
          active
            ? 'bg-gray-800 text-white border-emerald-500/50'
            : 'bg-gray-900/60 text-gray-400 hover:bg-gray-800 border-gray-800 hover:text-gray-200',
        ].join(' ')}
      >
        {l.logo ? (
          <span className="w-5 h-5 rounded-md bg-white flex items-center justify-center shrink-0 p-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.logo} alt="" className="max-w-full max-h-full object-contain" loading="lazy" />
          </span>
        ) : (
          <span className="w-5 h-5 rounded-md bg-gray-700" />
        )}
        <span>{l.label}</span>
        <span className="text-[10px] text-gray-500 tabular-nums">{l.count}</span>
      </Link>
    )
  }

  return (
    <div>
      {/* 모바일 — 한 줄 가로 스크롤 (전체 노출) */}
      <div className="md:hidden flex items-center gap-2 overflow-x-auto py-1 -mx-1 px-1 scrollbar-thin">
        {allChip}
        {list.map(renderChip)}
      </div>
      {/* PC — flex-wrap + 접기/펼치기 */}
      <div className="hidden md:flex flex-wrap items-center gap-2 py-1">
        {allChip}
        {desktopVisible.map(renderChip)}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors border bg-gray-900/60 text-gray-300 hover:bg-gray-800 border-gray-800 hover:text-white"
          >
            {expanded
              ? (isEn ? 'Collapse' : '접기')
              : (isEn ? `+${list.length - MAX_VISIBLE_DESKTOP} more` : `+${list.length - MAX_VISIBLE_DESKTOP}개 더`)}
            <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
