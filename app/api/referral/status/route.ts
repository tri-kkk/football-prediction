import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 상수
const REWARD_DAYS_PER_REFERRAL = 2
const MAX_REWARD_DAYS = 90

// GET: 내 레퍼럴 현황 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId 필요' }, { status: 400 })
    }

    // 사용자 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, referral_code, tier, premium_expires_at, referral_reward_days')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // 초대 기록 조회
    const { data: referrals, error: referralError } = await supabase
      .from('referral_history')
      .select(`
        id,
        referee_id,
        reward_days,
        created_at,
        users:referee_id (name, email)
      `)
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })

    if (referralError) {
      console.error('레퍼럴 기록 조회 에러:', referralError)
    }

    const totalReferrals = referrals?.length || 0
    
    // 보상 계산 (캡 적용)
    const calculatedReward = totalReferrals * REWARD_DAYS_PER_REFERRAL
    const effectiveRewardDays = Math.min(calculatedReward, MAX_REWARD_DAYS)
    const remainingCapDays = Math.max(MAX_REWARD_DAYS - calculatedReward, 0)
    const isCapReached = calculatedReward >= MAX_REWARD_DAYS

    return NextResponse.json({
      referralCode: user.referral_code,
      tier: user.tier,
      premiumExpiresAt: user.premium_expires_at,
      
      stats: {
        totalReferrals,
        rewardPerReferral: REWARD_DAYS_PER_REFERRAL,
        effectiveRewardDays,
        maxRewardDays: MAX_REWARD_DAYS,
        remainingCapDays,
        isCapReached,
        // 캡까지 필요한 초대 수
        referralsToMax: isCapReached ? 0 : Math.ceil(remainingCapDays / REWARD_DAYS_PER_REFERRAL)
      },
      
      recentReferrals: referrals?.slice(0, 10).map(r => ({
        id: r.id,
        name: (r.users as any)?.name || '익명',
        email: maskEmail((r.users as any)?.email),
        rewardDays: r.reward_days,
        createdAt: r.created_at
      })) || []
    })

  } catch (error) {
    console.error('레퍼럴 현황 조회 에러:', error)
    return NextResponse.json({ error: '서버 에러' }, { status: 500 })
  }
}

// 이메일 마스킹 (abc@gmail.com → a**@gmail.com)
function maskEmail(email: string | null): string {
  if (!email) return '***'
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local[0]}**@${domain}`
}
