import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다 - TrendSoccer',
  description: '요청하신 페이지가 존재하지 않습니다.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-gray-700 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
          <br />
          URL을 다시 확인해 주세요.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            축구 홈으로
          </Link>
          <Link
            href="/baseball"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            야구 홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
