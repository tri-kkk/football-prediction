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

function safeStringify(value: any): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    try { return JSON.stringify(value) } catch { return null }
  }
  try { return Object.prototype.toString.call(value) } catch { return null }
}

const handler = NextAuth({
  cookies: {
    state: {
      name: 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
  },
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

        const { data: existingUser } = await supabase
          .from('users')
          .select('id, name, terms_agreed_at')
          .eq('email', user.email.toLowerCase())
          .single()

        if (existingUser) {
          const updateData: any = { last_login_at: now, last_login_ip: ip }
          if (!existingUser.name) {
            const userName = user.name
              || (profile as any)?.response?.name
              || (profile as any)?.response?.nickname
              || (profile as any)?.name
              || null
            if (userName) updateData.name = userName
          }
          await supabase.from('users').update(updateData).eq('email', user.email.toLowerCase())
          console.log(`✅ Existing user login: ${user.email}`)
          return true
        }

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

        const { country, countryCode } = await getCountryFromIP(ip)
        const isPromoPeriod = new Date() < PROMO_END_DATE
        const emailHash = hashEmail(user.email)
        const { data: deletedUser } = await supabase
          .from('deleted_users')
          .select('promo_code, deleted_at, subscription_tier')
          .eq('email_hash', emailHash)
          .single()

        // ✅ 재가입 쿨다운: 탈퇴 후 7일 이내 재가입 차단
        if (deletedUser?.deleted_at) {
          const deletedAt = new Date(deletedUser.deleted_at)
          const cooldownEnd = new Date(deletedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (new Date() < cooldownEnd) {
            const daysLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            console.log(`🚫 재가입 쿨다운 중: ${user.email}, ${daysLeft}일 남음`)
            return `/login?error=cooldown&days=${daysLeft}`
          }
        }

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
      if (!session.user?.email) return session

      try {
        // ✅ trial_used, trial_started_at, premium_expires_at 추가 조회
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, tier, name, promo_code, terms_agreed_at, premium_expires_at, trial_used, trial_started_at')
          .ilike('email', session.user.email)
          .single()

        if (userData && userData.terms_agreed_at) {
          session.user.id = userData.id
          session.user.termsAgreed = true
          session.user.pendingPromo = null
          ;(session.user as any).promo_code = userData.promo_code || null

          if (userData.name) session.user.name = userData.name

          // ✅ trial 정보 세션에 포함
          ;(session.user as any).trialUsed = userData.trial_used || false
          ;(session.user as any).trialStartedAt = userData.trial_started_at || null

          const now = new Date()

          // ✅ users.premium_expires_at 기준으로 먼저 만료 체크
          if (userData.premium_expires_at) {
            const expiresAt = new Date(userData.premium_expires_at)

            if (now > expiresAt) {
              // 만료됨 → free로 다운그레이드
              console.log('⏰ [SESSION] premium_expires_at 만료 → free')
              ;(session.user as any).tier = 'free'
              ;(session.user as any).premiumExpiresAt = null

              supabase
                .from('users')
                .update({ tier: 'free', updated_at: now.toISOString() })
                .eq('id', userData.id)
                .then(() => console.log('✅ tier downgraded to free'))
                .catch(() => {})
            } else {
              // 아직 유효 → premium 유지
              ;(session.user as any).tier = 'premium'
              ;(session.user as any).premiumExpiresAt = userData.premium_expires_at

              const hoursLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))
              const isTrial = userData.trial_used === true && hoursLeft <= 48
              console.log(`✅ [SESSION] premium 유효 (${hoursLeft}h 남음, trial: ${isTrial})`)
            }
          } else if (userData.tier === 'premium') {
            // premium_expires_at 없는 프리미엄 → subscriptions 테이블 확인
            console.log('💎 [SESSION] subscriptions 테이블 확인')

            const { data: subscription } = await supabase
              .from('subscriptions')
              .select('expires_at, plan')
              .eq('user_id', userData.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (subscription?.expires_at) {
              const expiresAtStr = safeStringify(subscription.expires_at)
              const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null

              if (expiresAt && now > expiresAt) {
                ;(session.user as any).tier = 'free'
                ;(session.user as any).premiumExpiresAt = null
                supabase.from('users').update({ tier: 'free', updated_at: now.toISOString() }).eq('id', userData.id).then(() => {}).catch(() => {})
              } else {
                ;(session.user as any).tier = 'premium'
                ;(session.user as any).premiumExpiresAt = expiresAtStr
              }
            } else {
              // 구독도 없음 → free
              console.log('⚠️ [SESSION] 구독 없음 → free')
              ;(session.user as any).tier = 'free'
              ;(session.user as any).premiumExpiresAt = null
              supabase.from('users').update({ tier: 'free', updated_at: now.toISOString() }).eq('id', userData.id).then(() => {}).catch(() => {})
            }
          } else {
            // 그냥 free
            ;(session.user as any).tier = 'free'
            ;(session.user as any).premiumExpiresAt = null
          }

          return session
        }

        // pending_users 확인
        const { data: pendingData } = await supabase
          .from('pending_users')
          .select('id, pending_promo')
          .ilike('email', session.user.email)
          .single()

        if (pendingData) {
          session.user.id = pendingData.id
          session.user.termsAgreed = false
          session.user.pendingPromo = pendingData.pending_promo
          ;(session.user as any).tier = 'free'
          ;(session.user as any).premiumExpiresAt = null
          ;(session.user as any).promo_code = null
          ;(session.user as any).trialUsed = false
          return session
        }

        session.user.termsAgreed = false
        ;(session.user as any).tier = 'free'
        ;(session.user as any).premiumExpiresAt = null
        ;(session.user as any).promo_code = null
        ;(session.user as any).trialUsed = false

      } catch (error) {
        console.log('⚠️ [SESSION] error:', error)
        session.user.termsAgreed = false
        ;(session.user as any).tier = 'free'
        ;(session.user as any).premiumExpiresAt = null
        ;(session.user as any).promo_code = null
        ;(session.user as any).trialUsed = false
      }

      return session
    },

    async redirect({ url, baseUrl }) {
      if (url.includes('/signup-complete')) return url
      if (url.startsWith('/')) return url
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})

export { handler as GET, handler as POST }