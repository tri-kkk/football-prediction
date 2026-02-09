import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import NaverProvider from 'next-auth/providers/naver'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 🎉 프로모션 기간 설정 (2026년 2월 28일까지 연장)
const PROMO_END_DATE = new Date('2026-03-01T00:00:00+09:00')

// 이메일 해시 생성
function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')
}

// 🌍 IP로 국가 정보 가져오기
async function getCountryFromIP(ip: string): Promise<{ country: string; countryCode: string }> {
  if (ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip === '::1') {
    return { country: 'Local', countryCode: 'LO' }
  }
  
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode`, {
      signal: AbortSignal.timeout(3000)
    })
    const data = await res.json()
    
    if (data.country) {
      return { country: data.country, countryCode: data.countryCode }
    }
  } catch (error) {
    console.error('IP Geolocation failed:', error)
  }
  
  return { country: 'Unknown', countryCode: 'XX' }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false

      try {
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() 
          || headersList.get('x-real-ip') 
          || 'unknown'
        
        const now = new Date().toISOString()
        
        // ✅ 1. 기존 users 테이블에서 확인 (이미 가입 완료된 회원)
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, name, terms_agreed_at')
          .eq('email', user.email)
          .single()

        if (existingUser) {
          // ✅ 기존 회원: 로그인 시간 업데이트
          const updateData: any = { 
            last_login_at: now,
            last_login_ip: ip
          }

          // 🔑 이름이 비어있으면 업데이트 (네이버 이름없음 해결)
          if (!existingUser.name) {
            const userName = user.name 
              || (profile as any)?.response?.name 
              || (profile as any)?.response?.nickname
              || (profile as any)?.name
              || null
            if (userName) {
              updateData.name = userName
              console.log(`🔄 Updating empty name for ${user.email} → "${userName}"`)
            }
          }

          await supabase
            .from('users')
            .update(updateData)
            .eq('email', user.email)
          
          console.log(`✅ Existing user login: ${user.email}`)
          return true
        }

        // ✅ 2. pending_users에서 확인 (약관 동의 대기 중)
        const { data: pendingUser } = await supabase
          .from('pending_users')
          .select('id')
          .eq('email', user.email)
          .single()

        if (pendingUser) {
          // 이미 pending 상태 → 업데이트만
          await supabase
            .from('pending_users')
            .update({ 
              updated_at: now,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7일 연장
            })
            .eq('email', user.email)
          
          console.log(`🔄 Pending user re-login: ${user.email}`)
          return true
        }

        // ✅ 3. 완전히 신규 사용자 → pending_users에 저장
        const { country, countryCode } = await getCountryFromIP(ip)
        
        // 프로모션 기간 체크
        const isPromoPeriod = new Date() < PROMO_END_DATE
        
        // 재가입 체크 (프로모션 악용 방지)
        const emailHash = hashEmail(user.email)
        const { data: deletedUser } = await supabase
          .from('deleted_users')
          .select('promo_code')
          .eq('email_hash', emailHash)
          .single()
        
        const hadPromo = deletedUser?.promo_code ? true : false
        const canGetPromo = isPromoPeriod && !hadPromo
        
        // ⚠️ 핵심 변경: users가 아닌 pending_users에 저장!
        // 🔑 네이버 이름 추출 (네이버는 profile.response 안에 있음)
        const userName = user.name 
          || (profile as any)?.response?.name 
          || (profile as any)?.response?.nickname
          || (profile as any)?.name
          || null

        await supabase.from('pending_users').insert({
          email: user.email,
          name: userName,
          avatar_url: user.image,
          provider: account?.provider,
          provider_id: account?.providerAccountId,
          signup_ip: ip,
          signup_country: country,
          signup_country_code: countryCode,
          pending_promo: canGetPromo ? 'LAUNCH_2026' : null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7일 후 만료
        })
        
        console.log(`🆕 New pending user: ${user.email} from ${country} (${countryCode}), IP: ${ip}`)
        return true

      } catch (error) {
        console.error('SignIn error:', error)
        // 에러가 나도 로그인은 허용 (약관 페이지에서 처리)
        return true
      }
    },

    async session({ session }) {
      if (session.user?.email) {
        // ✅ 1. 먼저 users 테이블에서 확인
        const { data: userData } = await supabase
          .from('users')
          .select('id, tier, name, premium_expires_at, promo_code, terms_agreed_at, privacy_agreed_at')
          .eq('email', session.user.email)
          .single()

        if (userData) {
          // ✅ 정식 회원
          session.user.id = userData.id
          session.user.termsAgreed = true
          session.user.pendingPromo = null
          // 🔑 DB의 이름으로 세션 업데이트
          if (userData.name) {
            session.user.name = userData.name
          }
          
          // 프리미엄 만료 체크
          let currentTier = userData.tier
          if (userData.tier === 'premium' && userData.premium_expires_at) {
            const expiresAt = new Date(userData.premium_expires_at)
            if (new Date() > expiresAt) {
              currentTier = 'free'
              await supabase
                .from('users')
                .update({ tier: 'free' })
                .eq('email', session.user.email)
              console.log(`⏰ Premium expired for ${session.user.email}`)
            }
          }
          
          session.user.tier = currentTier
          session.user.premium_expires_at = userData.premium_expires_at
          session.user.promo_code = userData.promo_code
          
        } else {
          // ✅ 2. pending_users에서 확인
          const { data: pendingData } = await supabase
            .from('pending_users')
            .select('id, pending_promo')
            .eq('email', session.user.email)
            .single()

          if (pendingData) {
            // 약관 동의 대기 중
            session.user.id = pendingData.id
            session.user.termsAgreed = false  // 핵심: 아직 미동의
            session.user.pendingPromo = pendingData.pending_promo
            session.user.tier = 'guest'  // 아직 정식 회원 아님
          } else {
            // 어디에도 없음 (비정상 상태)
            session.user.termsAgreed = false
            session.user.tier = 'guest'
          }
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})

export { handler as GET, handler as POST }