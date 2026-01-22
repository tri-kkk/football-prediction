import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST: 피추천인 재방문 시 추천인 보상 확정
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body  // 재방문한 피추천인 ID

    if (!userId) {
      return NextResponse.json({ error: 'userId 필요' }, { status: 400 })
    }

    // 1. 해당 유저의 pending 상태 레퍼럴 기록 조회
    const { data: referral, error: referralError } = await supabase
      .from('referral_history')
      .select('id, referrer_id, reward_days, reward_status, created_at')
      .eq('referee_id', userId)
      .eq('reward_status', 'pending')
      .single()

    if (referralError || !referral) {
      // pending 레퍼럴 없음 = 이미 확정됐거나 레퍼럴 없음
      return NextResponse.json({ 
        success: true,
        message: '확정할 보상이 없습니다',
        alreadyConfirmed: true
      })
    }

    // 2. 가입 후 24시간 이내인지 확인 (선택적 - 너무 엄격하면 제거)
    const createdAt = new Date(referral.created_at)
    const now = new Date()
    const hoursSinceReferral = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    
    // 24시간 넘으면 보상 없이 확정 (어뷰징 방지)
    const rewardDays = hoursSinceReferral <= 24 ? referral.reward_days : 0

    // 3. 레퍼럴 상태를 confirmed로 업데이트
    await supabase
      .from('referral_history')
      .update({ 
        reward_status: 'confirmed',
        reward_days: rewardDays,
        confirmed_at: now.toISOString()
      })
      .eq('id', referral.id)

    // 4. 추천인에게 보상 지급 (rewardDays > 0일 때만)
    if (rewardDays > 0) {
      const { data: referrer } = await supabase
        .from('users')
        .select('tier, premium_expires_at, referral_reward_days')
        .eq('id', referral.referrer_id)
        .single()

      if (referrer) {
        const currentExpiry = referrer.premium_expires_at 
          ? new Date(referrer.premium_expires_at) 
          : now
        const baseDate = currentExpiry > now ? currentExpiry : now
        const newExpiry = new Date(baseDate)
        newExpiry.setDate(newExpiry.getDate() + rewardDays)

        await supabase
          .from('users')
          .update({ 
            premium_expires_at: newExpiry.toISOString(),
            referral_reward_days: (referrer.referral_reward_days || 0) + rewardDays,
            tier: 'premium'
          })
          .eq('id', referral.referrer_id)
      }
    }

    return NextResponse.json({
      success: true,
      message: rewardDays > 0 
        ? `추천인에게 ${rewardDays}일 보상이 지급되었습니다` 
        : '보상이 확정되었습니다 (24시간 초과)',
      rewardDaysGiven: rewardDays
    })

  } catch (error) {
    console.error('보상 확정 에러:', error)
    return NextResponse.json({ error: '서버 에러' }, { status: 500 })
  }
}
