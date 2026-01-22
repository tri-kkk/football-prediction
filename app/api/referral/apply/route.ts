import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 상수
const REWARD_DAYS_PER_REFERRAL = 2
const MAX_REWARD_DAYS = 90
const REFEREE_BONUS_DAYS = 3

// 허용된 이메일 도메인 (소셜 로그인용)
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'naver.com'
]

// POST: 레퍼럴 코드 적용 (가입 시)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refereeId, referralCode } = body

    if (!refereeId || !referralCode) {
      return NextResponse.json({ 
        error: 'refereeId와 referralCode 필요' 
      }, { status: 400 })
    }

    // 0. 피추천인 정보 조회 (이메일 검증용)
    const { data: refereeUser, error: refereeError } = await supabase
      .from('users')
      .select('id, email, premium_expires_at, created_at')
      .eq('id', refereeId)
      .single()

    if (refereeError || !refereeUser) {
      return NextResponse.json({ 
        error: '사용자를 찾을 수 없습니다',
        code: 'USER_NOT_FOUND'
      }, { status: 404 })
    }

    // 1. 이메일 도메인 검증
    const emailDomain = refereeUser.email?.split('@')[1]?.toLowerCase()
    if (!emailDomain || !ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
      return NextResponse.json({ 
        error: '허용되지 않은 이메일입니다. Google 또는 Naver 계정만 사용 가능합니다.',
        code: 'INVALID_EMAIL_DOMAIN'
      }, { status: 400 })
    }

    // 2. 레퍼럴 코드로 추천인 찾기
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('id, email, tier, premium_expires_at, referral_reward_days')
      .eq('referral_code', referralCode.toUpperCase())
      .single()

    if (referrerError || !referrer) {
      return NextResponse.json({ 
        error: '유효하지 않은 초대 코드입니다',
        code: 'INVALID_CODE'
      }, { status: 400 })
    }

    // 3. 자기 자신 초대 방지
    if (referrer.id === refereeId) {
      return NextResponse.json({ 
        error: '본인의 초대 코드는 사용할 수 없습니다',
        code: 'SELF_REFERRAL'
      }, { status: 400 })
    }

    // 4. 같은 이메일 도메인 + 비슷한 이메일 패턴 체크 (선택적)
    const referrerDomain = referrer.email?.split('@')[1]?.toLowerCase()
    const referrerLocal = referrer.email?.split('@')[0]?.toLowerCase().replace(/[^a-z]/g, '')
    const refereeLocal = refereeUser.email?.split('@')[0]?.toLowerCase().replace(/[^a-z]/g, '')
    
    // 같은 도메인에서 비슷한 이메일이면 의심 (예: oskar1@gmail.com, oskar2@gmail.com)
    if (referrerDomain === emailDomain && referrerLocal && refereeLocal) {
      const similarity = calculateSimilarity(referrerLocal, refereeLocal)
      if (similarity > 0.7) {
        console.warn(`⚠️ 의심스러운 레퍼럴: ${referrer.email} → ${refereeUser.email} (유사도: ${similarity})`)
        // 일단 로그만 남기고 진행 (나중에 검토용)
      }
    }

    // 5. 이미 초대받은 사람인지 확인
    const { data: existingReferral } = await supabase
      .from('referral_history')
      .select('id')
      .eq('referee_id', refereeId)
      .single()

    if (existingReferral) {
      return NextResponse.json({ 
        error: '이미 초대 코드를 사용했습니다',
        code: 'ALREADY_REFERRED'
      }, { status: 400 })
    }

    // 6. 현재 추천인의 누적 보상 확인 (캡 체크)
    const currentRewardDays = referrer.referral_reward_days || 0
    const isCapReached = currentRewardDays >= MAX_REWARD_DAYS
    const rewardDaysToGive = isCapReached ? 0 : Math.min(REWARD_DAYS_PER_REFERRAL, MAX_REWARD_DAYS - currentRewardDays)

    // 7. 레퍼럴 기록 생성 (보상은 "보류" 상태)
    const { error: insertError } = await supabase
      .from('referral_history')
      .insert({
        referrer_id: referrer.id,
        referee_id: refereeId,
        referral_code: referralCode.toUpperCase(),
        reward_days: rewardDaysToGive,
        reward_status: 'pending'  // pending → confirmed (재방문 시)
      })

    if (insertError) {
      console.error('레퍼럴 기록 생성 에러:', insertError)
      return NextResponse.json({ 
        error: '레퍼럴 등록 실패',
        code: 'INSERT_FAILED'
      }, { status: 500 })
    }

    // 8. 피추천인에게 referred_by 저장
    await supabase
      .from('users')
      .update({ referred_by: referralCode.toUpperCase() })
      .eq('id', refereeId)

    // 9. 피추천인 보너스 즉시 지급 (3일 체험)
    const now = new Date()
    const refereeExpiry = refereeUser.premium_expires_at 
      ? new Date(refereeUser.premium_expires_at) 
      : now
    const refereeBaseDate = refereeExpiry > now ? refereeExpiry : now
    const newRefereeExpiry = new Date(refereeBaseDate)
    newRefereeExpiry.setDate(newRefereeExpiry.getDate() + REFEREE_BONUS_DAYS)

    await supabase
      .from('users')
      .update({ 
        premium_expires_at: newRefereeExpiry.toISOString(),
        tier: 'premium'
      })
      .eq('id', refereeId)

    // 10. 추천인 보상은 피추천인 재방문 시 지급 (confirm API에서 처리)
    // → 여기서는 기록만 남기고 실제 보상은 나중에

    return NextResponse.json({
      success: true,
      message: '초대 코드가 적용되었습니다!',
      referrerReward: {
        daysToAdd: rewardDaysToGive,
        status: 'pending',  // 피추천인 재방문 시 confirmed
        note: '친구가 24시간 내 재방문하면 보상이 지급됩니다'
      },
      refereeBonus: {
        daysAdded: REFEREE_BONUS_DAYS,
        newExpiry: newRefereeExpiry.toISOString()
      }
    })

  } catch (error) {
    console.error('레퍼럴 적용 에러:', error)
    return NextResponse.json({ error: '서버 에러' }, { status: 500 })
  }
}

// GET: 레퍼럴 코드 유효성 검증
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'code 필요' }, { status: 400 })
    }

    const { data: referrer, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('referral_code', code.toUpperCase())
      .single()

    if (error || !referrer) {
      return NextResponse.json({ 
        valid: false,
        error: '유효하지 않은 초대 코드입니다'
      })
    }

    return NextResponse.json({
      valid: true,
      referrerName: referrer.name || '익명',
      bonusDays: REFEREE_BONUS_DAYS
    })

  } catch (error) {
    console.error('코드 검증 에러:', error)
    return NextResponse.json({ error: '서버 에러' }, { status: 500 })
  }
}

// 문자열 유사도 계산 (Jaccard similarity)
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  
  const set1 = new Set(str1.split(''))
  const set2 = new Set(str2.split(''))
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return intersection.size / union.size
}
