'use client'

import { useEffect, useState, useCallback } from 'react'

// =====================================================
// 야구 개별 경기 상세 분석 광고 시청 잠금 해제 훅 (경기별)
// - localStorage 기반
// - KST 자정 자동 리셋 (날짜 키)
// - matchId 단위 독립 잠금
// =====================================================

const KEY_PREFIX = 'ts_match_unlock_'

function getKSTDateStr(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return now.toISOString().split('T')[0]
}

function makeKey(dateStr: string, matchId: string): string {
  return `${KEY_PREFIX}${dateStr}_${matchId}`
}

function readUnlock(dateStr: string, matchId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(makeKey(dateStr, matchId)) === '1'
  } catch {
    return false
  }
}

function writeUnlock(dateStr: string, matchId: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(makeKey(dateStr, matchId), '1')
    // 오늘 날짜가 아닌 과거 잠금 키 정리 (자정 리셋 효과)
    const todayPrefix = `${KEY_PREFIX}${dateStr}_`
    Object.keys(localStorage)
      .filter(k => k.startsWith(KEY_PREFIX) && !k.startsWith(todayPrefix))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

/**
 * 특정 경기(matchId)의 상세 분석 광고 잠금 해제 상태를 관리한다.
 * @param matchId 경기 식별자 (string | number | undefined 허용)
 */
export function useMatchUnlock(matchId?: string | number) {
  const id = matchId != null ? String(matchId) : ''
  const [today, setToday] = useState<string>('')
  const [unlocked, setUnlocked] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const d = getKSTDateStr()
    setToday(d)
    if (id) setUnlocked(readUnlock(d, id))
  }, [id])

  // 다른 탭/창에서 잠금 해제 시 동기화
  useEffect(() => {
    if (!mounted || !today || !id) return
    const key = makeKey(today, id)
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return
      setUnlocked(e.newValue === '1')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [mounted, today, id])

  const unlock = useCallback(() => {
    if (!today || !id) return
    writeUnlock(today, id)
    setUnlocked(true)
  }, [today, id])

  return { unlocked, unlock, today, mounted }
}
