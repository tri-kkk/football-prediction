// app/api/cron/daily-report/route.ts
// 매일 자정(KST) 텔레그램으로 일일 리포트 전송

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PROPERTY_ID = process.env.GA_PROPERTY_ID || '511624468'

function getGAClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  if (!privateKey || !clientEmail) return null

  return new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  })
}

async function sendTelegram(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  })
}

export async function GET(request: NextRequest) {
  try {
    // KST 기준 어제 날짜 (자정에 실행되므로 어제 = 리포트 대상일)
    const now = new Date()
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const yesterday = new Date(kstNow)
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0] // YYYY-MM-DD
    const displayDate = `${yesterday.getMonth() + 1}/${yesterday.getDate()}`

    // ─── 1. 신규 가입자 수 (Supabase users 테이블) ───
    const dayStart = `${dateStr}T00:00:00+09:00`
    const dayEnd = `${dateStr}T23:59:59+09:00`

    const { count: newSignups } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)

    // 총 가입자 수
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // 프리미엄 회원 수
    const { count: premiumUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'premium')

    // 오늘 매출 (결제 성공)
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'success')
      .gte('order_date', dayStart)
      .lte('order_date', dayEnd)

    const dailyRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const paymentCount = payments?.length || 0

    // ─── 2. 방문자 수 (Google Analytics) ───
    let visitors = '-'
    let pageViews = '-'
    let sessions = '-'

    const gaClient = getGAClient()
    if (gaClient) {
      try {
        const [report] = await gaClient.runReport({
          property: `properties/${PROPERTY_ID}`,
          dateRanges: [{ startDate: dateStr, endDate: dateStr }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'sessions' },
          ],
        })

        const row = report?.rows?.[0]?.metricValues
        if (row) {
          visitors = parseInt(row[0]?.value || '0').toLocaleString()
          pageViews = parseInt(row[1]?.value || '0').toLocaleString()
          sessions = parseInt(row[2]?.value || '0').toLocaleString()
        }
      } catch (gaError) {
        console.error('GA 조회 실패:', gaError)
      }
    }

    // ─── 3. 텔레그램 메시지 전송 ───
    const message =
      `📊 <b>TrendSoccer 일일 리포트</b> (${displayDate})\n\n` +
      `👥 <b>회원</b>\n` +
      `  • 신규 가입: <b>${newSignups ?? 0}명</b>\n` +
      `  • 총 회원: ${totalUsers?.toLocaleString() ?? 0}명\n` +
      `  • 프리미엄: ${premiumUsers ?? 0}명\n\n` +
      `🌐 <b>트래픽</b>\n` +
      `  • 방문자: <b>${visitors}명</b>\n` +
      `  • 페이지뷰: ${pageViews}\n` +
      `  • 세션: ${sessions}\n\n` +
      `💰 <b>매출</b>\n` +
      `  • 결제: ${paymentCount}건\n` +
      `  • 금액: ₩${dailyRevenue.toLocaleString()}`

    await sendTelegram(message)

    return NextResponse.json({
      success: true,
      date: dateStr,
      newSignups: newSignups ?? 0,
      totalUsers: totalUsers ?? 0,
      premiumUsers: premiumUsers ?? 0,
      visitors,
      pageViews,
      dailyRevenue,
    })
  } catch (error: any) {
    console.error('일일 리포트 오류:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
