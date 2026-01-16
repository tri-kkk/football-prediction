'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

// 약관 체크가 필요 없는 경로들
const PUBLIC_PATHS = [
  '/login',
  '/auth/terms',
  '/terms',
  '/privacy',
  '/api',
]

export default function TermsGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // 로딩 중이면 스킵
    if (status === 'loading') return
    
    // 공개 경로는 스킵
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) return
    
    // 로그인 안 했으면 스킵 (비회원도 서비스 이용 가능)
    if (status === 'unauthenticated') return
    
    // 로그인 했는데 약관 미동의면 약관 페이지로
    if (session?.user && !session.user.termsAgreed) {
      router.push('/auth/terms')
    }
  }, [session, status, pathname, router])

  return <>{children}</>
}
