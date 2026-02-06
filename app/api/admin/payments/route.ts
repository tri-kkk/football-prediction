import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // 결제 내역 조회 (최근 100건)
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // 통계 계산
    const successPayments = (payments || []).filter(p => p.status === 'success')
    const totalRevenue = successPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const todayStr = new Date().toISOString().split('T')[0]
    const todayPayments = successPayments.filter(p => p.created_at?.startsWith(todayStr))
    const todayRevenue = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0)

    // 월별 매출
    const monthlyRevenue: Record<string, number> = {}
    successPayments.forEach(p => {
      const month = p.created_at?.substring(0, 7) // YYYY-MM
      if (month) {
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (p.amount || 0)
      }
    })

    return NextResponse.json({
      payments: payments || [],
      stats: {
        totalPayments: (payments || []).length,
        successCount: successPayments.length,
        failedCount: (payments || []).filter(p => p.status === 'failed').length,
        totalRevenue,
        todayRevenue,
        todayCount: todayPayments.length,
        monthlyRevenue,
      }
    })
  } catch (error: any) {
    console.error('Admin payments error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
