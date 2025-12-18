'use client'
import MatchPrediction from './components/MatchPrediction'
import React, { useState, useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { getTeamLogo, TEAM_NAME_KR } from './teamLogos'
import H2HModal from './components/H2HModal'
import { getTeamId } from './utils/teamIdMapping'
import { useLanguage } from './contexts/LanguageContext'
import LineupModal from './components/LineupModal'
import BlogPreviewSidebar from './components/BlogPreviewSidebar'  
import AdBanner from './components/AdBanner'
import MobileMatchReports from './components/MobileMatchReports'

import TopHighlights from './components/TopHighlights'

// 리그 정보 (국기 이미지 포함)
const LEAGUES = [
  { 
    code: 'ALL', 
    name: '전체',
    nameEn: 'All Leagues',
    flag: '🌍',
    logo: '🌍',
    isEmoji: true
  },
  { 
    code: 'CL', 
    name: '챔피언스리그',
    nameEn: 'Champions League',
    flag: '🌍',
    logo: 'https://media.api-sports.io/football/leagues/2.png',
    isEmoji: false
  },
    { 
    code: 'EL', 
    name: '유로파리그',
    nameEn: 'Europa League',
    flag: '🌍',
    logo: 'https://media.api-sports.io/football/leagues/3.png',
    isEmoji: false
  },
  { 
    code: 'UECL', 
    name: 'UEFA 컨퍼런스리그',
    nameEn: 'UEFA Conference League',
    flag: '🌍',
     logo: 'https://media.api-sports.io/football/leagues/848.png',
    isEmoji: false
  },
    { 
    code: 'UNL', 
    name: 'UEFA 네이션스리그',
    nameEn: 'UEFA Nations League',
    logo: 'https://media.api-sports.io/football/leagues/5.png', 
    flag: '🌍',
    isEmoji: false
  },

  { 
    code: 'PL', 
    name: '프리미어리그',
    nameEn: 'Premier League',
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    isEmoji: false
  },
    { 
    code: 'ELC', 
    name: '챔피언십',
    nameEn: 'Championship',
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    logo: 'https://media.api-sports.io/football/leagues/40.png',
    isEmoji: false
  },
  { 
    code: 'FAC', 
    name: 'FA컵',
    nameEn: 'FA Cup',
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    logo: 'https://media.api-sports.io/football/leagues/45.png',
    isEmoji: false
  },
  { 
    code: 'EFL', 
    name: 'EFL컵',
    nameEn: 'EFL Cup',
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    logo: 'https://media.api-sports.io/football/leagues/46.png',
    isEmoji: false
  },
  { 
    code: 'PD', 
    name: '라리가',
    nameEn: 'La Liga',
    flag: 'https://flagcdn.com/w40/es.png',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
    isEmoji: false
  },
  { 
    code: 'CDR', 
    name: '코파델레이',
    nameEn: 'Copa del Rey',
    flag: 'https://flagcdn.com/w40/es.png',
    logo: 'https://media.api-sports.io/football/leagues/143.png',
    isEmoji: false
  },
  { 
    code: 'BL1', 
    name: '분데스리가',
    nameEn: 'Bundesliga',
    flag: 'https://flagcdn.com/w40/de.png',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
    isEmoji: false
  },
  { 
    code: 'DFB', 
    name: 'DFB포칼',
    nameEn: 'DFB Pokal',
    flag: 'https://flagcdn.com/w40/de.png',
    logo: 'https://media.api-sports.io/football/leagues/81.png',
    isEmoji: false
  },
  { 
    code: 'SA', 
    name: '세리에A',
    nameEn: 'Serie A',
    flag: 'https://flagcdn.com/w40/it.png',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
    isEmoji: false
  },
  { 
    code: 'CIT', 
    name: '코파이탈리아',
    nameEn: 'Coppa Italia',
    flag: 'https://flagcdn.com/w40/it.png',
    logo: 'https://media.api-sports.io/football/leagues/137.png',
    isEmoji: false
  },
  { 
    code: 'FL1', 
    name: '리그1',
    nameEn: 'Ligue 1',
    flag: 'https://flagcdn.com/w40/fr.png',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
    isEmoji: false
  },
  { 
    code: 'CDF', 
    name: '쿠프드프랑스',
    nameEn: 'Coupe de France',
    flag: 'https://flagcdn.com/w40/fr.png',
    logo: 'https://media.api-sports.io/football/leagues/66.png',
    isEmoji: false
  },
  { 
    code: 'PPL', 
    name: '프리메이라리가',
    nameEn: 'Primeira Liga',
    flag: 'https://flagcdn.com/w40/pt.png',
    logo: 'https://media.api-sports.io/football/leagues/94.png',
    isEmoji: false
  },
  { 
    code: 'TDP', 
    name: '타사드포르투갈',
    nameEn: 'Taça de Portugal',
    flag: 'https://flagcdn.com/w40/pt.png',
    logo: 'https://media.api-sports.io/football/leagues/96.png',
    isEmoji: false
  },
  { 
    code: 'DED', 
    name: '에레디비시',
    nameEn: 'Eredivisie',
    flag: 'https://flagcdn.com/w40/nl.png',
    logo: 'https://media.api-sports.io/football/leagues/88.png',
    isEmoji: false
  },
  { 
    code: 'KNV', 
    name: 'KNVB컵',
    nameEn: 'KNVB Cup',
    flag: 'https://flagcdn.com/w40/nl.png',
    logo: 'https://media.api-sports.io/football/leagues/90.png',
    isEmoji: false
  },
  // 🆕 아프리카 네이션스컵
  { 
    code: 'AFCON', 
    name: '아프리카 네이션스컵',
    nameEn: 'Africa Cup of Nations',
    flag: 'https://img.icons8.com/color/48/africa.png',
    logo: 'https://media.api-sports.io/football/leagues/6.png',
    isEmoji: false
  },
]

// 🆕 국가/지역별 계층형 리그 그룹
const LEAGUE_GROUPS = [
  {
    id: 'all',
    region: '전체',
    regionEn: 'All',
    flag: 'https://flagcdn.com/w40/eu.png',
    leagues: [
      { code: 'ALL', name: '전체 리그', nameEn: 'All Leagues', logo: 'https://img.icons8.com/color/48/globe--v1.png' }
    ]
  },
  {
    id: 'europe',
    region: '유럽 대항전',
    regionEn: 'Europe',
    flag: 'https://flagcdn.com/w40/eu.png',
    leagues: [
      { code: 'CL', name: '챔피언스리그', nameEn: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png' },
      { code: 'EL', name: '유로파리그', nameEn: 'Europa League', logo: 'https://media.api-sports.io/football/leagues/3.png' },
      { code: 'UECL', name: '컨퍼런스리그', nameEn: 'Conference League', logo: 'https://media.api-sports.io/football/leagues/848.png' },
      { code: 'UNL', name: '네이션스리그', nameEn: 'Nations League', logo: 'https://media.api-sports.io/football/leagues/5.png' },
    ]
  },
  {
    id: 'england',
    region: '잉글랜드',
    regionEn: 'England',
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    leagues: [
      { code: 'PL', name: '프리미어리그', nameEn: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png' },
      { code: 'ELC', name: '챔피언십', nameEn: 'Championship', logo: 'https://media.api-sports.io/football/leagues/40.png' },
      { code: 'FAC', name: 'FA컵', nameEn: 'FA Cup', logo: 'https://media.api-sports.io/football/leagues/45.png' },
      { code: 'EFL', name: 'EFL컵', nameEn: 'EFL Cup', logo: 'https://media.api-sports.io/football/leagues/46.png' },
    ]
  },
  {
    id: 'spain',
    region: '스페인',
    regionEn: 'Spain',
    flag: 'https://flagcdn.com/w40/es.png',
    leagues: [
      { code: 'PD', name: '라리가', nameEn: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png' },
      { code: 'CDR', name: '코파델레이', nameEn: 'Copa del Rey', logo: 'https://media.api-sports.io/football/leagues/143.png' },
    ]
  },
  {
    id: 'germany',
    region: '독일',
    regionEn: 'Germany',
    flag: 'https://flagcdn.com/w40/de.png',
    leagues: [
      { code: 'BL1', name: '분데스리가', nameEn: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png' },
      { code: 'DFB', name: 'DFB포칼', nameEn: 'DFB Pokal', logo: 'https://media.api-sports.io/football/leagues/81.png' },
    ]
  },
  {
    id: 'italy',
    region: '이탈리아',
    regionEn: 'Italy',
    flag: 'https://flagcdn.com/w40/it.png',
    leagues: [
      { code: 'SA', name: '세리에A', nameEn: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png' },
      { code: 'CIT', name: '코파이탈리아', nameEn: 'Coppa Italia', logo: 'https://media.api-sports.io/football/leagues/137.png' },
    ]
  },
  {
    id: 'france',
    region: '프랑스',
    regionEn: 'France',
    flag: 'https://flagcdn.com/w40/fr.png',
    leagues: [
      { code: 'FL1', name: '리그1', nameEn: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png' },
      { code: 'CDF', name: '쿠프드프랑스', nameEn: 'Coupe de France', logo: 'https://media.api-sports.io/football/leagues/66.png' },
    ]
  },
  {
    id: 'portugal',
    region: '포르투갈',
    regionEn: 'Portugal',
    flag: 'https://flagcdn.com/w40/pt.png',
    leagues: [
      { code: 'PPL', name: '프리메이라리가', nameEn: 'Primeira Liga', logo: 'https://media.api-sports.io/football/leagues/94.png' },
      { code: 'TDP', name: '타사드포르투갈', nameEn: 'Taça de Portugal', logo: 'https://media.api-sports.io/football/leagues/96.png' },
    ]
  },
  {
    id: 'netherlands',
    region: '네덜란드',
    regionEn: 'Netherlands',
    flag: 'https://flagcdn.com/w40/nl.png',
    leagues: [
      { code: 'DED', name: '에레디비시', nameEn: 'Eredivisie', logo: 'https://media.api-sports.io/football/leagues/88.png' },
      { code: 'KNV', name: 'KNVB컵', nameEn: 'KNVB Cup', logo: 'https://media.api-sports.io/football/leagues/90.png' },
    ]
  },
  // 🆕 아프리카
  {
    id: 'africa',
    region: '아프리카',
    regionEn: 'Africa',
    flag: 'https://img.icons8.com/color/48/africa.png',
    leagues: [
      { code: 'AFCON', name: '아프리카 네이션스컵', nameEn: 'Africa Cup of Nations', logo: 'https://media.api-sports.io/football/leagues/6.png' },
    ]
  },
]

// 오즈 데이터가 있는 리그만 (경기 목록 필터용)
const LEAGUES_WITH_ODDS = [
  'ALL', 'CL', 'EL', 'UECL', 'UNL', 
  'PL', 'ELC', 'FAC', 'EFL',  // 잉글랜드
  'PD', 'CDR',                 // 스페인
  'BL1', 'DFB',                // 독일
  'SA', 'CIT',                 // 이탈리아
  'FL1', 'CDF',                // 프랑스
  'PPL', 'TDP',                // 포르투갈
  'DED', 'KNV',                // 네덜란드
  'AFCON'                      // 🆕 아프리카
]

// 헬퍼 함수들
function getLeagueLogo(league: string): string {
  const leagueMap: Record<string, string> = {
    'PL': 'https://media.api-sports.io/football/leagues/39.png',
    'PD': 'https://media.api-sports.io/football/leagues/140.png',
    'BL1': 'https://media.api-sports.io/football/leagues/78.png',
    'SA': 'https://media.api-sports.io/football/leagues/135.png',
    'FL1': 'https://media.api-sports.io/football/leagues/61.png',
    'CL': 'https://media.api-sports.io/football/leagues/2.png',
    'PPL': 'https://media.api-sports.io/football/leagues/94.png',
    'DED': 'https://media.api-sports.io/football/leagues/88.png',
    'EL': 'https://media.api-sports.io/football/leagues/3.png',
    'ELC': 'https://media.api-sports.io/football/leagues/40.png',
    'UECL': 'https://media.api-sports.io/football/leagues/848.png',
    'UNL': 'https://media.api-sports.io/football/leagues/5.png',
    // 컵대회 추가
    'FAC': 'https://media.api-sports.io/football/leagues/45.png',
    'EFL': 'https://media.api-sports.io/football/leagues/46.png',
    'CDR': 'https://media.api-sports.io/football/leagues/143.png',
    'DFB': 'https://media.api-sports.io/football/leagues/81.png',
    'CIT': 'https://media.api-sports.io/football/leagues/137.png',
    'CDF': 'https://media.api-sports.io/football/leagues/66.png',
    'TDP': 'https://media.api-sports.io/football/leagues/96.png',
    'KNV': 'https://media.api-sports.io/football/leagues/90.png',
    'AFCON': 'https://media.api-sports.io/football/leagues/6.png',  // 🆕 아프리카 네이션스컵
  }
  return leagueMap[league] || ''
}

// 리그 국기 이미지 가져오기 (필터와 동일)
function getLeagueFlag(leagueCode: string): { url: string; isEmoji: boolean } {
  const flagMap: Record<string, { url: string; isEmoji: boolean }> = {
    'PL': { url: 'https://flagcdn.com/w40/gb-eng.png', isEmoji: false },
    'PD': { url: 'https://flagcdn.com/w40/es.png', isEmoji: false },
    'BL1': { url: 'https://flagcdn.com/w40/de.png', isEmoji: false },
    'SA': { url: 'https://flagcdn.com/w40/it.png', isEmoji: false },
    'FL1': { url: 'https://flagcdn.com/w40/fr.png', isEmoji: false },
    'PPL': { url: 'https://flagcdn.com/w40/pt.png', isEmoji: false },
    'DED': { url: 'https://flagcdn.com/w40/nl.png', isEmoji: false },
    'CL': { url: 'https://flagcdn.com/w40/eu.png', isEmoji: false },
    'EL': { url: 'https://flagcdn.com/w40/eu.png', isEmoji: false },
    'ELC': { url: 'https://flagcdn.com/w40/gb-eng.png', isEmoji: false },
    'UECL': { url: 'https://flagcdn.com/w40/eu.png', isEmoji: false },
    'UNL': { url: 'https://flagcdn.com/w40/eu.png', isEmoji: false },
    // 컵대회 추가
    'FAC': { url: 'https://flagcdn.com/w40/gb-eng.png', isEmoji: false },
    'EFL': { url: 'https://flagcdn.com/w40/gb-eng.png', isEmoji: false },
    'CDR': { url: 'https://flagcdn.com/w40/es.png', isEmoji: false },
    'DFB': { url: 'https://flagcdn.com/w40/de.png', isEmoji: false },
    'CIT': { url: 'https://flagcdn.com/w40/it.png', isEmoji: false },
    'CDF': { url: 'https://flagcdn.com/w40/fr.png', isEmoji: false },
    'TDP': { url: 'https://flagcdn.com/w40/pt.png', isEmoji: false },
    'KNV': { url: 'https://flagcdn.com/w40/nl.png', isEmoji: false },
    'AFCON': { url: 'https://img.icons8.com/color/48/africa.png', isEmoji: false },  // 🆕 아프리카 네이션스컵
  }
  return flagMap[leagueCode] || { url: 'https://flagcdn.com/w40/eu.png', isEmoji: false }
}

// 리그 코드를 한글 이름으로 변환
function getLeagueName(leagueCode: string, language: string = 'ko'): string {
  const league = LEAGUES.find(l => l.code === leagueCode)
  if (league) {
    return language === 'ko' ? league.name : league.nameEn
  }
  return leagueCode
}

// Match 인터페이스
interface Match {
  id: number
  league: string
  leagueCode: string
  leagueLogo: string
  date: string
  time: string
  homeTeam: string          // 영문 팀명
  awayTeam: string          // 영문 팀명
  home_team_id?: number     // 🆕 API에서 오는 형식 (snake_case)
  away_team_id?: number     // 🆕 API에서 오는 형식 (snake_case)
  homeTeamKR?: string       // 🆕 추가 (한글 팀명)
  awayTeamKR?: string       // 🆕 추가 (한글 팀명)
  homeCrest: string
  awayCrest: string
  homeScore: number | null
  awayScore: number | null
  status: string
  utcDate: string       // 원본 UTC 날짜
  homeWinRate: number
  drawRate: number
  awayWinRate: number
  oddsSource: 'live' | 'historical'
  // 🆕 라인업 관련 필드
  lineupAvailable?: boolean
  homeFormation?: string
  awayFormation?: string
}

// 트렌드 데이터 인터페이스
interface TrendData {
  timestamp: string
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
}

// 뉴스 키워드 인터페이스
interface NewsKeyword {
  keyword: string
  count: number
  sentiment: 'positive' | 'negative' | 'neutral'
}


// 뉴스 키워드 생성
function generateNewsKeywords(): NewsKeyword[] {
  return [
    { keyword: '부상자 복귀', count: 15, sentiment: 'positive' },
    { keyword: '연승행진', count: 12, sentiment: 'positive' },
    { keyword: '주전 선수 결장', count: 8, sentiment: 'negative' },
    { keyword: '감독 전술 변경', count: 7, sentiment: 'neutral' },
    { keyword: '홈 경기 강세', count: 6, sentiment: 'positive' },
  ]
}

// 여러 팀을 한번에 번역 (성능 최적화)
async function translateMatches(matches: any[]): Promise<any[]> {
  // 모든 팀 ID 수집
  const teamIds = new Set<number>()
  matches.forEach(match => {
    if (match.home_team_id) teamIds.add(match.home_team_id)
    if (match.away_team_id) teamIds.add(match.away_team_id)
  })

  // 한번에 번역 요청
  let translations: Record<number, string> = {}
  
  if (teamIds.size > 0) {
    try {
      const response = await fetch('/api/team-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIds: Array.from(teamIds) })
      })
      const data = await response.json()
      
      // 팀 ID -> 한글명 매핑 생성
      data.teams?.forEach((team: any) => {
        translations[team.team_id] = team.korean_name
      })
    } catch (error) {
      console.error('팀명 일괄 번역 실패:', error)
    }
  }

  // 경기 데이터에 한글 팀명 추가
  return matches.map(match => ({
    ...match,
    homeTeamKR: translations[match.home_team_id] || match.homeTeam || match.home_team,
    awayTeamKR: translations[match.away_team_id] || match.awayTeam || match.away_team,
  }))
}

// 시간 포맷 함수 (브라우저 로컬 시간대 자동 적용)
function formatTime(utcDateString: string): string {
  const date = new Date(utcDateString)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 날짜 포맷 (브라우저 로컬 시간대 자동 적용)
function formatDate(utcDateString: string, language: string = 'ko'): string {
  const date = new Date(utcDateString)
  const now = new Date()
  
  // 날짜만 비교 (시간 제거)
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowDate = new Date(todayDate)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const matchDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (matchDate.getTime() === todayDate.getTime()) {
    return language === 'ko' ? '오늘' : 'Today'
  } else if (matchDate.getTime() === tomorrowDate.getTime()) {
    return language === 'ko' ? '내일' : 'Tomorrow'
  } else {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }
}

// 📦 캐시 헬퍼 함수
const CACHE_DURATION = 5 * 60 * 1000 // 5분
const CACHE_KEY_PREFIX = 'football_'
const MAX_CACHE_SIZE = 2 * 1024 * 1024 // 2MB 제한 (안전 마진)

// 🕐 한국 시간(KST, UTC+9) 기준 날짜 계산 헬퍼
function getKSTDate(date: Date = new Date()): Date {
  // UTC 시간에 9시간 추가
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
  return new Date(utc + (9 * 60 * 60 * 1000))
}

function getKSTToday(): Date {
  const kst = getKSTDate()
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()))
}

function getKSTTomorrow(): Date {
  const today = getKSTToday()
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return tomorrow
}

function getKSTWeekEnd(): Date {
  const today = getKSTToday()
  const weekEnd = new Date(today)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)
  return weekEnd
}

// 경기 날짜를 KST 기준으로 변환
function getMatchKSTDate(utcDateString: string): Date {
  const utcDate = new Date(utcDateString)
  const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000))
  return new Date(Date.UTC(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate()))
}

// ✅ 오래된 캐시 정리 함수
function clearOldCache() {
  try {
    const keysToRemove: { key: string; timestamp: number }[] = []
    
    // football_ 관련 모든 캐시 수집
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const { timestamp } = JSON.parse(cached)
            keysToRemove.push({ key, timestamp: timestamp || 0 })
          }
        } catch {
          // 파싱 실패한 캐시는 삭제 대상
          keysToRemove.push({ key, timestamp: 0 })
        }
      }
    }
    
    // 오래된 순으로 정렬
    keysToRemove.sort((a, b) => a.timestamp - b.timestamp)
    
    // 가장 오래된 절반 삭제
    const removeCount = Math.max(1, Math.ceil(keysToRemove.length / 2))
    for (let i = 0; i < removeCount && i < keysToRemove.length; i++) {
      localStorage.removeItem(keysToRemove[i].key)
      console.log('🗑️ 오래된 캐시 삭제:', keysToRemove[i].key)
    }
    
    return removeCount
  } catch (error) {
    console.error('캐시 정리 실패:', error)
    return 0
  }
}

// ✅ 전체 캐시 초기화 함수
function clearAllCache() {
  try {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log('🧹 전체 캐시 초기화 완료:', keysToRemove.length, '개 삭제')
    
    return keysToRemove.length
  } catch (error) {
    console.error('전체 캐시 초기화 실패:', error)
    return 0
  }
}

function getCachedData(key: string) {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + key)
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    
    // 캐시가 유효한지 확인
    if (now - timestamp < CACHE_DURATION) {
      console.log('📦 캐시에서 로드:', key)
      return data
    }
    
    // 만료된 캐시 삭제
    localStorage.removeItem(CACHE_KEY_PREFIX + key)
    return null
  } catch (error) {
    console.error('캐시 로드 실패:', error)
    // 손상된 캐시 삭제
    try {
      localStorage.removeItem(CACHE_KEY_PREFIX + key)
    } catch {}
    return null
  }
}

// ✅ 개선된 캐시 저장 함수 (QuotaExceededError 처리)
function setCachedData(key: string, data: any) {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    }
    
    const jsonString = JSON.stringify(cacheData)
    
    // 데이터가 너무 크면 저장하지 않음 (2MB 초과)
    if (jsonString.length > MAX_CACHE_SIZE) {
      console.warn('⚠️ 캐시 데이터 크기 초과, 저장 건너뜀:', key, `(${(jsonString.length / 1024 / 1024).toFixed(2)}MB)`)
      return false
    }
    
    localStorage.setItem(CACHE_KEY_PREFIX + key, jsonString)
    console.log('💾 캐시에 저장:', key)
    return true
    
  } catch (error: any) {
    // QuotaExceededError 처리
    if (error.name === 'QuotaExceededError' || 
        error.code === 22 || 
        error.code === 1014 ||
        error.message?.includes('quota')) {
      
      console.warn('⚠️ localStorage 용량 초과, 캐시 정리 중...')
      
      // 1차 시도: 오래된 캐시 정리 후 재시도
      const cleared = clearOldCache()
      if (cleared > 0) {
        try {
          const cacheData = { data, timestamp: Date.now() }
          localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData))
          console.log('💾 캐시 정리 후 저장 성공:', key)
          return true
        } catch (retryError) {
          console.warn('⚠️ 재시도 실패, 전체 캐시 초기화...')
        }
      }
      
      // 2차 시도: 전체 캐시 초기화 후 재시도
      clearAllCache()
      try {
        const cacheData = { data, timestamp: Date.now() }
        localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData))
        console.log('💾 전체 초기화 후 저장 성공:', key)
        return true
      } catch (finalError) {
        console.error('❌ 캐시 저장 최종 실패:', key, finalError)
        return false
      }
    }
    
    console.error('캐시 저장 실패:', error)
    return false
  }
}

export default function Home() {
  const { t, language: currentLanguage } = useLanguage()
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [matches, setMatches] = useState<Match[]>([])
  const [allMatchesForBanner, setAllMatchesForBanner] = useState<Match[]>([]) // 🆕 상단 롤링용 전체 경기
    const [h2hModalOpen, setH2hModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null)
  const [trendData, setTrendData] = useState<{ [key: number]: TrendData[] }>({})
  const [newsKeywords, setNewsKeywords] = useState<NewsKeyword[]>([])
  const [darkMode, setDarkMode] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const desktopScrollRef = useRef<HTMLDivElement>(null) // 🆕 데스크톱 전용
  // AI 논평 상태
  const [aiCommentaries, setAiCommentaries] = useState<{ [key: number]: string }>({})
  const [commentaryLoading, setCommentaryLoading] = useState<{ [key: number]: boolean }>({})
  // 🆕 라인업 상태
  const [lineupStatus, setLineupStatus] = useState<Record<number, {
    available: boolean
    homeFormation?: string
    awayFormation?: string
  }>>({})
  const [lineupModalOpen, setLineupModalOpen] = useState(false)
  const [selectedMatchForLineup, setSelectedMatchForLineup] = useState<Match | null>(null)
  // 🆕 날짜 필터 - Date 기반으로 변경
  const [selectedDate, setSelectedDate] = useState<Date>(getKSTToday())
  const [currentPage, setCurrentPage] = useState(1)
  const MATCHES_PER_PAGE = 15
  const [showFallbackBanner, setShowFallbackBanner] = useState(false)
  const [standings, setStandings] = useState<any[]>([])
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [currentLeagueIndex, setCurrentLeagueIndex] = useState(0)
  const [standingsExpanded, setStandingsExpanded] = useState(false)
  const [allLeagueStandings, setAllLeagueStandings] = useState<{ [key: string]: any[] }>({})
  // 📰 사이드바 뉴스
  const [sidebarNews, setSidebarNews] = useState<any[]>([])
  // 🔴 라이브 경기 수
  const [liveCount, setLiveCount] = useState(0)
  // 📊 배너 자동 롤링
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  // 📱 모바일 하단 광고 닫기 상태
  const [isMobileAdClosed, setIsMobileAdClosed] = useState(false)
  // 🆕 리그 그룹 펼침 상태 (기본: 모두 접힘)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // 전체 리그 목록 (전체 제외)
  const availableLeagues = LEAGUES.filter(l => l.code !== 'ALL')
  
  // 순위표용 리그 목록 (컵대회 제외)
  const CUP_COMPETITIONS = ['UNL', 'FAC', 'EFL', 'CDR', 'DFB', 'CIT', 'KNV', 'AFCON', 'CDF', 'TDP']
  const standingsLeagues = availableLeagues.filter(l => !CUP_COMPETITIONS.includes(l.code))

  // 🆕 날짜 네비게이션 함수들
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDateDisplay = (date: Date): string => {
    const today = getKSTToday()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const isToday = dateOnly.getTime() === today.getTime()
    const isTomorrow = dateOnly.getTime() === tomorrow.getTime()
    const isYesterday = dateOnly.getTime() === yesterday.getTime()

    if (currentLanguage === 'ko') {
      if (isToday) return '오늘'
      if (isTomorrow) return '내일'
      if (isYesterday) return '어제'
      return `${date.getMonth() + 1}월 ${date.getDate()}일`
    } else {
      if (isToday) return 'Today'
      if (isTomorrow) return 'Tomorrow'
      if (isYesterday) return 'Yesterday'
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
    setCurrentPage(1)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
    setCurrentPage(1)
  }

  const goToToday = () => {
    setSelectedDate(getKSTToday())
    setCurrentPage(1)
  }

  // 🆕 리그 그룹 펼침/접힘 토글
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  // 🆕 리그 선택 시 해당 그룹 자동 펼침
  const handleLeagueSelect = (leagueCode: string, groupId: string) => {
    setSelectedLeague(leagueCode)
    // 선택한 리그가 속한 그룹 펼침
    if (groupId !== 'all') {
      setExpandedGroups(prev => new Set(prev).add(groupId))
    }
  }

  // 선택된 날짜의 경기 필터링
  const getMatchesForDate = (date: Date): Match[] => {
    const dateKey = formatDateKey(date)
    return matches.filter(match => {
      const matchKST = getMatchKSTDate(match.utcDate)
      const matchKey = formatDateKey(matchKST)
      return matchKey === dateKey
    })
  }

  // 가장 빠른 경기 날짜 찾기
  const findEarliestMatchDate = (): Date | null => {
    if (matches.length === 0) return null
    
    const sortedMatches = [...matches].sort((a, b) => 
      new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    )
    
    return getMatchKSTDate(sortedMatches[0].utcDate)
  }

  // 🆕 오늘 경기 없으면 가장 빠른 경기 날짜로 자동 이동
  useEffect(() => {
    if (loading || matches.length === 0) return
    
    const todayMatches = getMatchesForDate(getKSTToday())
    
    if (todayMatches.length === 0) {
      const earliestDate = findEarliestMatchDate()
      if (earliestDate) {
        console.log('📅 오늘 경기 없음 → 가장 빠른 경기 날짜로 이동:', formatDateKey(earliestDate))
        setSelectedDate(earliestDate)
      }
    }
  }, [loading, matches])

  // 다크모드 토글
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // 📊 배너 자동 롤링 타이머 (5초마다)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % 3) // 0, 1, 2 순환
    }, 5000) // 5초마다 변경

    return () => clearInterval(timer)
  }, [])

  // HilltopAds 광고 로드 (임시 비활성화)
  /*
  useEffect(() => {
    // 모바일 체크 (lg 브레이크포인트: 1024px)
    const isMobile = window.innerWidth < 1024
    if (isMobile) return

    const container = document.getElementById('hilltop-ad-container')
    if (!container) return

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = `
      (function(ttf){
        var d = document,
            s = d.createElement('script'),
            l = d.scripts[d.scripts.length - 1];
        s.settings = ttf || {};
        s.src = "//aggressivestruggle.com/b/XtV.sjd/GOlv0kYAWjcW/vezm_9euJZKUJlakZP/TGYC2OOUTvYq0jMCz_QZtRNljGYg5/NSjTQ/zjNaQN";
        s.async = true;
        s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({})
    `
    container.appendChild(script)

    return () => {
      if (container && script.parentNode) {
        container.removeChild(script)
      }
    }
  }, [])
  */


  // 🔴 라이브 경기 수 확인
  useEffect(() => {
    async function checkLive() {
      try {
        const response = await fetch('/api/live-matches')
        const data = await response.json()
        if (data.success) {
          setLiveCount(data.count)
          console.log('🔴 라이브 경기:', data.count, '개')
        }
      } catch (error) {
        console.error('❌ 라이브 경기 수 확인 실패:', error)
      }
    }

    checkLive()
    
    // 30초마다 확인
    const interval = setInterval(checkLive, 30000)
    return () => clearInterval(interval)
  }, [])

  // 📰 사이드바 뉴스 로드
  useEffect(() => {
    async function fetchSidebarNews() {
      try {
        const response = await fetch(`/api/news?lang=${currentLanguage}`)
        const data = await response.json()
        if (data.success && data.articles) {
          setSidebarNews(data.articles.slice(0, 5))
        }
      } catch (error) {
        console.error('뉴스 로드 실패:', error)
      }
    }
    fetchSidebarNews()
  }, [currentLanguage])

  // selectedLeague 변경 시 순위표 인덱스 동기화
  useEffect(() => {
    if (selectedLeague === 'ALL') return
    
    // 컵대회 선택 시 순위표 숨김
    if (CUP_COMPETITIONS.includes(selectedLeague)) {
      setStandings([])
      return
    }
    
    const leagueIndex = standingsLeagues.findIndex(l => l.code === selectedLeague)
    if (leagueIndex !== -1 && leagueIndex !== currentLeagueIndex) {
      setCurrentLeagueIndex(leagueIndex)
      setStandings(allLeagueStandings[selectedLeague] || [])
    }
  }, [selectedLeague])

  // 자동 스크롤 효과 + 터치/마우스 드래그 지원 (데스크톱 & 모바일)
  useEffect(() => {
    // 🖥️ 데스크톱 자동 스크롤
    const desktopContainer = desktopScrollRef.current
    // 📱 모바일 자동 스크롤
    const mobileContainer = scrollContainerRef.current
    
    if (matches.length === 0) {
      console.log('⚠️ 자동 스크롤 중단: 경기 데이터 없음', { matchCount: matches.length })
      return
    }

    // 공통 설정
    const scrollSpeed = 0.5
    let desktopScrollPos = 0
    let mobileScrollPos = 0
    let desktopIntervalId: NodeJS.Timeout | null = null
    let mobileIntervalId: NodeJS.Timeout | null = null

    // 🖥️ 데스크톱 자동 스크롤
    if (desktopContainer) {
      console.log('✅ 데스크톱 자동 스크롤 시작:', { 
        matchCount: matches.length, 
        scrollWidth: desktopContainer.scrollWidth 
      })

      desktopIntervalId = setInterval(() => {
        desktopScrollPos += scrollSpeed
        desktopContainer.scrollLeft = desktopScrollPos
        
        const maxScroll = desktopContainer.scrollWidth / 2
        if (desktopScrollPos >= maxScroll) {
          desktopScrollPos = 0
          desktopContainer.scrollLeft = 0
        }
      }, 20)

      desktopContainer.style.cursor = 'grab'
    }

    // 📱 모바일 자동 스크롤
    if (mobileContainer) {
      console.log('✅ 모바일 자동 스크롤 시작:', { 
        matchCount: matches.length, 
        scrollWidth: mobileContainer.scrollWidth 
      })

      mobileIntervalId = setInterval(() => {
        mobileScrollPos += scrollSpeed
        mobileContainer.scrollLeft = mobileScrollPos
        
        const maxScroll = mobileContainer.scrollWidth / 2
        if (mobileScrollPos >= maxScroll) {
          mobileScrollPos = 0
          mobileContainer.scrollLeft = 0
        }
      }, 20)

      mobileContainer.style.cursor = 'grab'
    }

    // Cleanup
    return () => {
      if (desktopIntervalId) clearInterval(desktopIntervalId)
      if (mobileIntervalId) clearInterval(mobileIntervalId)
      if (desktopContainer) {
        desktopContainer.style.cursor = ''
      }
      if (mobileContainer) {
        mobileContainer.style.cursor = ''
      }
    }
  }, [matches])

  // 트렌드 데이터 로드 함수 (useEffect 밖으로 이동)
  const fetchTrendData = async (matchId: string, match?: any) => {
    try {
      // 🚀 캐시 확인
      const cacheKey = `trend_${matchId}`
      const cachedTrend = getCachedData(cacheKey)
      
      if (cachedTrend) {
        // 캐시 데이터도 시간순 정렬 확인
        const sortedCached = [...cachedTrend].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        setTrendData(prev => ({ ...prev, [matchId]: sortedCached }))
        console.log(`📦 캐시에서 트렌드 로드: ${matchId}`)
        return sortedCached
      }
      
      // ⏱️ 5초 타임아웃 설정
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`/api/match-trend?matchId=${matchId}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      const result = await response.json()
      
      if (result.success && result.data.length > 0) {
        // ✅ 시간순으로 정렬 (오름차순) - Lightweight Charts 요구사항
        const sortedData = [...result.data].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        
        // 💾 정렬된 데이터를 캐시에 저장
        setCachedData(cacheKey, sortedData)
        
        setTrendData(prev => ({ ...prev, [matchId]: sortedData }))
        console.log(`📈 Loaded trend for match ${matchId}:`, sortedData.length, 'points (sorted)')
        return sortedData
      } else {
        throw new Error('No trend data available')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('⏱️ 트렌드 API 타임아웃')
      } else {
        console.warn('⚠️ 트렌드 API 호출 실패:', err)
      }
      setTrendData(prev => ({
        ...prev,
        [matchId]: []
      }))
      return []
    }
  }

  // Supabase에서 실제 오즈 데이터 직접 가져오기
  useEffect(() => {
    async function fetchMatches() {
      setLoading(true)
      setError(null)
      
      try {
        // 🚀 캐시 확인
        const cacheKey = `matches_${selectedLeague}`
        const cachedMatches = getCachedData(cacheKey)
        
        if (cachedMatches) {
          // 캐시된 데이터도 번역 처리 🆕
          const translatedCached = await translateMatches(cachedMatches)
          setMatches(translatedCached)
          // 🆕 전체 리그면 상단 롤링용으로도 저장
          if (selectedLeague === 'ALL') {
            setAllMatchesForBanner(translatedCached)
          }
          setLoading(false)
          console.log('✅ 캐시에서 경기 로드 (번역 완료):', translatedCached.length)
          return
        }
        
        // DB에서 실제 오즈만 가져오기
        let allMatches = []
        
        if (selectedLeague === 'ALL') {
          // 모든 리그의 경기 가져오기 (DB에서 오즈 포함)
          const leagues = [
            'CL', 'EL', 'UECL', 'UNL',           // 유럽 대항전
            'PL', 'ELC', 'FAC', 'EFL',           // 잉글랜드
            'PD', 'CDR',                          // 스페인
            'BL1', 'DFB',                         // 독일
            'SA', 'CIT',                          // 이탈리아
            'FL1', 'CDF',                         // 프랑스
            'PPL', 'TDP',                         // 포르투갈
            'DED', 'KNV'                          // 네덜란드
          ]
          const promises = leagues.map(league => 
            fetch(`/api/odds-from-db?league=${league}`, {
              headers: {
                'Cache-Control': 'public, max-age=300' // 5분 캐시
              }
            })
              .then(r => r.json())
              .then(result => ({
                league,  // 리그 코드 추가로 전달
                data: result.success ? result.data : []
              }))
          )
          const results = await Promise.all(promises)
          
          // 모든 결과 합치기 - 리그 코드 명시적으로 추가 및 필드 변환
          allMatches = results.flatMap(result => 
            result.data.map((match: any) => ({
              // DB 필드명을 프론트엔드 형식으로 변환
              id: match.match_id || match.id,  // ✅ match_id 우선!
              homeTeam: match.home_team || match.homeTeam,
              awayTeam: match.away_team || match.awayTeam,
              home_team_id: match.home_team_id,  // 🆕 팀 ID 추가
              away_team_id: match.away_team_id,  // 🆕 팀 ID 추가
              league: match.league || getLeagueName(match.league_code) || result.league,
              leagueCode: match.league_code || match.leagueCode || result.league,
              utcDate: match.commence_time || match.utcDate,
              homeCrest: match.home_team_logo || getTeamLogo(match.home_team || match.homeTeam),  // 🆕 DB 로고 우선
              awayCrest: match.away_team_logo || getTeamLogo(match.away_team || match.awayTeam),  // 🆕 DB 로고 우선
              // 확률 필드 변환
              homeWinRate: match.home_probability || match.homeWinRate || 33,
              drawRate: match.draw_probability || match.drawRate || 34,
              awayWinRate: match.away_probability || match.awayWinRate || 33,
              // 오즈 필드
              homeWinOdds: match.home_odds || match.homeWinOdds,
              drawOdds: match.draw_odds || match.drawOdds,
              awayWinOdds: match.away_odds || match.awayWinOdds,
              // 기타
              oddsSource: match.odds_source || match.oddsSource || 'db'
            }))
          )
        } else {
          // 단일 리그 경기 가져오기 (DB에서 오즈 포함)
          const response = await fetch(
            `/api/odds-from-db?league=${selectedLeague}`,
            {
              headers: {
                'Cache-Control': 'public, max-age=300' // 5분 캐시
              }
            }
          )
          
          if (!response.ok) {
            throw new Error('경기 데이터를 불러올 수 없습니다')
          }
          
          const result = await response.json()
          
          if (!result.success) {
            throw new Error(result.error || '데이터 로드 실패')
          }
          
          // 리그 코드 명시적으로 추가
          allMatches = (result.data || []).map((match: any) => ({
            // DB 필드명을 프론트엔드 형식으로 변환
            id: match.match_id || match.id,  // ✅ match_id 우선!
            homeTeam: match.home_team || match.homeTeam,
            awayTeam: match.away_team || match.awayTeam,
            home_team_id: match.home_team_id,  // 🆕 팀 ID 추가
            away_team_id: match.away_team_id,  // 🆕 팀 ID 추가
            league: match.league || getLeagueName(match.league_code) || selectedLeague,
            leagueCode: match.league_code || match.leagueCode,
            utcDate: match.commence_time || match.utcDate,
            homeCrest: match.home_team_logo || getTeamLogo(match.home_team || match.homeTeam),  // 🆕 DB 로고 우선
            awayCrest: match.away_team_logo || getTeamLogo(match.away_team || match.awayTeam),  // 🆕 DB 로고 우선
            // 확률 필드 변환 (probability → rate)
            homeWinRate: match.home_probability || match.homeWinRate || 33,
            drawRate: match.draw_probability || match.drawRate || 34,
            awayWinRate: match.away_probability || match.awayWinRate || 33,
            // 오즈 필드
            homeWinOdds: match.home_odds || match.homeWinOdds,
            drawOdds: match.draw_odds || match.drawOdds,
            awayWinOdds: match.away_odds || match.awayWinOdds,
            // 기타 필드
            oddsSource: match.odds_source || match.oddsSource || 'db'
          }))
        }
        
        console.log('🏈 DB에서 가져온 경기 (오즈 포함):', allMatches.length)
        if (allMatches.length > 0) {
          console.log('📋 첫 번째 경기 샘플:', {
            id: allMatches[0].id,
            homeTeam: allMatches[0].homeTeam,
            awayTeam: allMatches[0].awayTeam,
            homeWinRate: allMatches[0].homeWinRate,
            drawRate: allMatches[0].drawRate,
            awayWinRate: allMatches[0].awayWinRate
          })
        }
        
        // ✅ 중복 제거 (id + 팀 이름 조합 기준)
        const seenIds = new Set()
        const seenMatches = new Set()
        const uniqueMatches = allMatches.filter((match) => {
          const matchId = match.id || match.match_id
          
          // ID로 중복 체크
          if (matchId && seenIds.has(matchId)) {
            console.log('🔍 ID 중복 발견:', matchId, match.homeTeam, 'vs', match.awayTeam)
            return false
          }
          
          // 팀 이름 조합으로 중복 체크 (대소문자 무시, 공백 제거)
          const homeTeam = (match.homeTeam || '').toLowerCase().replace(/\s+/g, '')
          const awayTeam = (match.awayTeam || '').toLowerCase().replace(/\s+/g, '')
          const matchKey = `${homeTeam}-vs-${awayTeam}`
          
          if (seenMatches.has(matchKey)) {
            console.log('🔍 팀 조합 중복 발견:', match.homeTeam, 'vs', match.awayTeam)
            return false
          }
          
          // 중복이 아니면 추가
          if (matchId) seenIds.add(matchId)
          seenMatches.add(matchKey)
          return true
        })
        
        console.log('📊 중복 제거 결과:', allMatches.length, '→', uniqueMatches.length)
        
        // DB API는 이미 Match 형식으로 반환되며 실제 오즈 포함
        const convertedMatches = uniqueMatches
        
        // 현재 시간 기준으로 미래 경기만 필터링
        const now = new Date()
        const futureMatches = convertedMatches.filter((match: any) => {
          const matchDate = new Date(match.utcDate)
          return matchDate > now  // 현재 시간보다 이후 경기만
        })
        
        // 날짜순 정렬 (가까운 경기부터)
        futureMatches.sort((a, b) => {
          return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
        })
        
        console.log('✅ 전체 경기:', convertedMatches.length)
        console.log('📅 예정된 경기:', futureMatches.length)
        console.log('🗑️ 제외된 과거 경기:', convertedMatches.length - futureMatches.length)
        
        // 리그 정보 확인
        if (futureMatches.length > 0) {
          console.log('🏆 첫 번째 경기 리그 정보:', {
            leagueCode: futureMatches[0].leagueCode,
            league: futureMatches[0].league
          })
        }
        
        // 💾 캐시에 저장
        setCachedData(cacheKey, futureMatches)
        
        // 🌐 팀명 한글 번역
        const translatedMatches = await translateMatches(futureMatches)
        
        setMatches(translatedMatches)
        
        // 🆕 전체 리그면 상단 롤링용으로도 저장
        if (selectedLeague === 'ALL') {
          setAllMatchesForBanner(translatedMatches)
        }
        
        // 🆕 라인업 상태 체크
        if (translatedMatches.length > 0) {
          checkLineupStatus(translatedMatches)
        }
        
        // 🆕 트렌드 데이터 자동 로드 (모든 경기)
        console.log('📊 트렌드 데이터 자동 로드 시작...')
        for (const match of translatedMatches.slice(0, 10)) { // 처음 10경기만
          fetchTrendData(match.id.toString(), match)
        }
        
      } catch (error: any) {
        console.error('❌ 에러:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }
    
    // 🆕 라인업 상태 체크 함수
    const checkLineupStatus = async (matches: Match[]) => {
      const statusMap: Record<number, any> = {}
      
      for (const match of matches) {
        try {
          const response = await fetch(`/api/lineup-status?fixtureId=${match.id}`)
          const data = await response.json()
          
          if (data.success && data.lineupAvailable) {
            statusMap[match.id] = {
              available: true,
              homeFormation: data.homeFormation,
              awayFormation: data.awayFormation,
            }
            console.log(`⚽ 라인업 발표: ${match.homeTeam} (${data.homeFormation}) vs ${match.awayTeam} (${data.awayFormation})`)
          }
        } catch (error) {
          console.error(`❌ Error checking lineup for match ${match.id}:`, error)
        }
      }
      
      setLineupStatus(statusMap)
    }
    
    // 트렌드 데이터 로드 (동기 버전 - Promise 반환)
    async function fetchTrendDataSync(matchId: string, match: any): Promise<TrendData[] | null> {
      try {
        // 🚀 캐시 확인
        const cacheKey = `trend_${matchId}`
        const cachedTrend = getCachedData(cacheKey)
        
        if (cachedTrend) {
          // 캐시 데이터도 시간순 정렬 확인
          const sortedCached = [...cachedTrend].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          setTrendData(prev => ({ ...prev, [matchId]: sortedCached }))
          return sortedCached
        }
        
        // ⏱️ 3초 타임아웃 설정
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        
        const response = await fetch(`/api/match-trend?matchId=${matchId}`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        const result = await response.json()
        
        if (result.success && result.data.length > 0) {
          // ✅ 시간순으로 정렬 (오름차순) - Lightweight Charts 요구사항
          const sortedData = [...result.data].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          
          console.log(`📈 Loaded trend for match ${matchId}:`, sortedData.length, 'points (sorted)')
          
          // 💾 정렬된 데이터를 캐시에 저장
          setCachedData(cacheKey, sortedData)
          
          setTrendData(prev => ({ ...prev, [matchId]: sortedData }))
          return sortedData
        } else {
          // API 응답은 있지만 데이터가 없는 경우
          throw new Error('No trend data available')
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn(`⏱️ 트렌드 로딩 타임아웃 (match ${matchId})`)
        } else {
          console.warn(`⚠️ 트렌드 데이터 로드 실패 (match ${matchId}):`, err)
        }
        return [] // 빈 배열 반환 (차트 표시 안 함)
      }
    }

  fetchMatches()
}, [selectedLeague])

  // 순위표 데이터 가져오기
  const fetchStandings = async (league: string) => {
    if (league === 'ALL') {
      // 전체 리그 선택 시 모든 리그의 순위표 로드 (Nations League 제외)
      setStandingsLoading(true)
      const allStandings: { [key: string]: any[] } = {}
      
      for (const l of standingsLeagues) {
        try {
          const cacheKey = `standings_${l.code}`
          const cached = getCachedData(cacheKey)
          
          if (cached) {
            allStandings[l.code] = cached
          } else {
            const response = await fetch(`/api/standings?league=${l.code}`)
            if (response.ok) {
              const data = await response.json()
              const standingsData = data.standings || []
              allStandings[l.code] = standingsData
              setCachedData(cacheKey, standingsData)
            }
          }
        } catch (error) {
          console.error(`순위표 로드 실패 (${l.code}):`, error)
        }
      }
      
      setAllLeagueStandings(allStandings)
      setStandingsLoading(false)
      
      // 첫 번째 리그 표시
      if (standingsLeagues.length > 0) {
        setStandings(allStandings[standingsLeagues[0].code] || [])
      }
      return
    }
    
    // 🚀 캐시 확인
    const cacheKey = `standings_${league}`
    const cachedStandings = getCachedData(cacheKey)
    
    if (cachedStandings) {
      setStandings(cachedStandings)
      console.log('📦 캐시에서 순위표 로드:', league)
      return
    }
    
    setStandingsLoading(true)
    try {
      const response = await fetch(`/api/standings?league=${league}`, {
        headers: {
          'Cache-Control': 'public, max-age=300' // 5분 캐시
        }
      })
      if (!response.ok) throw new Error('Failed to fetch standings')
      const data = await response.json()
      const standingsData = data.standings || []
      
      // 💾 캐시에 저장
      setCachedData(cacheKey, standingsData)
      
      setStandings(standingsData)
    } catch (error) {
      console.error('Error fetching standings:', error)
      setStandings([])
    } finally {
      setStandingsLoading(false)
    }
  }

  // 리그 변경 시 순위표도 로드
  useEffect(() => {
    fetchStandings(selectedLeague)
  }, [selectedLeague])

  // AI 논평 기능 일시 비활성화 (Rate Limit 때문)
  // TODO: 나중에 큐잉 시스템으로 개선
  // useEffect(() => {
  //   if (matches.length > 0) {
  //     matches.forEach(match => {
  //       if (!aiCommentaries[match.id]) {
  //         fetchAICommentary(match)
  //       }
  //     })
  //   }
  // }, [matches])

  // 트렌드 데이터 변경 시 차트 렌더링
  useEffect(() => {
    if (expandedMatchId) {
      const currentTrend = trendData[expandedMatchId]
      setTimeout(() => {
        const chartContainer = document.getElementById(`trend-chart-${expandedMatchId}`)
        if (chartContainer) {
          // 데이터가 없어도 렌더링 시도 (renderChart가 메시지 표시)
          if (currentTrend && currentTrend.length > 0) {
            console.log('📈 차트 자동 렌더링:', currentTrend.length, 'points')
            renderChart(chartContainer, currentTrend)
          } else {
            console.log('📊 차트 렌더링: 데이터 수집 중 메시지 표시')
            renderChart(chartContainer, [])
          }
        }
      }, 200)
    }
  }, [trendData, expandedMatchId, darkMode])

  // 뉴스 키워드 가져오기
  const fetchNewsKeywords = async (homeTeam: string, awayTeam: string) => {
    try {
      console.log(`🔍 뉴스 키워드 요청: ${homeTeam} vs ${awayTeam}`)
      
      const response = await fetch(
        `/api/news?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`
      )
      
      if (!response.ok) {
        throw new Error('뉴스 데이터 로드 실패')
      }
      
      const data = await response.json()
      console.log('📰 뉴스 키워드 응답:', data)
      
      // API 응답의 keywords를 NewsKeyword 형식으로 변환
      if (data.keywords && Array.isArray(data.keywords)) {
        const formattedKeywords: NewsKeyword[] = data.keywords.map((kw: any) => ({
          keyword: kw.keyword,
          count: kw.count,
          sentiment: 'neutral' as const  // API에서 sentiment를 제공하지 않으면 neutral로 설정
        }))
        
        setNewsKeywords(formattedKeywords)
        console.log('✅ 뉴스 키워드 설정 완료:', formattedKeywords.length, '개')
      } else {
        // 데이터가 없으면 빈 배열
        setNewsKeywords([])
        console.log('⚠️ 뉴스 키워드 없음')
      }
      
    } catch (error) {
      console.error('❌ 뉴스 키워드 로드 에러:', error)
      // 에러 시 더미 데이터 사용
      setNewsKeywords(generateNewsKeywords())
    }
  }

  // AI 논평 가져오기 (Claude API 사용)
  const fetchAICommentary = async (match: Match) => {
    try {
      console.log(`🤖 AI 논평 요청: ${match.homeTeam} vs ${match.awayTeam}`)
      
      // 로딩 상태 설정
      setCommentaryLoading(prev => ({ ...prev, [match.id]: true }))
      
      const response = await fetch('/api/ai-commentary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ match })
      })
      
      if (!response.ok) {
        throw new Error('AI 논평 생성 실패')
      }
      
      const data = await response.json()
      console.log('✅ AI 논평 응답:', data.commentary)
      
      // 논평 저장
      setAiCommentaries(prev => ({ ...prev, [match.id]: data.commentary }))
      
    } catch (error) {
      console.error('❌ AI 논평 로드 에러:', error)
      
      // 폴백: 기본 논평
      const homeWin = typeof match.homeWinRate === 'number' 
        ? match.homeWinRate 
        : parseFloat(String(match.homeWinRate))
      const awayWin = typeof match.awayWinRate === 'number'
        ? match.awayWinRate
        : parseFloat(String(match.awayWinRate))
      const homeAwayDiff = Math.abs(homeWin - awayWin)
      
      let fallback = ''
      if (homeAwayDiff < 10) {
        fallback = `${match.homeTeam}와 ${match.awayTeam}의 팽팽한 승부가 예상됩니다.`
      } else if (homeWin > awayWin) {
        fallback = `${match.homeTeam}이 홈에서 유리한 경기를 펼칠 것으로 보입니다.`
      } else {
        fallback = `${match.awayTeam}의 강력한 원정 경기력이 기대됩니다.`
      }
      
      setAiCommentaries(prev => ({ ...prev, [match.id]: fallback }))
    } finally {
      setCommentaryLoading(prev => ({ ...prev, [match.id]: false }))
    }
  }

  // 경기 클릭 핸들러
  const handleMatchClick = async (match: Match) => {
    if (expandedMatchId === match.id) {
      setExpandedMatchId(null)
    } else {
      setExpandedMatchId(match.id)
      
      // 실제 뉴스 API 호출 (영문 팀명 사용)
      fetchNewsKeywords(match.homeTeam, match.awayTeam)
      
      // 🔥 카드 클릭 시 항상 트렌드 데이터 새로고침
      console.log('📊 트렌드 데이터 강제 새로고침:', match.id)
      const freshTrend = await fetchTrendData(match.id.toString(), match)
                  
      setTimeout(() => {
        const chartContainer = document.getElementById(`trend-chart-${match.id}`)
        const currentTrend = freshTrend || trendData[match.id]
        
        // 트렌드 데이터가 있을 때만 차트 렌더링
        if (chartContainer) {
          if (currentTrend && currentTrend.length > 0) {
            console.log('📈 차트 렌더링 시작:', currentTrend.length, 'points')
            renderChart(chartContainer, currentTrend)
          } else {
            console.log('⚠️ 차트 렌더링 실패 - 데이터 없음')
            // renderChart가 알아서 "데이터 수집 중" 메시지 표시
            renderChart(chartContainer, [])
          }
        }
      }, 100)
    }
  }

  // 차트 렌더링 함수
  function renderChart(container: HTMLElement, trend: TrendData[]) {
    container.innerHTML = ''

    // ✅ 최소 데이터 포인트 체크: 최소 2개 이상 필요
    if (!trend || trend.length < 2) {
      console.log('⚠️ 트렌드 데이터 부족:', trend?.length || 0, '개 (최소 2개 필요)')
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[300px] text-center ${darkMode ? 'bg-black' : 'bg-white'} rounded-lg">
          <div class="text-6xl mb-4">📊</div>
          <div class="text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2">
            트렌드 데이터 수집 중...
          </div>
          <div class="text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
            30분마다 자동으로 데이터가 업데이트됩니다
          </div>
          <div class="flex items-center gap-4 px-6 py-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-gray-100'}">
            <div class="text-center">
              <div class="text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}">${trend?.length || 0}</div>
              <div class="text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}">현재</div>
            </div>
            <div class="text-2xl ${darkMode ? 'text-gray-700' : 'text-gray-300'}">/</div>
            <div class="text-center">
              <div class="text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}">48+</div>
              <div class="text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}">목표 (24시간)</div>
            </div>
          </div>
          <div class="mt-4 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}">
            💡 24시간 후 완전한 트렌드 차트를 확인하실 수 있습니다
          </div>
        </div>
      `
      return
    }

    // Y축 범위 동적 계산 (개선 버전)
    const allValues = trend.flatMap(point => [
      point.homeWinProbability,
      point.drawProbability,
      point.awayWinProbability
    ])
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    
    // 변동폭 계산
    const range = maxValue - minValue
    
    // 🎯 개선: 변동폭이 작을 때 더 크게 확대
    let padding
    if (range < 10) {
      // 변동폭 10% 미만 → 50% 패딩 (확대)
      padding = range * 1.5
    } else if (range < 20) {
      // 변동폭 20% 미만 → 30% 패딩
      padding = range * 0.8
    } else {
      // 변동폭 20% 이상 → 20% 패딩
      padding = range * 0.3
    }
    
    const yMin = Math.max(0, minValue - padding)
    const yMax = Math.min(100, maxValue + padding)

    // 🎨 애니메이션: 차트 컨테이너 페이드인
    container.style.opacity = '0'
    container.style.transition = 'opacity 0.5s ease-in'
    setTimeout(() => {
      container.style.opacity = '1'
    }, 50)

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: darkMode ? '#000000' : '#ffffff' },
        textColor: darkMode ? '#ffffff' : '#000000',
      },
      grid: {
        vertLines: { color: darkMode ? '#1f1f1f' : '#f3f4f6' },
        horzLines: { color: darkMode ? '#1f1f1f' : '#f3f4f6' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: darkMode ? '#1f1f1f' : '#e5e7eb',
      },
      rightPriceScale: {
        borderColor: darkMode ? '#1f1f1f' : '#e5e7eb',
        // 동적 Y축 범위 적용
        autoScale: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    })

    // 홈팀 승률 (파란색 영역 - 강화)
    const homeSeries = chart.addAreaSeries({
      topColor: 'rgba(59, 130, 246, 0.6)',      // 불투명도 증가
      bottomColor: 'rgba(59, 130, 246, 0.1)',   // 불투명도 증가
      lineColor: '#3b82f6',
      lineWidth: 4,                              // 두께 증가
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      lastValueVisible: true,
      priceLineVisible: false,
    })

    // 무승부 (회색 선 - 강화)
    const drawSeries = chart.addLineSeries({
      color: '#9ca3af',
      lineWidth: 3,
      lineStyle: 2, // 점선
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      lastValueVisible: true,
      priceLineVisible: false,
    })

    // 원정팀 승률 (빨간색 영역 - 강화)
    const awaySeries = chart.addAreaSeries({
      topColor: 'rgba(239, 68, 68, 0.6)',       // 불투명도 증가
      bottomColor: 'rgba(239, 68, 68, 0.1)',    // 불투명도 증가
      lineColor: '#ef4444',
      lineWidth: 4,                              // 두께 증가
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      lastValueVisible: true,
      priceLineVisible: false,
    })

    // 중복 시간 제거 및 데이터 준비
    const uniqueTrend: TrendData[] = []
    const seenTimes = new Set<number>()
    
    for (const point of trend) {
      const timeInSeconds = Math.floor(new Date(point.timestamp).getTime() / 1000)
      if (!seenTimes.has(timeInSeconds)) {
        seenTimes.add(timeInSeconds)
        uniqueTrend.push(point)
      }
    }
    
    console.log(`📊 차트 데이터: 전체 ${trend.length}개, 고유 ${uniqueTrend.length}개`)

    const homeData = uniqueTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.homeWinProbability,
    }))

    const drawData = uniqueTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.drawProbability,
    }))

    const awayData = uniqueTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.awayWinProbability,
    }))

    homeSeries.setData(homeData)
    drawSeries.setData(drawData)
    awaySeries.setData(awayData)

    // 데이터 포인트 마커 추가 (각 시간대별)
    const markers = uniqueTrend.map((point, index) => {
      const time = Math.floor(new Date(point.timestamp).getTime() / 1000) as any
      const isLatest = index === uniqueTrend.length - 1  // 🎨 최신 포인트
      
      // 최고값을 가진 팀에만 마커 표시
      const maxProb = Math.max(
        point.homeWinProbability,
        point.drawProbability,
        point.awayWinProbability
      )
      
      let color = '#9ca3af'
      let position: 'belowBar' | 'aboveBar' = 'aboveBar'
      
      if (maxProb === point.homeWinProbability) {
        color = '#3b82f6'
        position = 'aboveBar'
      } else if (maxProb === point.awayWinProbability) {
        color = '#ef4444'
        position = 'belowBar'
      }
      
      return {
        time,
        position,
        color,
        shape: 'circle' as const,
        size: isLatest ? 1.5 : 0.5,  // 🎨 최신 포인트 크게
      }
    })
    
    // 홈팀 시리즈에 마커 추가
    homeSeries.setMarkers(markers.filter(m => m.color === '#3b82f6'))
    // 원정팀 시리즈에 마커 추가
    awaySeries.setMarkers(markers.filter(m => m.color === '#ef4444'))

    // Y축 범위 수동 설정
    chart.priceScale('right').applyOptions({
      autoScale: false,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    })
    
    // 모든 시리즈에 동일한 Y축 범위 적용
    homeSeries.priceScale().applyOptions({
      autoScale: false,
      mode: 0, // Normal
      invertScale: false,
      alignLabels: true,
      borderVisible: true,
      borderColor: darkMode ? '#1f1f1f' : '#e5e7eb',
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    })

    chart.timeScale().fitContent()
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* SEO용 H1 태그 - 화면에서 숨김 */}
      <h1 className="sr-only">
        실시간 해외축구 경기 예측 & 프리뷰 플랫폼 · Trend Soccer
      </h1>
      

      {/* 승률 배너 (자동 스크롤) */}
      
      {/* 데스크톱: 세로형 카드 */}
      <div className="hidden md:block bg-[#0f0f0f] border-b border-gray-900">
        <div className="py-2 overflow-hidden">
          <div 
            ref={desktopScrollRef}
            className="flex gap-4 px-4 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'auto' }}
          >
            {(() => {
              // 🆕 상단 롤링은 항상 전체 경기 기준
              const bannerMatches = allMatchesForBanner.length > 0 ? allMatchesForBanner : matches
              const uniqueMatches = bannerMatches.slice(0, 20)
              // 무한 스크롤을 위해 2번 반복
              return [...uniqueMatches, ...uniqueMatches].map((match, index) => {
              const currentTrend = trendData[match.id]
              const latestTrend = currentTrend?.[currentTrend.length - 1]
              
              const homeWin = latestTrend 
                ? Math.round(latestTrend.homeWinProbability)
                : match.homeWinRate
              const awayWin = latestTrend 
                ? Math.round(latestTrend.awayWinProbability)
                : match.awayWinRate
              
              const homeTeam = currentLanguage === 'ko' 
                ? (match.homeTeamKR || match.homeTeam)
                : match.homeTeam
              const homeTeamDisplay = homeTeam.length > 15 
                ? homeTeam.substring(0, 15) + '...' 
                : homeTeam
              
              const awayTeam = currentLanguage === 'ko'
                ? (match.awayTeamKR || match.awayTeam)
                : match.awayTeam
              const awayTeamDisplay = awayTeam.length > 15 
                ? awayTeam.substring(0, 15) + '...' 
                : awayTeam
              
              const isHomeWinning = homeWin > awayWin
              const winningTeam = isHomeWinning ? homeTeamDisplay : awayTeamDisplay
              const winningCrest = isHomeWinning ? match.homeCrest : match.awayCrest
              const winProbability = isHomeWinning ? homeWin : awayWin
              
              return (
                <div
                  key={`${match.id}-${index}`}
                  onClick={() => {
                    // 경기 카드로 스크롤
                    const element = document.getElementById(`match-card-${match.id}`)
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                    // 경기 확장
                    handleMatchClick(match)
                  }}
                  className={`flex flex-col p-2 rounded-lg min-w-[140px] cursor-pointer transition-all bg-[#1a1a1a] border border-gray-800 ${
                    expandedMatchId === match.id ? 'ring-2 ring-blue-500' : 'hover:scale-105 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <img 
                      src={winningCrest} 
                      alt={winningTeam} 
                      className="w-6 h-6"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">⚽</text></svg>'
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {winningTeam}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {isHomeWinning ? (currentLanguage === 'ko' ? '홈' : 'Home') : (currentLanguage === 'ko' ? '원정' : 'Away')}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-xl font-black ${
                    darkMode ? 'text-white' : 'text-black'
                  }`}>
                    {winProbability}%
                  </div>
                  <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {currentLanguage === 'ko' ? '승률' : 'Win Probability'}
                  </div>
                  
                  <div className={`text-xs font-medium mt-1 pt-1 border-t ${
                    darkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'
                  }`}>
                    {match.homeTeam} - {match.awayTeam}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {formatTime(match.utcDate)}
                  </div>
                </div>
              )
            })
          })()}
          </div>
        </div>
      </div>

      {/* 모바일: 콤팩트 가로형 */}
      <div className="hidden bg-[#0f0f0f] border-b border-gray-900">
        <div className="py-2 overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="flex gap-2 px-3 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'auto' }}
          >
            {(() => {
              const uniqueMatches = matches.slice(0, 20)
              return [...uniqueMatches, ...uniqueMatches].map((match, index) => {
                const currentTrend = trendData[match.id]
                const latestTrend = currentTrend?.[currentTrend.length - 1]
                
                const homeWin = latestTrend 
                  ? Math.round(latestTrend.homeWinProbability)
                  : match.homeWinRate
                const awayWin = latestTrend 
                  ? Math.round(latestTrend.awayWinProbability)
                  : match.awayWinRate
                
                const homeTeam = currentLanguage === 'ko' 
                  ? (match.homeTeamKR || match.homeTeam)
                  : match.homeTeam
                const homeTeamDisplay = homeTeam.length > 8 
                  ? homeTeam.substring(0, 8) + '...' 
                  : homeTeam
                
                const awayTeam = currentLanguage === 'ko'
                  ? (match.awayTeamKR || match.awayTeam)
                  : match.awayTeam
                const awayTeamDisplay = awayTeam.length > 8 
                  ? awayTeam.substring(0, 8) + '...' 
                  : awayTeam
                
                const isHomeWinning = homeWin > awayWin
                const winningTeam = isHomeWinning ? homeTeamDisplay : awayTeamDisplay
                const winningCrest = isHomeWinning ? match.homeCrest : match.awayCrest
                const winProbability = isHomeWinning ? homeWin : awayWin
                
                return (
                  <div
                    key={`mobile-${match.id}-${index}`}
                    onClick={() => {
                      const element = document.getElementById(`match-card-${match.id}`)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                      handleMatchClick(match)
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all bg-[#1a1a1a] border border-gray-800 whitespace-nowrap ${
                      expandedMatchId === match.id ? 'ring-2 ring-blue-500' : 'hover:border-gray-700'
                    }`}
                  >
                    <img 
                      src={winningCrest} 
                      alt={winningTeam} 
                      className="w-6 h-6 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><text y="18" font-size="18">⚽</text></svg>'
                      }}
                    />
                    <span className="text-sm font-bold text-white">
                      {winningTeam}
                    </span>
                    <span className="text-lg font-black text-blue-400">
                      {winProbability}%
                    </span>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </div>
      {/* 트렌드 컨텐츠 영역 */}
      <div className="container mx-auto px-4 pt-0 md:py-3 pb-20 lg:pb-3">
        {/* TOP 하이라이트 섹션 - 메인 레이아웃과 동일한 너비 */}

        
        <div className="flex gap-8 relative">
          {/* 광고 배너 - Popular Leagues 왼쪽에 배치 (PC 전용) */}
          <aside className={`hidden xl:block flex-shrink-0 w-[300px]`} style={{ marginLeft: '-332px' }}>
            <div className="sticky top-20">
              <AdBanner slot="sidebar" />
            </div>
          </aside>

          {/* 왼쪽 사이드바: Popular Leagues (PC 전용) */}
          <aside className={`hidden lg:block w-64 flex-shrink-0`}>
            <div className="space-y-6">
              {/* Popular Leagues */}
              <div className={`rounded-2xl p-4 ${
                darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
              }`}>
                <h2 className={`text-sm font-bold mb-3 px-4 ${
                  darkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  {currentLanguage === 'ko' ? '리그 선택' : 'SELECT LEAGUE'}
                </h2>
                <nav className="space-y-1">
                  {LEAGUE_GROUPS.map((group) => {
                    const isExpanded = expandedGroups.has(group.id)
                    const hasSelectedLeague = group.leagues.some(l => l.code === selectedLeague)
                    const isAllGroup = group.id === 'all'
                    
                    return (
                      <div key={group.id}>
                        {/* 전체 그룹은 바로 리그 버튼 표시 */}
                        {isAllGroup ? (
                          group.leagues.map((league) => (
                            <button
                              key={league.code}
                              onClick={() => handleLeagueSelect(league.code, group.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all text-left ${
                                selectedLeague === league.code
                                  ? 'bg-[#A3FF4C] text-gray-900'
                                  : darkMode
                                    ? 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                                    : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center p-1 flex-shrink-0 ${
                                selectedLeague === league.code ? 'bg-white/90' : 'bg-white'
                              }`}>
                                <img 
                                  src={league.logo} 
                                  alt={league.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <span className="text-sm flex-1 truncate">
                                {currentLanguage === 'ko' ? league.name : league.nameEn}
                              </span>
                            </button>
                          ))
                        ) : (
                          <>
                            {/* 국가/지역 헤더 (클릭하면 펼침/접힘) */}
                            <button
                              onClick={() => toggleGroup(group.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                                hasSelectedLeague
                                  ? darkMode
                                    ? 'bg-gray-800/70 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                  : darkMode
                                    ? 'text-gray-400 hover:bg-gray-800/30 hover:text-gray-300'
                                    : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <div className="w-6 h-4 flex-shrink-0 overflow-hidden rounded-sm">
                                <img 
                                  src={group.flag} 
                                  alt={group.region}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://flagcdn.com/w40/eu.png'
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium flex-1">
                                {currentLanguage === 'ko' ? group.region : group.regionEn}
                              </span>
                              <svg 
                                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {/* 리그 목록 (펼쳐진 경우) */}
                            <div className={`overflow-hidden transition-all duration-200 ${
                              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                            }`}>
                              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-700/30 pl-2">
                                {group.leagues.map((league) => (
                                  <button
                                    key={league.code}
                                    onClick={() => handleLeagueSelect(league.code, group.id)}
                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all text-left ${
                                      selectedLeague === league.code
                                        ? 'bg-[#A3FF4C] text-gray-900'
                                        : darkMode
                                          ? 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                                          : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center p-0.5 flex-shrink-0 ${
                                      selectedLeague === league.code ? 'bg-white/90' : 'bg-white'
                                    }`}>
                                      <img 
                                        src={league.logo} 
                                        alt={league.name}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <span className="text-sm flex-1 truncate">
                                      {currentLanguage === 'ko' ? league.name : league.nameEn}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </nav>
              </div>

              {/* 블로그 미리보기 */}
              <BlogPreviewSidebar darkMode={darkMode} />
            </div>
          </aside>

          {/* 메인 콘텐츠 */}
          <main className="flex-1 min-w-0">
            
            {/* 🔴 라이브 중계 배너 */}
            {liveCount > 0 && (
              <a 
                href="/live"
                className={`block mb-6 rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] ${
                  darkMode 
                    ? 'bg-gradient-to-r from-red-600 via-pink-600 to-purple-600' 
                    : 'bg-gradient-to-r from-red-500 via-pink-500 to-purple-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">
                        🔴 {currentLanguage === 'ko' ? `지금 ${liveCount}개 경기 진행 중!` : `${liveCount} Live Matches Now!`}
                      </h2>
                      <p className="text-white/90 text-sm">
                        {currentLanguage === 'ko' 
                          ? '실시간 점수와 배당 변화를 확인하세요 • 15초마다 자동 업데이트'
                          : 'Check live scores and odds • Auto-update every 15 seconds'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-white text-5xl font-bold hidden sm:block">
                    →
                  </div>
                </div>
              </a>
            )}
            
            {/* 상단 배너 728x90 - 날짜 필터 위 (데스크톱 전용) */}
            <div className="hidden lg:flex justify-center mb-6">
              <AdBanner slot="desktop_banner" />
            </div>

        {/* 🔥 모바일 PICK 배너 - 컴팩트 버전 (최상단) */}
        <a 
          href="/premium"
          className="lg:hidden block mb-3 active:scale-[0.98] transition-transform"
        >
          <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-xl p-[1.5px] shadow-lg shadow-orange-500/20">
            <div className="bg-[#0a0a0f] rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                {/* 왼쪽: 타이틀 + 적중률 */}
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔥</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">
                        {currentLanguage === 'ko' ? '트렌드 PICK' : 'Trend PICK'}
                      </span>
                      <span className="text-[9px] text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded-full animate-pulse font-medium">
                        ● LIVE
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-yellow-400 font-black text-lg">67%</span>
                      <span className="text-gray-500 text-[10px]">적중률</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-white font-bold text-xs">8,200+</span>
                      <span className="text-gray-500 text-[10px]">경기</span>
                    </div>
                  </div>
                </div>
                
                {/* 오른쪽: CTA */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg px-3 py-2">
                  <span className="text-white font-bold text-xs whitespace-nowrap">
                    {currentLanguage === 'ko' ? '확인하기 →' : 'View →'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </a>

        {/* 🆕 날짜 네비게이션 - 좌우 화살표 스타일 */}
        <div className="mb-4 md:mb-8">
          <div className="flex items-center justify-center gap-4">
            {/* 이전 날짜 */}
            <button
              onClick={goToPreviousDay}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                darkMode 
                  ? 'bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* 현재 날짜 + 경기 수 */}
            <button
              onClick={goToToday}
              className={`flex items-center gap-3 px-5 py-2.5 rounded-xl transition-all ${
                darkMode 
                  ? 'bg-[#1a1a1a] hover:bg-[#252525]' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatDateDisplay(selectedDate)}
              </span>
              <span className={`text-sm px-2 py-0.5 rounded-full ${
                darkMode ? 'bg-[#252525] text-gray-400' : 'bg-gray-200 text-gray-600'
              }`}>
                {getMatchesForDate(selectedDate).length}{currentLanguage === 'ko' ? '경기' : ' matches'}
              </span>
              <svg className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* 다음 날짜 */}
            <button
              onClick={goToNextDay}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                darkMode 
                  ? 'bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

{/* 💻 PC: 유튜브 하이라이트 */}
<div className="hidden md:block mb-4">
  <TopHighlights darkMode={darkMode} />
</div>

        {/* 상단 광고 배너 */}
        

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">⚽</div>
            <p className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t.status.loading}
            </p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className={`p-6 rounded-2xl text-center ${darkMode ? 'bg-gray-900 text-gray-300 border border-gray-800' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
            <p className="text-lg font-medium">{error}</p>
          </div>
        )}

        {/* 경기 목록 - 1열 레이아웃 */}
        {!loading && !error && (
          <div className="grid gap-6 grid-cols-1">
            {(() => {
              // 🆕 선택된 날짜 기준 필터링 (한국 시간 기준)
              const selectedDateKey = formatDateKey(selectedDate)
              
              let filteredMatches = matches.filter(match => {
                const matchKST = getMatchKSTDate(match.utcDate)
                const matchKey = formatDateKey(matchKST)
                return matchKey === selectedDateKey
              })
              
              // 페이지네이션
              const totalMatches = filteredMatches.length
              const totalPages = Math.ceil(totalMatches / MATCHES_PER_PAGE)
              const startIndex = (currentPage - 1) * MATCHES_PER_PAGE
              const endIndex = startIndex + MATCHES_PER_PAGE
              const paginatedMatches = filteredMatches.slice(startIndex, endIndex)
              
              return (
                <>
                  {/* 경기 없음 안내 */}
                  {filteredMatches.length === 0 && (
                    <div className={`text-center py-12 rounded-2xl ${
                      darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-100'
                    }`}>
                      <div className="text-4xl mb-4">⚽</div>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {currentLanguage === 'ko' 
                          ? '이 날짜에 예정된 경기가 없습니다'
                          : 'No matches scheduled on this date'
                        }
                      </p>
                      <button
                        onClick={() => {
                          const earliest = findEarliestMatchDate()
                          if (earliest) setSelectedDate(earliest)
                        }}
                        className="mt-4 px-4 py-2 bg-[#A3FF4C] text-gray-900 rounded-lg text-sm font-medium hover:bg-[#8FE63D] transition-colors"
                      >
                        {currentLanguage === 'ko' ? '가장 빠른 경기로 이동' : 'Go to earliest match'}
                      </button>
                    </div>
                  )}

                  {paginatedMatches.length === 0 ? (
                    null  // 이미 위에서 경기 없음 UI 표시
                  ) : (
                    <>
                      {/* ━━━━━━ FotMob 스타일: 리그별 그룹화 ━━━━━━ */}
                      {(() => {
                        // 리그별로 경기 그룹화
                        const matchesByLeague: { [key: string]: typeof paginatedMatches } = {}
                        paginatedMatches.forEach(match => {
                          const code = match.leagueCode || 'OTHER'
                          if (!matchesByLeague[code]) matchesByLeague[code] = []
                          matchesByLeague[code].push(match)
                        })

                        // LEAGUES 순서대로 정렬
                        const orderedLeagues = LEAGUES
                          .filter(l => l.code !== 'ALL' && matchesByLeague[l.code])
                          .map(l => l.code)
                        Object.keys(matchesByLeague).forEach(code => {
                          if (!orderedLeagues.includes(code)) orderedLeagues.push(code)
                        })

                        return orderedLeagues.map((leagueCode, leagueIndex) => {
                          const leagueMatches = matchesByLeague[leagueCode]
                          const league = LEAGUES.find(l => l.code === leagueCode)

                          return (
                            <React.Fragment key={leagueCode}>
                              {/* 첫 번째 리그 다음에 매치 리포트 삽입 (모바일만) */}
                              {leagueIndex === 1 && (
                                <div className="md:hidden mb-4">
                                  <MobileMatchReports darkMode={darkMode} />
                                </div>
                              )}
                              <div 
                                className={`rounded-xl overflow-hidden mb-4 ${
                                  darkMode ? 'bg-[#111]' : 'bg-white shadow-sm border border-gray-100'
                                }`}
                              >
                                {/* 리그 헤더 */}
                                <div className={`flex items-center gap-3 px-4 py-3 ${
                                  darkMode ? 'bg-[#0a0a0a]' : 'bg-gray-50'
                                }`}>
                                  {league?.isEmoji ? (
                                    <span className="text-xl">{league.logo}</span>
                                  ) : (
                                    <div className="w-6 h-6 bg-white rounded flex items-center justify-center p-0.5">
                                      <img 
                                        src={league?.logo || getLeagueLogo(leagueCode)} 
                                        alt={leagueCode}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                  )}
                                  <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {getLeagueName(leagueCode, currentLanguage)}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    {leagueMatches.length}
                                  </span>
                                </div>

                              {/* 경기 목록 */}
                              <div className={`divide-y ${darkMode ? 'divide-gray-900' : 'divide-gray-100'}`}>
                                {leagueMatches.map((match) => {
                                  const currentTrend = trendData[match.id]
                                  const latestTrend = currentTrend?.[currentTrend.length - 1]
                                  const previousTrend = currentTrend?.[currentTrend.length - 2]
                                  
                                  const displayHomeProb = latestTrend ? latestTrend.homeWinProbability : (match.homeWinRate || 33.3)
                                  const displayDrawProb = latestTrend ? latestTrend.drawProbability : (match.drawRate || 33.3)
                                  const displayAwayProb = latestTrend ? latestTrend.awayWinProbability : (match.awayWinRate || 33.3)
                                  
                                  const homeChange = latestTrend && previousTrend 
                                    ? latestTrend.homeWinProbability - previousTrend.homeWinProbability : 0
                                  const awayChange = latestTrend && previousTrend 
                                    ? latestTrend.awayWinProbability - previousTrend.awayWinProbability : 0

                                  const homeTeamName = currentLanguage === 'ko' ? (match.homeTeamKR || match.homeTeam) : match.homeTeam
                                  const awayTeamName = currentLanguage === 'ko' ? (match.awayTeamKR || match.awayTeam) : match.awayTeam
                                  const truncate = (name: string, max: number) => name.length > max ? name.substring(0, max) + '...' : name
                                  const isExpanded = expandedMatchId === match.id

                                  return (
                                    <div 
                                      key={match.id}
                                      id={`match-card-${match.id}`}
                                      className={`transition-all duration-300 ${
                                        isExpanded ? 'bg-[#0d1f0d]' : ''
                                      }`}
                                    >
                                      {/* ━━━ 경기 행 (클릭 가능) ━━━ */}
                                      <div 
                                        onClick={() => handleMatchClick(match)}
                                        className={`flex items-center cursor-pointer px-3 py-3 md:px-4 ${
                                          darkMode ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-50'
                                        } ${isExpanded ? '!bg-[#0d1f0d]' : ''}`}
                                      >
                                        {/* 시간 + 날짜 */}
                                        <div className="w-16 md:w-20 flex-shrink-0">
                                          <div className={`text-sm md:text-base font-bold tabular-nums ${
                                            isExpanded ? 'text-[#A3FF4C]' : darkMode ? 'text-gray-400' : 'text-gray-600'
                                          }`}>
                                            {formatTime(match.utcDate)}
                                          </div>
                                          <div className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                            {formatDate(match.utcDate, currentLanguage)}
                                          </div>
                                        </div>

                                        {/* 홈팀 */}
                                        <div className="flex-1 flex items-center justify-end gap-2 min-w-0 pr-2">
                                          <span className={`text-sm md:text-base font-medium truncate text-right ${
                                            darkMode ? 'text-white' : 'text-gray-900'
                                          }`}>
                                            {truncate(homeTeamName, 12)}
                                          </span>
                                          <img 
                                            src={match.homeCrest} 
                                            alt={match.homeTeam}
                                            className="w-7 h-7 md:w-8 md:h-8 object-contain flex-shrink-0"
                                            onError={(e) => {
                                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="%23333"/></svg>'
                                            }}
                                          />
                                        </div>

                                        {/* VS */}
                                        <div className="w-20 md:w-24 flex-shrink-0 flex justify-center">
                                          <div className={`text-xs font-bold px-3 py-1 rounded ${
                                            isExpanded 
                                              ? 'bg-[#A3FF4C]/20 text-[#A3FF4C] border border-[#A3FF4C]/30' 
                                              : darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'
                                          }`}>
                                            VS
                                          </div>
                                        </div>

                                        {/* 원정팀 */}
                                        <div className="flex-1 flex items-center justify-start gap-2 min-w-0 pl-2">
                                          <img 
                                            src={match.awayCrest} 
                                            alt={match.awayTeam}
                                            className="w-7 h-7 md:w-8 md:h-8 object-contain flex-shrink-0"
                                            onError={(e) => {
                                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="%23333"/></svg>'
                                            }}
                                          />
                                          <span className={`text-sm md:text-base font-medium truncate ${
                                            darkMode ? 'text-white' : 'text-gray-900'
                                          }`}>
                                            {truncate(awayTeamName, 12)}
                                          </span>
                                        </div>

                                        {/* 확장 화살표 */}
                                        <div className="w-6 flex-shrink-0 flex justify-end">
                                          <svg 
                                            className={`w-4 h-4 transition-transform duration-300 ${
                                              isExpanded ? 'rotate-180 text-[#A3FF4C]' : darkMode ? 'text-gray-600' : 'text-gray-400'
                                            }`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </div>
                                      </div>

                                      {/* ━━━ 확장된 상세 정보 ━━━ */}
                                      {isExpanded && (
                                        <div className="border-t border-[#A3FF4C]/20 animate-fadeIn">
                                          {/* 승률 바 */}
                                          <div className="px-4 py-4">
                                            <div className="flex h-2 rounded-full overflow-hidden bg-gray-900 mb-3">
                                              <div className="bg-blue-500 transition-all duration-500" style={{ width: `${displayHomeProb}%` }} />
                                              <div className="bg-gray-600 transition-all duration-500" style={{ width: `${displayDrawProb}%` }} />
                                              <div className="bg-red-500 transition-all duration-500" style={{ width: `${displayAwayProb}%` }} />
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                              <div className="flex items-center gap-2">
                                                <span className="text-blue-400 font-bold">{Math.round(displayHomeProb)}%</span>
                                                {homeChange !== 0 && (
                                                  <span className={`text-xs ${homeChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {homeChange > 0 ? '↑' : '↓'}{Math.abs(homeChange).toFixed(1)}
                                                  </span>
                                                )}
                                              </div>
                                              <span className="text-gray-500 font-medium">{Math.round(displayDrawProb)}%</span>
                                              <div className="flex items-center gap-2">
                                                {awayChange !== 0 && (
                                                  <span className={`text-xs ${awayChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {awayChange > 0 ? '↑' : '↓'}{Math.abs(awayChange).toFixed(1)}
                                                  </span>
                                                )}
                                                <span className="text-red-400 font-bold">{Math.round(displayAwayProb)}%</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                                              <span>{currentLanguage === 'ko' ? '홈 승' : 'Home'}</span>
                                              <span>{currentLanguage === 'ko' ? '무승부' : 'Draw'}</span>
                                              <span>{currentLanguage === 'ko' ? '원정 승' : 'Away'}</span>
                                            </div>
                                          </div>

                                          {/* 액션 버튼 */}
                                          <div className="flex gap-2 px-4 pb-4">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedMatchForLineup(match)
                                                setLineupModalOpen(true)
                                              }}
                                              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#A3FF4C] hover:bg-[#92FF3A] text-gray-900 text-sm font-semibold transition-all"
                                            >
                                              <span>⚽</span>
                                              <span>{currentLanguage === 'ko' ? '라인업' : 'Lineup'}</span>
                                            </button>
                                          </div>

                                          {/* AI 경기 예측 분석 */}
                                          <div className="border-t border-[#A3FF4C]/20">
                                            <MatchPrediction
                                              fixtureId={match.id}
                                              homeTeam={match.homeTeam}
                                              awayTeam={match.awayTeam}
                                              homeTeamKR={match.homeTeamKR}
                                              awayTeamKR={match.awayTeamKR}
                                              homeTeamId={match.home_team_id}
                                              awayTeamId={match.away_team_id}
                                              trendData={trendData[match.id] || []}
                                              darkMode={darkMode}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            
                            {/* 📱 모바일 인피드 배너 - 첫 번째 리그 다음에 표시 */}
                            {leagueIndex === 0 && (
                              <div className="block lg:hidden mb-4 flex justify-center">
                                <AdBanner slot="mobile_bottom" />
                              </div>
                            )}
                          </React.Fragment>
                          )
                        })
                      })()}
            
            {/* 페이지네이션 - 모던 스타일 */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-4 mt-10 mb-6">
                {/* 페이지 정보 - 상단 */}
                <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  <span className="text-[#A3FF4C] font-bold">{totalMatches}</span>
                  {currentLanguage === 'ko' ? ' 경기 중 ' : ' matches • '}
                  <span className="font-medium">{currentPage}</span>
                  <span className="mx-1">/</span>
                  <span>{totalPages}</span>
                  {currentLanguage === 'ko' ? ' 페이지' : ''}
                </div>

                {/* 페이지 버튼들 */}
                <div className="flex items-center gap-1">
                  {/* 이전 버튼 */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                      ${currentPage === 1
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }
                    `}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  {/* 페이지 번호들 */}
                  <div className="flex items-center">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      const isActive = currentPage === page
                      const isNear = page >= currentPage - 1 && page <= currentPage + 1
                      const isEdge = page === 1 || page === totalPages
                      const showDots = page === currentPage - 2 || page === currentPage + 2

                      if (isEdge || isNear) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`
                              w-10 h-10 rounded-full font-medium text-sm transition-all duration-200
                              ${isActive
                                ? 'bg-[#A3FF4C] text-gray-900 scale-110'
                                : darkMode
                                  ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }
                            `}
                          >
                            {page}
                          </button>
                        )
                      } else if (showDots) {
                        return (
                          <span key={page} className="w-8 text-center text-gray-600 text-sm">
                            •••
                          </span>
                        )
                      }
                      return null
                    })}
                  </div>

                  {/* 다음 버튼 */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                      ${currentPage === totalPages
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }
                    `}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* 프로그레스 바 */}
                <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#A3FF4C] to-[#62F4FF] rounded-full transition-all duration-300"
                    style={{ width: `${(currentPage / totalPages) * 100}%` }}
                  />
                </div>
              </div>
            )}
            </>
          )}
        </>
      )
    })()}
          </div>
        )}

          </main>

          {/* 우측 순위표 사이드바 */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
            {/* HilltopAds - 순위표 위 배너 (데스크톱 전용) - 임시 비활성화 */}
            {/* 
            <div className={`hidden lg:block mb-6 rounded-xl overflow-hidden ${
              darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
            }`}>
              <div className="p-4">
                <div id="hilltop-ad-container"></div>
              </div>
            </div>
            */}
            
            {/* 전체 리그 선택 시 - 캐러셀 */}
            {selectedLeague === 'ALL' && (
              <div className={`rounded-xl overflow-hidden select-none ${
                darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
              }`}>
                {/* 헤더 with 좌우 화살표 */}
                <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    {/* 왼쪽 화살표 */}
                    <button
                      onClick={() => {
                        const newIndex = currentLeagueIndex === 0 
                          ? standingsLeagues.length - 1 
                          : currentLeagueIndex - 1
                        setCurrentLeagueIndex(newIndex)
                        setStandings(allLeagueStandings[standingsLeagues[newIndex].code] || [])
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    {/* 리그명 + 로고 */}
                    <div className="flex items-center gap-3">
                      <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {currentLanguage === 'ko' 
                          ? (standingsLeagues[currentLeagueIndex]?.name || '프리미어리그')
                          : (standingsLeagues[currentLeagueIndex]?.nameEn || 'Premier League')
                        }
                      </h2>
                      <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
                        {standingsLeagues[currentLeagueIndex]?.isEmoji ? (
                          <span className="text-2xl">{standingsLeagues[currentLeagueIndex]?.logo}</span>
                        ) : (
                          <img 
                            src={standingsLeagues[currentLeagueIndex]?.logo}
                            alt={standingsLeagues[currentLeagueIndex]?.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/40?text=?'
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* 오른쪽 화살표 */}
                    <button
                      onClick={() => {
                        const newIndex = currentLeagueIndex === standingsLeagues.length - 1 
                          ? 0 
                          : currentLeagueIndex + 1
                        setCurrentLeagueIndex(newIndex)
                        setStandings(allLeagueStandings[standingsLeagues[newIndex].code] || [])
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 테이블 헤더 */}
                <div className={`px-4 py-3 flex items-center text-xs font-bold tracking-wide ${
                  darkMode ? 'text-gray-500 bg-[#0f0f0f] border-b border-gray-800' : 'text-gray-500 bg-gray-50 border-b border-gray-200'
                }`}>
                  <div className="w-8">#</div>
                  <div className="flex-1">{currentLanguage === 'ko' ? '팀명' : 'TEAM'}</div>
                  <div className="w-12 text-center">{currentLanguage === 'ko' ? '경기' : 'MP'}</div>
                  <div className="w-12 text-center">{currentLanguage === 'ko' ? '득실' : 'GD'}</div>
                  <div className="w-12 text-right">{currentLanguage === 'ko' ? '승점' : 'PTS'}</div>
                </div>

                {/* 순위표 내용 */}
                <div className="p-0">
                  {standingsLoading ? (
                    <div className="text-center py-12">
                      <div className="text-3xl mb-2 animate-bounce">⚽</div>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        로딩 중...
                      </p>
                    </div>
                  ) : standings.length > 0 ? (
                    <div>
                      {standings.slice(0, standingsExpanded ? 20 : 5).map((team: any, index: number) => {
                        const position = team.position || index + 1
                        const isTopFour = position <= 4
                        const isRelegation = position >= 18
                        
                        return (
                          <div 
                            key={team.team?.id || index}
                            className={`flex items-center px-4 py-2.5 transition-colors ${
                              darkMode 
                                ? 'hover:bg-gray-800/50 border-b border-gray-800' 
                                : 'hover:bg-gray-50 border-b border-gray-100'
                            }`}
                          >
                            <div className="w-8 flex items-center">
                              <span className={`text-sm font-bold ${
                                isRelegation 
                                  ? 'text-red-500' 
                                  : isTopFour 
                                    ? 'text-green-500' 
                                    : darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {position}
                              </span>
                            </div>

                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <img 
                                src={team.team?.crest || getTeamLogo(team.team?.name || '')}
                                alt={team.team?.name}
                                className="w-5 h-5 object-contain flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/20?text=?'
                                }}
                              />
                              <span className={`text-sm font-medium truncate ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {team.team?.name}
                              </span>
                            </div>

                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.playedGames || 10}
                            </div>
                            
                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.goalDifference > 0 ? '+' : ''}{team.goalDifference || 0}
                            </div>

                            <div className="w-12 text-right">
                              <span className="text-sm font-bold text-white">
                                {team.points || 0}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* 펼치기/접기 버튼 */}
                      {standings.length > 5 && (
                        <button
                          type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStandingsExpanded(!standingsExpanded); }}
                          className={`w-full py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                            darkMode 
                              ? 'text-emerald-400 hover:bg-gray-800/50' 
                              : 'text-emerald-600 hover:bg-gray-50'
                          }`}
                        >
                          {standingsExpanded ? (
                            <>
                              <span>접기</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </>
                          ) : (
                            <>
                              <span>전체 순위 보기</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        순위표 정보가 없습니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 특정 리그 선택 시 - 기존 순위표 (컵대회 제외) */}
            {selectedLeague !== 'ALL' && !CUP_COMPETITIONS.includes(selectedLeague) && (
              <div className={`rounded-xl overflow-hidden select-none ${
                darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
              }`}>
                {/* 헤더 */}
                <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {getLeagueName(selectedLeague, currentLanguage)}
                    </h2>
                    {/* 리그 로고 */}
                    <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
                      {LEAGUES.find(l => l.code === selectedLeague)?.isEmoji ? (
                        <span className="text-2xl">{LEAGUES.find(l => l.code === selectedLeague)?.logo}</span>
                      ) : (
                        <img 
                          src={LEAGUES.find(l => l.code === selectedLeague)?.logo}
                          alt={getLeagueName(selectedLeague, currentLanguage)}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/40?text=?'
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* 테이블 헤더 */}
                <div className={`px-4 py-3 flex items-center text-xs font-bold tracking-wide ${
                  darkMode ? 'text-gray-500 bg-[#0f0f0f] border-b border-gray-800' : 'text-gray-500 bg-gray-50 border-b border-gray-200'
                }`}>
                  <div className="w-8">#</div>
                  <div className="flex-1">{currentLanguage === 'ko' ? '팀명' : 'TEAM'}</div>
                  <div className="w-12 text-center">{currentLanguage === 'ko' ? '경기' : 'MP'}</div>
                  <div className="w-12 text-center">{currentLanguage === 'ko' ? '득실' : 'GD'}</div>
                  <div className="w-12 text-right">{currentLanguage === 'ko' ? '승점' : 'PTS'}</div>
                </div>

                {/* 순위표 내용 */}
                <div className="p-0">
                  {standingsLoading ? (
                    <div className="text-center py-12">
                      <div className="text-3xl mb-2 animate-bounce">⚽</div>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        로딩 중...
                      </p>
                    </div>
                  ) : standings.length > 0 ? (
                    <div>
                      {standings.slice(0, standingsExpanded ? 20 : 5).map((team: any, index: number) => {
                        const position = team.position || index + 1
                        const isTopFour = position <= 4
                        const isRelegation = position >= 18
                        
                        return (
                          <div 
                            key={team.team?.id || index}
                            className={`flex items-center px-4 py-2.5 transition-colors ${
                              darkMode 
                                ? 'hover:bg-gray-800/50 border-b border-gray-800' 
                                : 'hover:bg-gray-50 border-b border-gray-100'
                            }`}
                          >
                            {/* 순위 */}
                            <div className="w-8 flex items-center">
                              <span className={`text-sm font-bold ${
                                isRelegation 
                                  ? 'text-red-500' 
                                  : isTopFour 
                                    ? 'text-green-500' 
                                    : darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {position}
                              </span>
                            </div>

                            {/* 팀 로고 + 이름 */}
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <img 
                                src={team.team?.crest || getTeamLogo(team.team?.name || '')}
                                alt={team.team?.name}
                                className="w-5 h-5 object-contain flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/20?text=?'
                                }}
                              />
                              <span className={`text-sm font-medium truncate ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {team.team?.name}
                              </span>
                            </div>

                            {/* 경기 수 */}
                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.playedGames || 10}
                            </div>
                            
                            {/* 득실차 */}
                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.goalDifference > 0 ? '+' : ''}{team.goalDifference || 0}
                            </div>

                            {/* 승점 */}
                            <div className="w-12 text-right">
                              <span className="text-sm font-bold text-white">
                                {team.points || 0}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* 펼치기/접기 버튼 */}
                      {standings.length > 5 && (
                        <button
                          type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStandingsExpanded(!standingsExpanded); }}
                          className={`w-full py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                            darkMode 
                              ? 'text-emerald-400 hover:bg-gray-800/50' 
                              : 'text-emerald-600 hover:bg-gray-50'
                          }`}
                        >
                          {standingsExpanded ? (
                            <>
                              <span>접기</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </>
                          ) : (
                            <>
                              <span>전체 순위 보기</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        순위표 정보가 없습니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 📰 사이드바 뉴스 섹션 */}
            {sidebarNews.length > 0 && (
              <div className={`rounded-xl overflow-hidden select-none ${
                darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
              }`}>
                <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <span>{currentLanguage === 'ko' ? '지금 뜨는' : 'Trending'}</span>
                    <span className="text-emerald-500">{currentLanguage === 'ko' ? '축구 뉴스' : 'Football News'}</span>
                  </h3>
                </div>
                <div className="p-2">
                  {sidebarNews.map((news: any, idx: number) => (
                    <a
                      key={news.id || idx}
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block px-3 py-2.5 rounded-lg transition-colors ${
                        darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className={`text-sm leading-snug line-clamp-2 ${
                        darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                      }`}>
                        {news.title}
                      </p>
                    </a>
                  ))}
                </div>
                <a
                  href="/news"
                  className={`block text-center py-2.5 text-xs font-medium border-t transition-colors ${
                    darkMode 
                      ? 'border-gray-800 text-emerald-400 hover:bg-gray-800/50' 
                      : 'border-gray-200 text-emerald-600 hover:bg-gray-50'
                  }`}
                >
                  {currentLanguage === 'ko' ? '뉴스 더보기 →' : 'More News →'}
                </a>
              </div>
            )}
            </div>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes chartPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        
        @keyframes chartGlow {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
          }
        }
        
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .chart-container {
          animation: slideInFromLeft 0.6s ease-out;
        }
        
        .chart-latest-marker {
          animation: chartPulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* H2H 모달 */}
      {selectedMatch && (
        <H2HModal
          isOpen={h2hModalOpen}
          onClose={() => {
            setH2hModalOpen(false)
            setSelectedMatch(null)
          }}
          homeTeam={selectedMatch.homeTeam}
          awayTeam={selectedMatch.awayTeam}
          league={selectedMatch.leagueCode}
          homeTeamLogo={selectedMatch.homeCrest}
          awayTeamLogo={selectedMatch.awayCrest}
        />
      )}

      {/* 🆕 라인업 모달 */}
      {lineupModalOpen && selectedMatchForLineup && (
        <LineupModal
          isOpen={lineupModalOpen}
          onClose={() => {
            setLineupModalOpen(false)
            setSelectedMatchForLineup(null)
          }}
          fixtureId={selectedMatchForLineup.id}
          homeTeam={selectedMatchForLineup.homeTeam}
          awayTeam={selectedMatchForLineup.awayTeam}
          darkMode={darkMode}
        />
      )}

      {/* 🔥 플로팅 PICK 배너 (PC 전용) */}
      <a 
        href="/premium"
        className="hidden lg:flex fixed bottom-8 right-20 z-[9999] group"
        style={{ position: 'fixed', bottom: '32px', right: '80px' }}
      >
        {/* 배경 글로우 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
        
        {/* 메인 카드 */}
        <div className="relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-2xl p-1 shadow-2xl transform group-hover:scale-105 transition-all duration-300 overflow-hidden">
          {/* 반짝이 효과 */}
          <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:left-full transition-all duration-700" />
          
          {/* 내부 컨텐츠 */}
          <div className="relative bg-black/90 rounded-xl px-5 py-4">
            {/* 상단 라벨 */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-xl">🔥</span>
              <span className="text-white font-bold text-sm">
                {currentLanguage === 'ko' ? '트렌드 PICK' : 'Trend PICK'}
              </span>
              <span className="text-[10px] text-green-400 bg-green-500/20 px-2 py-0.5 rounded animate-pulse">LIVE</span>
            </div>
            
            {/* 적중률 */}
            <div className="text-center mb-3">
              <div className="text-gray-400 text-xs mb-1">
                {currentLanguage === 'ko' ? '평균 적중률' : 'Avg. Accuracy'}
              </div>
              <div className="text-yellow-400 font-bold text-3xl">67%</div>
            </div>
            
            {/* CTA 버튼 */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg py-2 px-4 text-center group-hover:from-orange-400 group-hover:to-red-400 transition-all">
              <span className="text-white font-bold text-sm">
                {currentLanguage === 'ko' ? '무료로 예측 확인 →' : 'View Predictions →'}
              </span>
            </div>
          </div>
        </div>
      </a>

      {/* 📢 모바일 하단 고정 배너 (320x50) */}
      {!isMobileAdClosed && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 safe-area-bottom">
          <div className="relative flex justify-center py-2">
            <button
              onClick={() => setIsMobileAdClosed(true)}
              className="absolute top-1 left-2 w-5 h-5 bg-black/70 text-white text-xs rounded-full flex items-center justify-center hover:bg-black z-10"
            >
              ✕
            </button>
            <AdBanner slot="mobile_bottom" />
            <span className="absolute top-1 right-2 px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded">
              AD
            </span>
          </div>
        </div>
      )}
    </div>
  )
}