const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ffmpeg-static은 빌드 시점에 __dirname을 잘못 치환하므로 번들에서 제외
  serverExternalPackages: ['ffmpeg-static'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'crests.football-data.org', pathname: '/**' },
      { protocol: 'https', hostname: 'media.api-sports.io', pathname: '/**' },
      { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/**' },
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.scorebat.com', pathname: '/**' },
      { protocol: 'https', hostname: 'scorebat.com', pathname: '/**' },
      { protocol: 'https', hostname: 'flagcdn.com', pathname: '/**' },
      { protocol: 'https', hostname: 'img.icons8.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lgcxydabfbch3774324.cdn.ntruss.com', pathname: '/**' },
      { protocol: 'https', hostname: 'a.espncdn.com', pathname: '/**' },
      { protocol: 'https', hostname: 'baseball.yahoo.co.jp', pathname: '/**' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/movement',
        destination: '/',
        permanent: true,
      },
      {
        source: '/baseball/predictions/:path*',
        destination: '/baseball/analysis/:path*',
        permanent: true,
      },
      {
        source: '/baseball/combo-picks/:path*',
        destination: '/baseball/multi-match/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/api/proto/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ]
  },
}

module.exports = withNextIntl(nextConfig)
