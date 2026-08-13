// app/api/payment/seedpay/coach-callback/route.ts
// 코치 결제 콜백(SeedPay). 기존 callback을 미러하되 subscriptions.product='coach'로 부여.
// users.tier는 건드리지 않음(코치는 별도 상품). 기존 TrendSoccer 결제 코드와 완전 분리.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { grantCoachMembership } from '@/lib/coachSubscription';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function telegram(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
  } catch {}
}

export async function POST(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com';
  const fail = (msg: string) => new NextResponse(null, {
    status: 303,
    headers: { Location: `${baseUrl}/coach/pricing/result?status=failed&message=${encodeURIComponent(msg)}` },
  });

  try {
    const formData = await request.formData();
    const data: Record<string, any> = {};
    formData.forEach((v, k) => (data[k] = v));

    const { resultCd, resultMsg, ordNo, tid, goodsAmt } = data;
    if (resultCd !== '0000') {
      await supabase.from('payments').insert({ order_id: ordNo, status: 'failed', tid, result_code: resultCd, result_message: resultMsg });
      return fail(resultMsg || '결제 실패');
    }

    const { data: sess } = await supabase.from('payment_sessions').select('*').eq('order_id', ordNo).single();
    if (!sess) return fail('세션 데이터 없음');
    if (sess.product !== 'coach') return fail('상품 불일치'); // 코치 콜백은 coach만 처리

    const { data: userData } = await supabase.from('users').select('id').ilike('email', sess.user_email).single();
    if (!userData) return fail('사용자 조회 실패');

    const amount = parseInt(goodsAmt);
    const months = sess.plan_months || 1;
    const planKey = amount === 6900 ? 'coach_monthly_bundle' : 'coach_monthly';

    // 결제 기록
    await supabase.from('payments').insert({
      user_id: userData.id, order_id: ordNo, status: 'success', tid, mid: data.mid,
      amount, buyer_email: sess.user_email, buyer_name: data.ordNm,
      goods_name: 'TrendCoach 멤버쉽', approval_number: data.appNo, payment_method: 'CARD',
      card_code: data.acqCardCd, card_name: data.fnNm, card_number: data.cardNo, nonce: data.nonce,
      order_date: new Date().toISOString(), result_code: resultCd, result_message: resultMsg, raw_response: data,
    });

    // 코치 구독 부여 (users.tier 변경 안 함)
    const { error: subErr } = await grantCoachMembership(supabase, userData.id, months, amount, planKey, ordNo);
    if (subErr) return fail('구독 저장 실패');

    const nowStr = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    await telegram(
      `💰 <b>매출 발생! (TrendCoach)</b>\n\n` +
      `📋 상품: TrendCoach 멤버쉽 (${planKey === 'coach_monthly_bundle' ? '번들' : '단독'})\n` +
      `💳 금액: ₩${amount.toLocaleString()}\n👤 이메일: ${sess.user_email}\n🆔 주문: ${ordNo}\n🕐 ${nowStr}`
    );

    return new NextResponse(null, {
      status: 303,
      headers: { Location: `${baseUrl}/coach/pricing/result?status=success&amount=${amount}` },
    });
  } catch {
    return NextResponse.json({ error: '결제 처리 오류' }, { status: 500 });
  }
}
