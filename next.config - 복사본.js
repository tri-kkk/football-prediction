/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack 비활성화 (webpack 사용)
  turbopack: false,
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('undici')
    }
    return config
  },
}