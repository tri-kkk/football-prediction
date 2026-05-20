/**
 * GET /api/v1/mobile/app-config
 *
 * 앱 실행 시 최초 호출. 강제 업데이트 / 점검 모드 / 최소 지원 버전 안내.
 *
 * 응답:
 *  - minSupportedVersion: 미만이면 강제 업데이트
 *  - latestVersion: 마켓 최신 버전 (선택적 업데이트 안내용)
 *  - forceUpdate: 강제 업데이트 플래그 (정책 변경, 보안 패치 등 긴급 상황)
 *  - maintenanceMode: 점검 중 여부
 *
 * v1은 환경변수 기반. 추후 `app_configs` 테이블로 이전 검토.
 *
 * 비인증 엔드포인트 (앱 실행 시점에 토큰이 없을 수 있음).
 */

import { NextRequest } from 'next/server'

import { ErrorCode, errorResponse, successResponse } from '@/lib/mobile-api'

// ──────────────────────────────────────────────────────────────────
// 환경변수 → 폴백 기본값
// ──────────────────────────────────────────────────────────────────

const DEFAULT_MIN_VERSION_ANDROID = '1.0.0'
const DEFAULT_LATEST_VERSION_ANDROID = '1.0.0'
const DEFAULT_MIN_VERSION_IOS = '1.0.0'
const DEFAULT_LATEST_VERSION_IOS = '1.0.0'

function readEnvBool(name: string, fallback = false): boolean {
  const v = process.env[name]
  if (!v) return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

function readEnvStr(name: string, fallback: string): string {
  return process.env[name] || fallback
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = (searchParams.get('platform') || 'android').toLowerCase()
    const currentVersion = searchParams.get('version') || null

    const isIos = platform === 'ios'

    const minSupportedVersion = readEnvStr(
      isIos ? 'MOBILE_MIN_VERSION_IOS' : 'MOBILE_MIN_VERSION_ANDROID',
      isIos ? DEFAULT_MIN_VERSION_IOS : DEFAULT_MIN_VERSION_ANDROID
    )

    const latestVersion = readEnvStr(
      isIos ? 'MOBILE_LATEST_VERSION_IOS' : 'MOBILE_LATEST_VERSION_ANDROID',
      isIos ? DEFAULT_LATEST_VERSION_IOS : DEFAULT_LATEST_VERSION_ANDROID
    )

    const forceUpdate = readEnvBool('MOBILE_FORCE_UPDATE', false)
    const maintenanceMode = readEnvBool('MOBILE_MAINTENANCE_MODE', false)

    const updateMessage =
      readEnvStr('MOBILE_UPDATE_MESSAGE', '') ||
      '새로운 기능과 안정성 개선이 포함된 업데이트가 있습니다.'

    const maintenanceMessage =
      readEnvStr('MOBILE_MAINTENANCE_MESSAGE', '') ||
      '서비스 점검 중입니다. 잠시 후 다시 시도해주세요.'

    // 외부 링크
    const storeUrl = isIos
      ? readEnvStr('MOBILE_STORE_URL_IOS', 'https://apps.apple.com/app/id0000000000')
      : readEnvStr(
          'MOBILE_STORE_URL_ANDROID',
          'https://play.google.com/store/apps/details?id=com.trendsoccer.app'
        )

    // 클라이언트 버전이 minSupportedVersion 미만이면 강제 업데이트
    const versionIsOutdated =
      currentVersion && compareSemver(currentVersion, minSupportedVersion) < 0

    return successResponse({
      platform: isIos ? 'ios' : 'android',
      minSupportedVersion,
      latestVersion,
      forceUpdate: forceUpdate || versionIsOutdated || false,
      updateMessage,
      maintenanceMode,
      maintenanceMessage: maintenanceMode ? maintenanceMessage : null,
      storeUrl,
      // 추가 정보 — 앱 내 분기에 활용
      supportEmail: readEnvStr('MOBILE_SUPPORT_EMAIL', 'support@trendsoccer.com'),
      privacyPolicyUrl: readEnvStr(
        'MOBILE_PRIVACY_URL',
        'https://trendsoccer.com/privacy'
      ),
      termsUrl: readEnvStr('MOBILE_TERMS_URL', 'https://trendsoccer.com/terms'),
    })
  } catch (error) {
    console.error('[Mobile /app-config] error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}

// ──────────────────────────────────────────────────────────────────
// Semver 비교 (간이판: major.minor.patch만 지원)
// returns: a<b → -1, a==b → 0, a>b → 1
// ──────────────────────────────────────────────────────────────────

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((s) => parseInt(s, 10) || 0)
  const pb = b.split('.').map((s) => parseInt(s, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const ai = pa[i] || 0
    const bi = pb[i] || 0
    if (ai < bi) return -1
    if (ai > bi) return 1
  }
  return 0
}
