// 시즌 자동 가중치 — 현재 월 기준으로 메인에서 강조할 종목 결정
// 유럽 축구: 8월~5월 / KBO 야구: 4월~10월 (여름 피크)
// → 5~9월(여름)은 야구 강조, 그 외는 축구 강조

import type { Sport, SportFilter } from './types'

export function getSeasonSport(date: Date = new Date()): Sport {
  const month = date.getMonth() + 1 // 1~12
  // 5,6,7,8,9월: 야구 강조 (유럽 축구 비시즌 + KBO 한창)
  if (month >= 5 && month <= 9) return 'baseball'
  return 'football'
}

// 라이브 티커/피드 정렬 등에서 종목 우선순위 가중치 (높을수록 먼저)
export function sportWeight(sport: Sport, date: Date = new Date()): number {
  return sport === getSeasonSport(date) ? 1 : 0
}

// 사용자가 아직 종목을 고르지 않았을 때(쿠키/URL 없음) 추천 기본 필터
export function seasonDefaultFilter(date: Date = new Date()): SportFilter {
  // 기본은 'all' 유지하되, 정렬에서 시즌 종목을 앞세움
  return 'all'
}

export function seasonLabel(date: Date = new Date()): string {
  return getSeasonSport(date) === 'baseball' ? '야구' : '축구'
}
