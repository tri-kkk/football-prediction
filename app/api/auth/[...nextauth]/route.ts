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
          .eq('email', user.email)
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
            .eq('email', user.email)
          
          console.log(`✅ Existing user login: ${user.email}`)
          return true
        }

        // ✅ 2. pending_users에서 확인
        const { data: pendingUser } = await supabase
          .from('pending_users')
          .select('id')
          .eq('email', user.email)
          .single()

        if (pendingUser) {
          await supabase
            .from('pending_users')
            .update({ 
              updated_at: now,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('email', user.email)
          
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
      if (!session.user?.email) {
        return session
      }

      try {
        // ✅ users 테이블 확인
        const { data: userData } = await supabase
          .from('users')
          .select('id, tier, name, premium_expires_at, promo_code, terms_agreed_at')
          .eq('email', session.user.email.toLowerCase())
          .single()

        if (userData && userData.terms_agreed_at) {
          console.log('✅ User in users table')
          session.user.id = userData.id
          session.user.termsAgreed = true
          session.user.pendingPromo = null
          session.user.tier = userData.tier || 'free'
          
          if (userData.name) {
            session.user.name = userData.name
          }
          
          if (userData.tier === 'premium' && userData.premium_expires_at) {
            const expiresAt = new Date(userData.premium_expires_at)
            if (new Date() > expiresAt) {
              await supabase
                .from('users')
                .update({ tier: 'free' })
                .eq('email', session.user.email)
              session.user.tier = 'free'
            }
          }
          
          return session
        }

        // ✅ pending_users 확인
        const { data: pendingData } = await supabase
          .from('pending_users')
          .select('id, pending_promo')
          .eq('email', session.user.email.toLowerCase())
          .single()

        if (pendingData) {
          console.log('⏳ User in pending_users')
          session.user.id = pendingData.id
          session.user.termsAgreed = false
          session.user.pendingPromo = pendingData.pending_promo
          session.user.tier = 'guest'
          return session
        }

        console.log('⚠️ User not found')
        session.user.termsAgreed = false
        session.user.tier = 'guest'

      } catch (error) {
        console.error('Session error:', error)
        session.user.termsAgreed = false
        session.user.tier = 'guest'
      }

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