import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 무료회원 1일 시청 제한
const FREE_DAILY_LIMIT = 3

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    const { videoId, videoTitle } = await request.json()

    // 1. 비로그인
    if (!session?.user?.email) {
      return NextResponse.json({
        canWatch: false,
        reason: 'login_required',
        message: '로그인이 필요합니다'
      })
    }

    // 2. email로 유저 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, tier')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      console.log('[check-view] User not found:', session.user.email)
      // 유저 없으면 그냥 재생 허용
      return NextResponse.json({
        canWatch: true,
        tier: 'free',
        remaining: FREE_DAILY_LIMIT
      })
    }

    const userId = userData.id
    const userTier = userData.tier

    // 3. 프리미엄 → 무제한
    if (userTier === 'premium') {
      await supabase.from('highlight_views').insert({
        user_id: userId,
        video_id: videoId,
        video_title: videoTitle || null
      }).catch(() => {})

      return NextResponse.json({
        canWatch: true,
        tier: 'premium',
        remaining: null
      })
    }

    // 4. 무료회원 → 오늘 시청 횟수 체크
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: todayViews } = await supabase
      .from('highlight_views')
      .select('video_id')
      .eq('user_id', userId)
      .gte('viewed_at', today.toISOString())

    const watchedIds = new Set(todayViews?.map(v => v.video_id) || [])
    
    // 이미 본 영상이면 그냥 재생
    if (watchedIds.has(videoId)) {
      return NextResponse.json({
        canWatch: true,
        tier: 'free',
        remaining: FREE_DAILY_LIMIT - watchedIds.size,
        alreadyWatched: true
      })
    }

    // 제한 초과
    if (watchedIds.size >= FREE_DAILY_LIMIT) {
      return NextResponse.json({
        canWatch: false,
        reason: 'limit_exceeded',
        tier: 'free',
        remaining: 0
      })
    }

    // 5. 시청 기록 저장
    await supabase.from('highlight_views').insert({
      user_id: userId,
      video_id: videoId,
      video_title: videoTitle || null
    })

    return NextResponse.json({
      canWatch: true,
      tier: 'free',
      remaining: FREE_DAILY_LIMIT - watchedIds.size - 1
    })

  } catch (error) {
    console.error('[check-view] Error:', error)
    // 에러 시 재생 허용
    return NextResponse.json({
      canWatch: true,
      tier: 'free',
      remaining: FREE_DAILY_LIMIT
    })
  }
}

// GET: 남은 시청 횟수 조회
export async function GET() {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ remaining: 0, tier: 'guest', limit: FREE_DAILY_LIMIT })
    }

    // email로 유저 조회
    const { data: userData } = await supabase
      .from('users')
      .select('id, tier')
      .eq('email', session.user.email)
      .single()

    if (!userData) {
      return NextResponse.json({ remaining: FREE_DAILY_LIMIT, tier: 'free', limit: FREE_DAILY_LIMIT })
    }

    // 프리미엄
    if (userData.tier === 'premium') {
      return NextResponse.json({ remaining: null, tier: 'premium', unlimited: true })
    }

    // 오늘 시청 횟수
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: todayViews } = await supabase
      .from('highlight_views')
      .select('video_id')
      .eq('user_id', userData.id)
      .gte('viewed_at', today.toISOString())

    const usedCount = todayViews?.length || 0

    return NextResponse.json({
      remaining: Math.max(0, FREE_DAILY_LIMIT - usedCount),
      used: usedCount,
      limit: FREE_DAILY_LIMIT,
      tier: 'free'
    })

  } catch (error) {
    console.error('[check-view] GET Error:', error)
    return NextResponse.json({ remaining: FREE_DAILY_LIMIT, tier: 'free', limit: FREE_DAILY_LIMIT })
  }
}