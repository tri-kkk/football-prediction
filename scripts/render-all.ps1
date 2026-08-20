# scripts/render-all.ps1
#
# 하루치 숏폼을 한 번에 렌더링한다. Windows 작업 스케줄러에서 호출한다.
#
#   .\scripts\render-all.ps1                          배포 서버 데이터로 렌더
#   .\scripts\render-all.ps1 -BaseUrl http://localhost:3000   로컬 개발 서버로 렌더
#   .\scripts\render-all.ps1 -Only daily              특정 포맷만
#
# 기본값이 배포 서버라 npm run dev 를 띄워둘 필요가 없다.
# 대신 새로 만든 API 라우트가 배포돼 있어야 한다.
#
# ⚠ 이 파일은 반드시 "UTF-8 with BOM" 으로 저장해야 한다.
#    Windows PowerShell 5.1 은 BOM 이 없으면 cp949 로 읽어서
#    한글 주석·문자열이 깨지고 구문 오류가 난다.

param(
  [string]$BaseUrl = "https://www.trendsoccer.com",
  [string]$Only = "",
  [switch]$SkipTop5
)

$ErrorActionPreference = "Continue"

# 프로젝트 루트로 이동 (스케줄러가 어디서 실행하든 상관없게)
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:SHORTS_BASE_URL = $BaseUrl

$today  = Get-Date
$stamp  = $today.ToString("yyyy-MM-dd")
$outDir = Join-Path $root "out\$stamp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$logPath = Join-Path $outDir "render.log"

function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg
  Write-Host $line
  Add-Content -Path $logPath -Value $line -Encoding UTF8
}

Write-Log "=========================================="
Write-Log "TrendSoccer 숏폼 일괄 렌더"
Write-Log "데이터 서버: $BaseUrl"
Write-Log "출력 폴더: $outDir"
Write-Log "=========================================="

# ── 오늘 돌릴 작업 목록 ──────────────────────────────────
# 어제 성적표를 먼저 돌린다. 오늘 픽보다 먼저 올리는 게 순서상 자연스럽다.
$jobs = @(
  @{ name = "어제 성적표 · 유럽축구"; args = @("--format=result", "--sport=football", "--group=euro") },
  @{ name = "오늘의 픽 · 유럽축구";   args = @("--format=daily",  "--sport=football", "--group=euro") },
  @{ name = "어제 성적표 · KBO";      args = @("--format=result", "--sport=baseball", "--league=KBO") },
  @{ name = "오늘의 픽 · KBO";        args = @("--format=daily",  "--sport=baseball", "--league=KBO") }
)

# 주말 TOP 5 는 금요일에만
if (-not $SkipTop5 -and $today.DayOfWeek -eq [System.DayOfWeek]::Friday) {
  $jobs += @{ name = "주말 TOP 5 · 유럽축구"; args = @("--format=top5", "--group=euro") }
  Write-Log "금요일 — 주말 TOP 5 포함"
}

if ($Only -ne "") {
  $jobs = @($jobs | Where-Object { $_.args -contains "--format=$Only" })
  Write-Log "필터 적용: --format=$Only ($($jobs.Count)건)"
}

# ── 실행 ─────────────────────────────────────────────────
$ok = 0
$skipped = 0
$failed = 0
$startAll = Get-Date

foreach ($job in $jobs) {
  Write-Log ""
  Write-Log "▶ $($job.name)"
  $started = Get-Date

  $argList = @("scripts/render-shorts.mjs") + $job.args + @("--out=$outDir")
  $output = & node $argList 2>&1
  $code = $LASTEXITCODE

  foreach ($line in $output) { Add-Content -Path $logPath -Value "    $line" -Encoding UTF8 }

  $elapsed = [math]::Round(((Get-Date) - $started).TotalSeconds)

  if ($code -eq 0) {
    Write-Log "  ✓ 완료 ($elapsed 초)"
    $ok++
  }
  elseif ($output -match "픽이 없습니다|정산된 픽이 없습니다") {
    # 경기가 없는 날은 정상이다. 실패로 세지 않는다.
    Write-Log "  – 건너뜀 (해당 데이터 없음)"
    $skipped++
  }
  else {
    Write-Log "  ✗ 실패 (exit $code) — 자세한 내용은 render.log 참고"
    $failed++
  }
}

$totalMin = [math]::Round(((Get-Date) - $startAll).TotalMinutes, 1)

Write-Log ""
Write-Log "=========================================="
Write-Log "완료: $ok 개 · 건너뜀: $skipped 개 · 실패: $failed 개"
Write-Log "총 소요: $totalMin 분"

$files = Get-ChildItem -Path $outDir -Filter *.mp4 -ErrorAction SilentlyContinue
if ($files) {
  Write-Log "생성된 영상:"
  foreach ($f in $files) {
    Write-Log ("  {0}  ({1:N1} MB)" -f $f.Name, ($f.Length / 1MB))
  }
}
Write-Log "=========================================="

# 실패가 있으면 스케줄러가 알 수 있게 종료 코드를 남긴다
if ($failed -gt 0) { exit 1 }
exit 0
