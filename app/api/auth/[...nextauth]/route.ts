import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import NaverProvider from 'next-auth/providers/naver'
import { createClient } from '@supabase/supabase-js'
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
        // 기존 사용자 확인
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single()

        if (!existingUser) {
          // 🎉 프로모션 기간 체크
          const now = new Date()
          const isPromoPeriod = now < PROMO_END_DATE
          
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
          
          // 신규 사용자 생성
          await supabase.from('users').insert({
            email: user.email,
            name: user.name,
            avatar_url: user.image,
            provider: account?.provider,
            provider_id: account?.providerAccountId,
            // 프로모션 적용 여부
            tier: canGetPromo ? 'premium' : 'free',
            premium_expires_at: canGetPromo ? PROMO_END_DATE.toISOString() : null,
            promo_code: canGetPromo ? 'LAUNCH_2026' : null,
          })
          
          if (hadPromo) {
            console.log(`⚠️ Returning user (promo already used): ${user.email}`)
          } else {
            console.log(`✅ New user: ${user.email}, tier: ${canGetPromo ? 'premium (promo)' : 'free'}`)
          }
        } else {
          // 로그인 시간 업데이트
          await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('email', user.email)
        }

        return true
      } catch (error) {
        console.error('SignIn error:', error)
        return true // 에러가 나도 일단 로그인 허용
      }
    },

    async session({ session }) {
      if (session.user?.email) {
        // 사용자 티어 정보 추가
        const { data: userData } = await supabase
          .from('users')
          .select('id, tier, premium_expires_at, promo_code')
          .eq('email', session.user.email)
          .single()

        if (userData) {
          session.user.id = userData.id
          
          // 🎉 프리미엄 만료 체크
          let currentTier = userData.tier
          if (userData.tier === 'premium' && userData.premium_expires_at) {
            const expiresAt = new Date(userData.premium_expires_at)
            if (new Date() > expiresAt) {
              // 만료됨 - free로 전환
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