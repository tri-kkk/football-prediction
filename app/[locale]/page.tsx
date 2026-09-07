// 홈 라우트 — 서버 컴포넌트 래퍼 (2026-09-07 SEO 개편)
//
// 기존 홈은 파일 전체가 'use client' 라 서버가 내려주는 HTML 에 본문 텍스트가 없었다.
// 네이버 Yeti 는 자바스크립트 실행이 제한적이라 홈을 '빈 페이지'로 수집한다.
// → 인터랙티브 피드는 HomeClient 로 그대로 두고,
//   서버에서 렌더되는 HomeSeoSection(본문 + 최신 리포트 내부 링크)을 아래에 붙인다.

import HomeClient from './HomeClient'
import HomeSeoSection from '../components/home/HomeSeoSection'

// 최신 리포트 목록을 30분 단위로 갱신
export const revalidate = 1800

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <>
      <HomeClient />
      <HomeSeoSection locale={locale} />
    </>
  )
}
