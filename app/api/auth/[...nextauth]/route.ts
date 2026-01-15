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

// 🎉 프로모션 기간 설정 (2026년 1월 31일까지)
const PROMO_END_DATE = new Date('2026-02-01T00:00:00+09:00')

// 이메일 해시 생성
function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')
}

// 🌍 IP로 국가 정보 가져오기
async function getCountryFromIP(ip: string): Promise<{ country: string; countryCode: string }> {
  // localhost나 내부 IP는 스킵
  if (ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip === '::1') {
    return { country: 'Local', countryCode: 'LO' }
  }
  
  try {
    // 무료 IP Geolocation API (상업용은 ip-api.com/pro 권장)
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode`, {
      signal: AbortSignal.timeout(3000) // 3초 타임아웃
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
    async signIn({ user, account }) {
      if (!user.email) return false

      try {
        // 🌍 IP 주소 가져오기
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() 
          || headersList.get('x-real-ip') 
          || 'unknown'
        
        // 현재 시간 (한 번만 생성)
        const now = new Date().toISOString()
        
        // 기존 사용자 확인
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single()

        if (!existingUser) {
          // 🌍 국가 정보 조회
          const { country, countryCode } = await getCountryFromIP(ip)
          
          // 🎉 프로모션 기간 체크
          const isPromoPeriod = new Date() < PROMO_END_DATE
          
          // 🔴 재가입 체크 (프로모션 악용 방지)
          const emailHash = hashEmail(user.email)
          const { data: deletedUser } = await supabase
            .from('deleted_users')
            .select('promo_code')
            .eq('email_hash', emailHash)
            .single()
          
          // 이전에 프로모션 받았으면 이번엔 무료로
          const hadPromo = deletedUser?.promo_code ? true : false
          const canGetPromo = isPromoPeriod && !hadPromo
          
          // ✅ 신규 사용자 생성 (last_login_at 포함!)
          await supabase.from('users').insert({
            email: user.email,
            name: user.name,
            avatar_url: user.image,
            provider: account?.provider,
            provider_id: account?.providerAccountId,
            // 🌍 IP 및 국가 정보
            signup_ip: ip,
            signup_country: country,
            signup_country_code: countryCode,
            // 프로모션 적용 여부
            tier: canGetPromo ? 'premium' : 'free',
            premium_expires_at: canGetPromo ? PROMO_END_DATE.toISOString() : null,
            promo_code: canGetPromo ? 'LAUNCH_2026' : null,
            // ✅ 핵심 수정: 가입 시점 = 최초 로그인!
            last_login_at: now,
          })
          
          console.log(`✅ New user: ${user.email} from ${country} (${countryCode}), IP: ${ip}`)
        } else {
          // ✅ 기존 사용자: 로그인 시간 + 마지막 IP 업데이트
          await supabase
            .from('users')
            .update({ 
              last_login_at: now,
              last_login_ip: ip
            })
            .eq('email', user.email)
        }

        return true
      } catch (error) {
        console.error('SignIn error:', error)
        return true
      }
    },

    async session({ session }) {
      if (session.user?.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, tier, premium_expires_at, promo_code')
          .eq('email', session.user.email)
          .single()

        if (userData) {
          session.user.id = userData.id
          
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