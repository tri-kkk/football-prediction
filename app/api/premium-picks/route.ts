import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// anon 키 대신 service_role 키 사용 (RLS 우회)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    const now = new Date()

    // KST 현재 시간
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    const todayKST = kstNow.toISOString().split('T')[0]
    const kstHour = parseInt(kstNow.toISOString().split('T')[1].split(':')[0])

    // timestamp without time zone → Z 없는 문자열로 비교
    const todayOpenStr = todayKST + ' 09:00:00'
    const yesterdayOpenStr = new Date(new Date(todayKST + 'T09:00:00Z').getTime() - 24 * 60 * 60 * 1000)
      .toISOString().replace('T', ' ').substring(0, 19)

    let picks = null

    // 경기 시작 후 2시간 지난 것은 종료로 간주 → 그 이후 경기만 표시
    const twoHoursAgoUTC = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

    if (kstHour >= 18) {
      // KST 18:00 이후 → 오늘 배치 먼저 시도
      const { data } = await supabase
        .from('premium_picks')
        .select('*')
        .gte('created_at', todayOpenStr)
        .gte('commence_time', twoHoursAgoUTC) // ✅ 종료된 경기 제외
        .order('commence_time', { ascending: true })
      picks = data
      console.log(`📅 Today batch: ${picks?.length || 0}개`)
    }

    // 오늘 픽 없거나 KST 18:00 이전 → 어제 배치 표시
    if (!picks || picks.length === 0) {
      const { data } = await supabase
        .from('premium_picks')
        .select('*')
        .gte('created_at', yesterdayOpenStr)
        .lt('created_at', todayOpenStr)
        .gte('commence_time', twoHoursAgoUTC) // ✅ 종료된 경기 제외
        .order('commence_time', { ascending: true })
      picks = data
      console.log(`📅 Yesterday batch: ${picks?.length || 0}개`)
    }

    console.log(`✅ Premium picks found: ${picks?.length || 0}`)

    const nowUTC = now.toISOString()
    const next24hUTC = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

    const { count: analyzedCount } = await supabase
      .from('match_odds_latest')
      .select('*', { count: 'exact', head: true })
      .gte('commence_time', nowUTC)
      .lt('commence_time', next24hUTC)

    // 🆕 팀 로고 join (match_odds_latest에서) + confidence 계산 (prediction.finalProb에서)
    let enrichedPicks = picks || []
    if (enrichedPicks.length > 0) {
      const matchIds = enrichedPicks
        .map((p: any) => String(p.match_id))
        .filter(Boolean)

      const { data: matchInfo } = await supabase
        .from('match_odds_latest')
        .select('match_id, home_team_logo, away_team_logo')
        .in('match_id', matchIds)

      const logoMap = new Map<string, { home: string | null; away: string | null }>()
      for (const m of matchInfo || []) {
        logoMap.set(String((m as any).match_id), {
          home: (m as any).home_team_logo,
          away: (m as any).away_team_logo,
        })
      }

      enrichedPicks = enrichedPicks.map((p: any) => {
        const logos = logoMap.get(String(p.match_id))
        // confidence 계산: pick 팀의 finalProb 값 (0~100 %)
        const pred = p.prediction || {}
        const pickSide = pred?.recommendation?.pick // HOME | DRAW | AWAY
        const finalProb = pred?.finalProb || {}
        let confidence: number | null = null
        if (pickSide === 'HOME' && typeof finalProb.home === 'number') {
          confidence = Math.round(finalProb.home * 1000) / 10
        } else if (pickSide === 'AWAY' && typeof finalProb.away === 'number') {
          confidence = Math.round(finalProb.away * 1000) / 10
        } else if (pickSide === 'DRAW' && typeof finalProb.draw === 'number') {
          confidence = Math.round(finalProb.draw * 1000) / 10
        }

        return {
          ...p,
          home_team_logo: logos?.home ?? null,
          away_team_logo: logos?.away ?? null,
          prediction: {
            ...pred,
            confidence,                          // 0~100 (예: 48.4)
            direction: pickSide ?? null,         // HOME | AWAY | DRAW
          },
        }
      })
    }

    return NextResponse.json({
      success: true,
      validDate: todayKST,
      picks: enrichedPicks,
      count: enrichedPicks.length,
      analyzed: analyzedCount || 0,
    })

  } catch (error) {
    console.error('Premium picks API error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
