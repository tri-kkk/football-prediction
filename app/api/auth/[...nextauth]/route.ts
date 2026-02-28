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

const PROMO_END_DATE = new Date('2026-03-01T00:00:00+09:00')

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')
}

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

/**
 * ✅ 안전한 문자열 변환
 * - null, undefined 체크
 * - 이미 문자열이면 그대로 반환
 */
function safeStringify(value: any): string | null {
  if (value === null || value === undefined) {
    return null
  }
  
  // 이미 문자열이면 그대로 반환
  if (typeof value === 'string') {
    return value
  }
  
  // 객체면 JSON 문자열로
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return null
    }
  }
  
  // 그 외에는 toString() 사용
  try {
    return String(value)
  } catch {
    return null
  }
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
        
        // ✅ 1. users 테이블에서 확인
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, name, terms_agreed_at')
          .eq('email', user.email.toLowerCase())
          .single()

        if (existingUser) {
          const updateData: any = { 
            last_login_at: now,
            last_login_ip: ip
          }

          if (!existingUser.name) {
            const userName = user.name 
              || (profile as any)?.response?.name 
              || (profile as any)?.response?.nickname
              || (profile as any)?.name
              || null
            if (userName) {
              updateData.name = userName
            }
          }

          await supabase
            .from('users')
            .update(updateData)
            .eq('email', user.email.toLowerCase())
          
          console.log(`✅ Existing user login: ${user.email}`)
          return true
        }

        // ✅ 2. pending_users에서 확인
        const { data: pendingUser } = await supabase
          .from('pending_users')
          .select('id')
          .eq('email', user.email.toLowerCase())
          .single()

        if (pendingUser) {
          await supabase
            .from('pending_users')
            .update({ 
              updated_at: now,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('email', user.email.toLowerCase())
          
          console.log(`🔄 Pending user re-login: ${user.email}`)
          return true
        }

        // ✅ 3. 신규 사용자
        const { country, countryCode } = await getCountryFromIP(ip)
        const isPromoPeriod = new Date() < PROMO_END_DATE
        
        const emailHash = hashEmail(user.email)
        const { data: deletedUser } = await supabase
          .from('deleted_users')
          .select('promo_code')
          .eq('email_hash', emailHash)
          .single()
        
        const hadPromo = deletedUser?.promo_code ? true : false
        const canGetPromo = isPromoPeriod && !hadPromo
        
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
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        
        console.log(`🆕 New pending user: ${user.email}`)
        return true

      } catch (error) {
        console.error('SignIn error:', error)
        return true
      }
    },

    async session({ session }) {
      console.log('🔍 [SESSION] SESSION CALLBACK START')
      console.log('🔍 [SESSION] session.user.email:', session.user?.email)
      
      if (!session.user?.email) {
        console.log('❌ [SESSION] No email in session')
        return session
      }

      try {
        console.log('🔍 [SESSION] Querying users table for:', session.user.email.toLowerCase())
        
        // ✅ users 테이블 확인
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, tier, name, promo_code, terms_agreed_at')
          .ilike('email', session.user.email)
          .single()

        console.log('🔍 [SESSION] userData:', userData)
        console.log('🔍 [SESSION] userError:', userError)
        console.log('🔍 [SESSION] userData.terms_agreed_at:', userData?.terms_agreed_at)

        if (userData && userData.terms_agreed_at) {
          console.log('✅ User in users table - SETTING PREMIUM DATA')
          session.user.id = userData.id
          session.user.termsAgreed = true
          session.user.pendingPromo = null
          session.user.tier = userData.tier || 'free'
          
          if (userData.name) {
            session.user.name = userData.name
          }

          // ✅ promo_code 할당 (안전)
          (session.user as any).promo_code = userData.promo_code || null
          
          console.log('💎 [SESSION] Assigned promo_code:', userData.promo_code)

          // ✅ 프리미엄 사용자면 subscriptions 테이블에서 만료일 조회
          if (userData.tier === 'premium' && userData.id) {
            console.log('💎 [SESSION] Premium user detected, fetching subscription...')
            
            try {
              // subscriptions 테이블에서 active 구독 조회
              const { data: subscription, error: subError } = await supabase
                .from('subscriptions')
                .select('expires_at, plan')
                .eq('user_id', userData.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

              if (subError) {
                console.error('❌ [SESSION] Subscription query error:', subError)
              }

              if (subscription?.expires_at) {
                // ✅ 안전한 문자열 변환 (이미 문자열일 수 있음)
                const expiresAtStr = safeStringify(subscription.expires_at)
                
                if (expiresAtStr) {
                  (session.user as any).premium_expires_at = expiresAtStr
                  console.log('✅ [SESSION] Assigned premium_expires_at:', expiresAtStr)
                  
                  // 만료 여부 확인
                  try {
                    const expiresAt = new Date(expiresAtStr)
                    const now = new Date()
                    
                    if (now > expiresAt) {
                      console.log('⏰ [SESSION] Premium expired, downgrading to free')
                      
                      // 사용자 tier 업데이트
                      await supabase
                        .from('users')
                        .update({ 
                          tier: 'free',
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', userData.id)
                      
                      session.user.tier = 'free'
                      (session.user as any).premium_expires_at = null
                    } else {
                      const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                      console.log(`✅ [SESSION] Premium active: ${daysRemaining}일 남음`)
                    }
                  } catch (dateError) {
                    console.error('⚠️ [SESSION] Date parsing error:', dateError)
                    (session.user as any).premium_expires_at = expiresAtStr
                  }
                } else {
                  console.warn('⚠️ [SESSION] Could not convert expires_at to string')
                  (session.user as any).premium_expires_at = null
                }
              } else {
                console.warn('⚠️ [SESSION] No active subscription found for premium user')
                (session.user as any).premium_expires_at = null
              }
            } catch (subException) {
              console.error('❌ [SESSION] Subscription fetch exception:', subException)
              (session.user as any).premium_expires_at = null
            }
          } else {
            // 무료 사용자
            (session.user as any).premium_expires_at = null
            console.log('🆓 [SESSION] Free user - premium_expires_at set to null')
          }
          
          console.log('🔍 [SESSION] Returning session with tier:', session.user.tier)
          return session
        }

        console.log('🔍 [SESSION] User data not found or terms_agreed_at is null, checking pending_users')

        // ✅ pending_users 확인
        const { data: pendingData, error: pendingError } = await supabase
          .from('pending_users')
          .select('id, pending_promo')
          .ilike('email', session.user.email)
          .single()

        console.log('🔍 [SESSION] pendingData:', pendingData)
        console.log('🔍 [SESSION] pendingError:', pendingError)

        if (pendingData) {
          console.log('⏳ User in pending_users')
          session.user.id = pendingData.id
          session.user.termsAgreed = false
          session.user.pendingPromo = pendingData.pending_promo
          // ✅ 문자열로 명시적 설정 (함수 아님)
          session.user.tier = 'guest'
          (session.user as any).premium_expires_at = null
          (session.user as any).promo_code = null
          return session
        }

        console.log('⚠️ User not found')
        session.user.termsAgreed = false
        // ✅ 문자열로 명시적 설정 (함수 아님)
        session.user.tier = 'guest'
        (session.user as any).premium_expires_at = null
        (session.user as any).promo_code = null

      } catch (error) {
        console.error('❌ [SESSION] Session error:', error)
        session.user.termsAgreed = false
        // ✅ 문자열로 명시적 설정 (함수 아님)
        session.user.tier = 'guest'
        (session.user as any).premium_expires_at = null
        (session.user as any).promo_code = null
      }

      console.log('🔍 [SESSION] RETURNING SESSION:', {
        email: session.user?.email,
        tier: (session.user as any)?.tier,
        termsAgreed: (session.user as any)?.termsAgreed,
        premium_expires_at: (session.user as any)?.premium_expires_at
      })
      
      return session
    },

    // ✅ redirect 콜백 - /signup-complete 제외
    async redirect({ url, baseUrl }) {
      console.log('🔀 Redirect checking:', url)

      // ✅ /signup-complete는 그대로 반환 (리다이렉트하지 않음)
      if (url.includes('/signup-complete')) {
        console.log('⏭️ Skipping redirect for /signup-complete')
        return url
      }

      // 상대경로면 그대로
      if (url.startsWith('/')) {
        return url
      }
      
      // 같은 도메인이면 그대로
      if (new URL(url).origin === baseUrl) {
        return url
      }
      
      // 그 외에는 홈으로
      return baseUrl
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})

export { handler as GET, handler as POST }