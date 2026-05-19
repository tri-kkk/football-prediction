'use client'

/**
 * Standalone 어드민 분석 페이지 (직접 URL 접근용)
 * /admin/ads 의 탭에서도 같은 PostHogAnalyticsDashboard 컴포넌트가 재사용됨.
 */

import Link from 'next/link'
import AdminProtect from '../../../components/AdminProtect'
import PostHogAnalyticsDashboard from '../../../components/admin/PostHogAnalyticsDashboard'

export default function AdminAnalyticsPage() {
  return (
    <AdminProtect>
      <div className="min-h-screen bg-[#0f0f0f] text-white">
        <header className="border-b border-gray-800 bg-gray-900/50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold">📊 트래픽 분석 (PostHog)</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                메인 어드민 페이지에서도 동일한 데이터를 볼 수 있습니다
              </p>
            </div>
            <Link
              href="/admin/ads"
              className="text-xs text-gray-400 hover:text-white"
            >
              ← 메인 어드민
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">
          <PostHogAnalyticsDashboard />
        </main>
      </div>
    </AdminProtect>
  )
}
