/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,  // 이미지 최적화 끄기 - Vercel 한도 절약
    remotePatterns: [
      // 축구 데이터
      { protocol: 'https', hostname: 'crests.football-data.org', pathname: '/**' },
      { protocol: 'https', hostname: 'media.api-sports.io', pathname: '/**' },
      
      // 위키피디아
      { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/**' },
      
      // 유튜브 썸네일
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      
      // 하이라이트
      { protocol: 'https', hostname: 'www.scorebat.com', pathname: '/**' },
      { protocol: 'https', hostname: 'scorebat.com', pathname: '/**' },
      
      // 국기 & 아이콘
      { protocol: 'https', hostname: 'flagcdn.com', pathname: '/**' },
      { protocol: 'https', hostname: 'img.icons8.com', pathname: '/**' },
      
      // 기타
      { protocol: 'https', hostname: 'lgcxydabfbch3774324.cdn.ntruss.com', pathname: '/**' },
      { protocol: 'https', hostname: 'a.espncdn.com', pathname: '/**' },
      { protocol: 'https', hostname: 'baseball.yahoo.co.jp', pathname: '/**' },
    ],
  },
}

module.exports = nextConfig