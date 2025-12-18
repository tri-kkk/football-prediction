import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '프리미엄 경기 예측 - TrendSoccer | Premium Match Predictions',
  description: '6대 리그, 최근 4시즌 데이터 기반 승률 예측. AI-powered match predictions based on 4 seasons of data from top 6 leagues.',
  keywords: 'AI 축구 예측, 승률 예측, 경기 예측, Soccer Prediction, Football Betting Tips, Match Predictions',
  openGraph: {
    title: '프리미엄 경기 예측 - TrendSoccer | Premium Match Predictions',
    description: '6대 리그, 최근 4시즌 데이터 기반 승률 예측 | AI-powered predictions',
  },
}

export default function PremiumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}