# Phase 2 마이그레이션 보조 스크립트 (v2)
#
# deepen 스크립트가 ./X (같은 폴더 import)를 ../X로 잘못 변환한 케이스를 원복.
# X가 import 파일과 같은 폴더에 실제로 존재하면 ./X로 롤백.
#
# v2: ScriptBlock closure 문제 회피하기 위해 일반 for 루프 + Matches 사용.

$ErrorActionPreference = 'Stop'

$rootDir = 'app/[locale]'
$files = Get-ChildItem -LiteralPath $rootDir -Recurse -Include *.ts, *.tsx, *.js, *.jsx -File

$pattern = "(\b(?:from|import)\s+['""])\.\./([^'""\/]+)(['""])"
$regex = [regex]::new($pattern)
$fixed = 0

foreach ($file in $files) {
    if ($file.Name -like '*.bak*') { continue }

    $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    if (-not $content) { continue }
    $originalContent = $content
    $folder = $file.Directory.FullName

    # 모든 매칭을 찾고, 뒤에서 앞으로 교체 (인덱스 안 깨지게)
    $matches = $regex.Matches($content)
    for ($i = $matches.Count - 1; $i -ge 0; $i--) {
        $m = $matches[$i]
        $name = $m.Groups[2].Value

        $exists = $false
        foreach ($ext in @('', '.ts', '.tsx', '.js', '.jsx')) {
            $candidate = Join-Path $folder ($name + $ext)
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                $exists = $true
                break
            }
        }
        if (-not $exists) {
            $candidateDir = Join-Path $folder $name
            if (Test-Path -LiteralPath $candidateDir -PathType Container) {
                $exists = $true
            }
        }

        if ($exists) {
            $prefix = $m.Groups[1].Value
            $suffix = $m.Groups[3].Value
            $replacement = $prefix + './' + $name + $suffix
            $content = $content.Substring(0, $m.Index) + $replacement + $content.Substring($m.Index + $m.Length)
        }
    }

    if ($content -ne $originalContent) {
        Set-Content -LiteralPath $file.FullName -Value $content -NoNewline -Encoding UTF8
        $rel = $file.FullName.Replace((Get-Location).Path + [IO.Path]::DirectorySeparatorChar, '')
        Write-Host "  ROLLBACK: $rel" -ForegroundColor Green
        $fixed++
    }
}

Write-Host ""
Write-Host "===== 결과 =====" -ForegroundColor Cyan
Write-Host "원복: $fixed개 파일"
