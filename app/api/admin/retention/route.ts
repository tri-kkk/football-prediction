import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 서비스 키 (stats route와 동일한 패턴)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
)

// 한국 기준 자정으로 정규화한 ISO 문자열 반환
function startOfDayISO(d: Date): string {
  const date = new Date(d)
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString()
}

// 두 날짜 사이 일수 차이 (양수)
function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

// YYYY-MM-DD
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

// 주의 시작(월요일 KST 기준 단순화) → "YYYY-MM-DD"
function getWeekStart(d: Date): string {
  const date = new Date(d)
  const day = date.getUTCDay() // 0=Sun .. 6=Sat
  const diff = (day === 0 ? -6 : 1) - day
  date.setUTCDate(date.getUTCDate() + diff)
  date.setUTCHours(0, 0, 0, 0)
  return toDateStr(date)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cohortType = (searchParams.get('cohort') || 'week') as 'week' | 'month' // 코호트 단위
    const cohortCount = Math.min(parseInt(searchParams.get('cohorts') || '12'), 24)
    const trendDays = Math.min(parseInt(searchParams.get('trendDays') || '30'), 90)
    const dormantPage = parseInt(searchParams.get('dormantPage') || '0')
    const dormantSize = Math.min(parseInt(searchParams.get('dormantSize') || '50'), 200)

    const now = new Date()
    const today = startOfDayISO(now)
    const day1Ago = new Date(now.getTime() - 1 * 86400000)
    const day7Ago = new Date(now.getTime() - 7 * 86400000)
    const day30Ago = new Date(now.getTime() - 30 * 86400000)
    const day60Ago = new Date(now.getTime() - 60 * 86400000)
    const day90Ago = new Date(now.getTime() - 90 * 86400000)

    // ============================================================
    // 1) 활성 회원 카드 (DAU / WAU / MAU / 휴면 / 이탈)
    // ============================================================
    const [
      { count: totalUsers },
      { count: dau },
      { count: wau },
      { count: mau },
      { count: dormant30 },
      { count: dormant90 },
      { count: premiumTotal },
      { count: premiumActive30 },
      { count: freeTotal },
      { count: freeActive30 },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login_at', today),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login_at', day7Ago.toISOString()),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login_at', day30Ago.toISOString()),
      supabase.from('users').select('*', { count: 'exact', head: true }).lt('last_login_at', day30Ago.toISOString()),
      supabase.from('users').select('*', { count: 'exact', head: true }).lt('last_login_at', day90Ago.toISOString()),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('tier', 'premium'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('tier', 'premium').gte('last_login_at', day30Ago.toISOString()),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('tier', 'free'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('tier', 'free').gte('last_login_at', day30Ago.toISOString()),
    ])

    const cards = {
      total_users: totalUsers || 0,
      dau: dau || 0,
      wau: wau || 0,
      mau: mau || 0,
      dormant_30d: dormant30 || 0,
      dormant_90d: dormant90 || 0,
      stickiness: mau ? Number((((dau || 0) / mau) * 100).toFixed(1)) : 0,
      // tier별 30일 잔존율
      premium_total: premiumTotal || 0,
      premium_active_30d: premiumActive30 || 0,
      premium_retention_30d: premiumTotal ? Number((((premiumActive30 || 0) / premiumTotal) * 100).toFixed(1)) : 0,
      free_total: freeTotal || 0,
      free_active_30d: freeActive30 || 0,
      free_retention_30d: freeTotal ? Number((((freeActive30 || 0) / freeTotal) * 100).toFixed(1)) : 0,
    }

    // ============================================================
    // 2) DAU 트렌드 (최근 N일)
    // ============================================================
    // 모든 사용자의 last_login_at만 가져와서 메모리에서 집계
    // 회원 수가 수십만 명 이상이면 RPC/SQL로 마이그레이션 권장
    const { data: loginData } = await supabase
      .from('users')
      .select('last_login_at')
      .gte('last_login_at', new Date(now.getTime() - trendDays * 86400000).toISOString())
      .not('last_login_at', 'is', null)

    const dauTrend: { date: string; dau: number }[] = []
    const trendMap: Record<string, Set<string>> = {}
    // last_login_at은 사용자당 1개이므로 카운트만으로 충분
    const dauCountMap: Record<string, number> = {}
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      dauCountMap[toDateStr(d)] = 0
    }
    loginData?.forEach((row: any) => {
      const date = toDateStr(new Date(row.last_login_at))
      if (date in dauCountMap) dauCountMap[date]++
    })
    Object.entries(dauCountMap).forEach(([date, count]) => {
      dauTrend.push({ date, dau: count })
    })

    // ============================================================
    // 3) 코호트 리텐션 테이블
    // ============================================================
    // 최근 cohortCount 개 주차(또는 월) × D+1/7/14/30/60/90
    // 가입일 ~ 마지막 접속일 차이로 단순 계산
    const cohortStart = new Date(now)
    if (cohortType === 'week') {
      cohortStart.setUTCDate(cohortStart.getUTCDate() - cohortCount * 7)
    } else {
      cohortStart.setUTCMonth(cohortStart.getUTCMonth() - cohortCount)
    }

    const { data: cohortUsers } = await supabase
      .from('users')
      .select('created_at, last_login_at')
      .gte('created_at', cohortStart.toISOString())

    // 코호트별로 그룹화 후 D+N 잔존자 비율 계산
    type CohortRow = {
      cohort: string
      total: number
      d1: number
      d7: number
      d14: number
      d30: number
      d60: number
      d90: number
    }
    const cohortMap: Record<string, CohortRow> = {}
    const thresholds = [1, 7, 14, 30, 60, 90]

    cohortUsers?.forEach((u: any) => {
      const created = new Date(u.created_at)
      const lastLogin = u.last_login_at ? new Date(u.last_login_at) : created

      const cohortKey =
        cohortType === 'week'
          ? getWeekStart(created)
          : `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, '0')}`

      if (!cohortMap[cohortKey]) {
        cohortMap[cohortKey] = { cohort: cohortKey, total: 0, d1: 0, d7: 0, d14: 0, d30: 0, d60: 0, d90: 0 }
      }
      cohortMap[cohortKey].total++

      const daysSinceSignup = daysBetween(created, lastLogin)
      const daysSignupToNow = daysBetween(created, now)

      // D+N에 도달한 유저는 lastLogin이 그 이후 시점이어야 잔존으로 인정
      // 또한 가입 후 N일이 아직 지나지 않은 경우 해당 셀은 null 처리
      thresholds.forEach((t) => {
        const key = `d${t}` as keyof Omit<CohortRow, 'cohort' | 'total'>
        if (daysSignupToNow >= t && daysSinceSignup >= t) {
          ;(cohortMap[cohortKey][key] as number)++
        }
      })
    })

    // 정렬 + 비율 계산 + 미도달 셀은 null
    const cohortRows = Object.values(cohortMap)
      .sort((a, b) => (a.cohort < b.cohort ? 1 : -1))
      .map((row) => {
        // 해당 코호트의 평균 가입일로부터 오늘까지 며칠 지났는지로 도달 여부 판단
        // 간단히 코호트 시작일로 계산
        const cohortDate =
          cohortType === 'week'
            ? new Date(row.cohort + 'T00:00:00Z')
            : new Date(row.cohort + '-01T00:00:00Z')
        const daysAgo = daysBetween(cohortDate, now)

        const pct = (val: number, threshold: number) => {
          if (daysAgo < threshold) return null
          return row.total ? Number(((val / row.total) * 100).toFixed(1)) : 0
        }

        return {
          cohort: row.cohort,
          total: row.total,
          d1: pct(row.d1, 1),
          d7: pct(row.d7, 7),
          d14: pct(row.d14, 14),
          d30: pct(row.d30, 30),
          d60: pct(row.d60, 60),
          d90: pct(row.d90, 90),
        }
      })

    // ============================================================
    // 4) 휴면 회원 리스트 (30일 이상 미접속)
    // ============================================================
    const { data: dormantList, count: dormantTotal } = await supabase
      .from('users')
      .select('id, email, name, tier, provider, signup_country_code, created_at, last_login_at', { count: 'exact' })
      .lt('last_login_at', day30Ago.toISOString())
      .order('last_login_at', { ascending: true })
      .range(dormantPage * dormantSize, dormantPage * dormantSize + dormantSize - 1)

    return NextResponse.json({
      cards,
      dauTrend,
      cohort: {
        type: cohortType,
        rows: cohortRows,
      },
      dormant: {
        users: dormantList || [],
        total: dormantTotal || 0,
        page: dormantPage,
        size: dormantSize,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Retention GET error:', error)
    return NextResponse.json(
      { error: error.message || '잔존율 데이터 조회 실패' },
      { status: 500 }
    )
  }
}
