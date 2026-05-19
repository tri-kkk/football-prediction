# Phase 2 마이그레이션 보조 스크립트
# app/[locale]/ 안으로 옮긴 페이지들의 상대 경로 import를 한 단계 deepen
# sandbox에서 처리 못한 24개 파일만 타겟팅

$ErrorActionPreference = 'Stop'

# 처리 대상 (sandbox에서 FileNotFoundError로 스킵된 파일들)
$retryFiles = @(
    'about/page.tsx',
    'advertise/page.tsx',
    'api-docs/apiData.ts',
    'api-docs/layout.tsx',
    'api-docs/page.tsx',
    'contact/page.tsx',
    'dashboard/page.tsx',
    'football/FootballHomeContent.tsx',
    'football/layout.tsx',
    'football/page.tsx',
    'highlights/page.tsx',
    'login/page.tsx',
    'magazine/page.tsx',
    'news/layout.tsx',
    'news/page.tsx',
    'privacy/page.tsx',
    'proto/layout.tsx',
    'proto/page.tsx',
    'results/layout.tsx',
    'results/page.tsx',
    'signup-complete/page.tsx',
    'signup/page.tsx',
    'terms/page.tsx',
    'test-payment/page.tsx',
    'test-payment/result/page.tsx',
    'toto/page.tsx'
)

# 상대 경로 한 단계 추가 패턴들
# 주의: 정규식의 \. 은 PowerShell에서 그대로 동작
$replacements = @(
    @{ Pattern = "(\bfrom\s+['""])\.\./";        Replacement = '$1../../' }
    @{ Pattern = "(\bfrom\s+['""])\./";           Replacement = '$1../' }
    @{ Pattern = "(\bimport\s+['""])\.\./";       Replacement = '$1../../' }
    @{ Pattern = "(\bimport\s+['""])\./";         Replacement = '$1../' }
    @{ Pattern = "(\bimport\s*\(\s*['""])\.\./";  Replacement = '$1../../' }
    @{ Pattern = "(\bimport\s*\(\s*['""])\./";    Replacement = '$1../' }
    @{ Pattern = "(\brequire\s*\(\s*['""])\.\./"; Replacement = '$1../../' }
    @{ Pattern = "(\brequire\s*\(\s*['""])\./";   Replacement = '$1../' }
)

$rootDir = 'app/[locale]'
$fixed = 0
$skipped = 0
$noChange = 0

foreach ($rel in $retryFiles) {
    $path = Join-Path $rootDir $rel
    if (-not (Test-Path -LiteralPath $path)) {
        Write-Host "  SKIP (not found): $rel" -ForegroundColor Yellow
        $skipped++
        continue
    }

    $content = Get-Content -LiteralPath $path -Raw -Encoding UTF8
    $newContent = $content
    foreach ($r in $replacements) {
        $newContent = [regex]::Replace($newContent, $r.Pattern, $r.Replacement)
    }

    if ($newContent -ne $content) {
        # 줄바꿈 마지막 newline 보존
        Set-Content -LiteralPath $path -Value $newContent -NoNewline -Encoding UTF8
        Write-Host "  FIX: $rel" -ForegroundColor Green
        $fixed++
    } else {
        Write-Host "  no change: $rel" -ForegroundColor DarkGray
        $noChange++
    }
}

Write-Host ""
Write-Host "===== 결과 =====" -ForegroundColor Cyan
Write-Host "수정: $fixed, 변경없음: $noChange, 스킵: $skipped"
