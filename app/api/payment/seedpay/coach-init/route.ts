// app/api/payment/seedpay/coach-init/route.ts
// 코치 멤버쉽 결제 시작(SeedPay). 기존 init을 그대로 미러 + 코치 상품/번들가/전용 returnUrl.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { checkPremium } from '@/lib/checkPremium';
import { coachPlan } from '@/lib/coachSubscription';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 유저 + 번들 여부(기존 TrendSoccer 프리미엄이면 번들가)
    const { data: userRow } = await supabase
      .from('users').select('id').ilike('email', session.user.email).single();
    const hasTsPremium = userRow ? await checkPremium(userRow.id) : false;
    const plan = coachPlan(hasTsPremium);

    const mid = process.env.SEEDPAY_MID;
    const merchantKey = process.env.SEEDPAY_MERCHANT_KEY;
    if (!mid || !merchantKey) {
      return NextResponse.json({ error: 'SeedPay 설정 오류', code: 'CONFIG_ERROR' }, { status: 500 });
    }

    const now = new Date();
    const ediDate = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const ordNo = `TC${Date.now()}${Math.floor(Math.random() * 1000)}`; // TC = TrendCoach
    const goodsAmt = plan.amount.toString();
    const hashString = crypto.createHash('sha256')
      .update(mid + ediDate + goodsAmt + merchantKey).digest('hex');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com';
    const returnUrl = `${baseUrl}/api/payment/seedpay/coach-callback`; // 코치 전용 콜백

    await supabase.from('payment_sessions').insert({
      order_id: ordNo,
      init_edi_date: ediDate,
      mid,
      goods_amt: goodsAmt,
      user_email: session.user.email,
      user_name: session.user.name || '구매자',
      product: 'coach',
      plan_months: plan.months,
    });

    return NextResponse.json({
      success: true,
      bundle: plan.bundle,
      formData: {
        method: 'CARD', mid, goodsNm: plan.name, ordNo, goodsAmt,
        ordNm: session.user.name || '구매자', ordEmail: session.user.email,
        returnUrl, ediDate, hashString,
        ordIp: '', ordTel: '', mbsUsrId: '', mbsReserved: '',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: '결제 초기화 오류', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}
