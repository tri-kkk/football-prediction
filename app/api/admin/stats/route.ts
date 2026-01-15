import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET: 일별 통계 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') // YYYY-MM-DD
    const endDate = searchParams.get('end') // YYYY-MM-DD

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start와 end 날짜가 필요합니다 (YYYY-MM-DD 형식)' },
        { status: 400 }
      )
    }

    // 날짜 범위 생성
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0])
    }

    // 각 날짜별 통계 조회
    const stats = await Promise.all(
      dates.map(async (date) => {
        const dayStart = `${date}T00:00:00.000Z`
        const dayEnd = `${date}T23:59:59.999Z`

        // 신규 가입자 수
        const { count: newUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd)

        // 해당 일자 기준 전체/무료/프리미엄 회원 수 (누적)
        const { count: totalUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', dayEnd)

        const { count: freeUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('tier', 'free')
          .lte('created_at', dayEnd)

        const { count: premiumUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('tier', 'premium')
          .lte('created_at', dayEnd)

        // 신규 구독 수
        const { count: newSubscriptions } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .gte('started_at', dayStart)
          .lte('started_at', dayEnd)

        // 취소된 구독 수
        const { count: cancelledSubscriptions } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'cancelled')
          .gte('updated_at', dayStart)
          .lte('updated_at', dayEnd)

        // 해당 일자 수익 (신규 구독 기준)
        const { data: revenueData } = await supabase
          .from('subscriptions')
          .select('price, plan')
          .gte('started_at', dayStart)
          .lte('started_at', dayEnd)

        const revenue = (revenueData || []).reduce((sum, sub) => {
          return sum + (sub.price || (sub.plan === 'yearly' ? 79000 : 9900))
        }, 0)

        return {
          date,
          total_users: totalUsers || 0,
          new_users: newUsers || 0,
          free_users: freeUsers || 0,
          premium_users: premiumUsers || 0,
          new_subscriptions: newSubscriptions || 0,
          cancelled_subscriptions: cancelledSubscriptions || 0,
          revenue,
        }
      })
    )

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('Stats GET error:', error)
    return NextResponse.json(
      { error: error.message || '통계 조회 실패' },
      { status: 500 }
    )
  }
}

// POST: 통계 요약 조회 (대시보드용)
export async function POST(request: NextRequest) {
  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const todayStart = `${today}T00:00:00.000Z`
    const todayEnd = `${today}T23:59:59.999Z`

    // 전체 회원 수
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // 티어별 회원 수
    const { count: freeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'free')

    const { count: premiumUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'premium')

    // 오늘 신규 가입
    const { count: todayNewUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)

    // 활성 구독 수
    const { count: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // 월간 예상 수익 (활성 구독 기준)
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('plan, price')
      .eq('status', 'active')

    const monthlyRevenue = (activeSubs || []).reduce((sum, sub) => {
      if (sub.plan === 'yearly') {
        return sum + Math.round((sub.price || 79000) / 12)
      }
      return sum + (sub.price || 9900)
    }, 0)

    // 이번 달 총 수익
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { data: monthlySubsData } = await supabase
      .from('subscriptions')
      .select('price, plan')
      .gte('started_at', monthStart)

    const thisMonthRevenue = (monthlySubsData || []).reduce((sum, sub) => {
      return sum + (sub.price || (sub.plan === 'yearly' ? 79000 : 9900))
    }, 0)

    return NextResponse.json({
      summary: {
        total_users: totalUsers || 0,
        free_users: freeUsers || 0,
        premium_users: premiumUsers || 0,
        today_new_users: todayNewUsers || 0,
        active_subscriptions: activeSubscriptions || 0,
        monthly_revenue: monthlyRevenue,
        this_month_revenue: thisMonthRevenue,
        premium_rate: totalUsers ? ((premiumUsers || 0) / totalUsers * 100).toFixed(1) : '0',
      }
    })
  } catch (error: any) {
    console.error('Stats summary error:', error)
    return NextResponse.json(
      { error: error.message || '통계 요약 조회 실패' },
      { status: 500 }
    )
  }
}