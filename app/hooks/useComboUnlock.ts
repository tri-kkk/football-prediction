'use client'

import { useEffect, useState, useCallback } from 'react'

// =====================================================
// 야구 다경기 분석 광고 시청 잠금 해제 훅 (리그별)
// - localStorage 기반
// - KST 자정 자동 리셋 (날짜 키)
// - 리그(KBO/MLB/NPB)별 독립 잠금
// =====================================================

export type ComboLeague = 'KBO' | 'MLB' | 'NPB'

const KEY_PREFIX = 'ts_combo_unlock_'

function getKSTDateStr(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return now.toISOString().split('T')[0]
}

function makeKey(dateStr: string, league: ComboLeague): string {
  return `${KEY_PREFIX}${dateStr}_${league}`
}

function readUnlock(dateStr: string, league: ComboLeague): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(makeKey(dateStr, league)) === '1'
  } catch {
    return false
  }
}

function writeUnlock(dateStr: string, league: ComboLeague) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(makeKey(dateStr, league), '1')
    const todayKeys = (['KBO', 'MLB', 'NPB'] as ComboLeague[]).map(l => makeKey(dateStr, l))
    Object.keys(localStorage)
      .filter(k => k.startsWith(KEY_PREFIX) && !todayKeys.includes(k))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

export function useComboUnlock() {
  const [today, setToday] = useState<string>('')
  const [unlocks, setUnlocks] = useState<Record<ComboLeague, boolean>>({
    KBO: false,
    MLB: false,
    NPB: false,
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const d = getKSTDateStr()
    setToday(d)
    setUnlocks({
      KBO: readUnlock(d, 'KBO'),
      MLB: readUnlock(d, 'MLB'),
      NPB: readUnlock(d, 'NPB'),
    })
  }, [])

  useEffect(() => {
    if (!mounted || !today) return
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith(KEY_PREFIX + today + '_')) return
      const league = e.key.replace(KEY_PREFIX + today + '_', '') as ComboLeague
      if (league === 'KBO' || league === 'MLB' || league === 'NPB') {
        setUnlocks(prev => ({ ...prev, [league]: e.newValue === '1' }))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [mounted, today])

  const unlock = useCallback((league: ComboLeague) => {
    if (!today) return
    writeUnlock(today, league)
    setUnlocks(prev => ({ ...prev, [league]: true }))
  }, [today])

  const hasAnyUnlock = unlocks.KBO || unlocks.MLB || unlocks.NPB

  return { unlocks, unlock, hasAnyUnlock, today, mounted }
}
