#!/usr/bin/env python3
"""
P0 콘텐츠 정비 스크립트 (atomic write)
- 도박 연상 어휘를 데이터 분석 톤으로 일괄 치환
- 변수명/함수명/import 경로/이벤트명/CSS 클래스명/URL은 건드리지 않음
- tempfile + os.replace 로 atomic write — partial write 방지
- write 후 read-back 검증
- dry-run 기본. --apply 줘야 실제 변경

사용법:
    python scripts/p0-content-cleanup.py            # dry-run
    python scripts/p0-content-cleanup.py --apply    # 실제 적용
    python scripts/p0-content-cleanup.py --summary-only --apply
"""

import argparse
import os
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).parent.parent

# ─────────────────────────────────────
# 한글 치환 규칙 — 순서 중요 (긴 패턴 먼저)
# ─────────────────────────────────────
KOREAN_REPLACEMENTS = [
    ('책임감 있는 이용을 권장합니다', '본 분석은 통계 데이터에 기반한 참고 자료입니다'),
    ('책임감 있는 이용', '통계 기반 참고 자료'),
    ('조합 픽', '다경기 분석'),
    ('조합픽', '다경기 분석'),
    ('야구 조합', '야구 다경기'),
    ('승부 예측', '경기 분석'),
    ('승부예측', '경기 분석'),
    ('승률 예측', '데이터 분석'),
    ('승률예측', '데이터 분석'),
    ('매치 예측', '매치 분석'),
    ('경기 예측', '경기 분석'),
    ('축구 예측', '축구 분석'),
    ('야구 예측', '야구 분석'),
    ('AI 예측', 'AI 분석'),
    ('AI예측', 'AI 분석'),
    ('전력 예측', '전력 분석'),
    ('실시간 예측', '실시간 분석'),
    ('프리미엄 예측', '프리미엄 분석'),
    ('일일 예측', '일일 분석'),
    ('오늘의 예측', '오늘의 분석'),
    ('주간 예측', '주간 분석'),
    ('내일의 예측', '내일의 분석'),
    ('이번주 예측', '이번주 분석'),
    ('오늘의 픽', '오늘의 리포트'),
    ('프리미엄 픽', '프리미엄 리포트'),
    ('AI 픽', 'AI 리포트'),
    ('베스트 픽', '베스트 리포트'),
    ('인기 픽', '인기 리포트'),
    ('정합도', '분석 일치도'),
    ('안정형', '전력 우위형'),
    ('변동형', '접전형'),
    ('예측', '분석'),
]

# 영문 치환: (regex_pattern, replacement)
ENGLISH_REPLACEMENTS = [
    (r'\bFootball Betting Tips\b', 'Football Data Analysis'),
    (r'\bbetting tips\b', 'data analysis'),
    (r'\bCombo Picks\b', 'Multi-Match Analysis'),
    (r'\bcombo picks\b', 'multi-match analysis'),
    (r'\bCombo Pick\b', 'Multi-Match Analysis'),
    (r'\bcombo pick\b', 'multi-match analysis'),
    (r'\bMatch Predictions\b', 'Match Analysis'),
    (r'\bmatch predictions\b', 'match analysis'),
    (r'\bMatch Prediction\b', 'Match Analysis'),
    (r'\bmatch prediction\b', 'match analysis'),
    (r'\bFootball Predictions\b', 'Football Analysis'),
    (r'\bfootball predictions\b', 'football analysis'),
    (r'\bFootball Prediction\b', 'Football Analysis'),
    (r'\bfootball prediction\b', 'football analysis'),
    (r'\bSoccer Predictions\b', 'Soccer Analysis'),
    (r'\bsoccer predictions\b', 'soccer analysis'),
    (r'\bSoccer Prediction\b', 'Soccer Analysis'),
    (r'\bsoccer prediction\b', 'soccer analysis'),
    (r'\bBaseball Predictions\b', 'Baseball Analysis'),
    (r'\bbaseball predictions\b', 'baseball analysis'),
    (r'\bAI Prediction\b', 'AI Analysis'),
    (r'\bAI prediction\b', 'AI analysis'),
    (r'\bAI predictions\b', 'AI analysis'),
    (r'\bAI Predictions\b', 'AI Analysis'),
    (r"(['\"`])prediction(['\"`])", r'\1analysis\2'),
    (r"(['\"`])Prediction(['\"`])", r'\1Analysis\2'),
    (r"(['\"`])predictions(['\"`])", r'\1analysis\2'),
    (r"(['\"`])Predictions(['\"`])", r'\1Analysis\2'),
]


INCLUDE_PATTERNS = [
    'app/**/*.tsx',
    'app/**/*.ts',
    'lib/**/*.ts',
    'lib/**/*.tsx',
    'public/manifest.json',
]


def should_skip_path(path: Path) -> bool:
    p = str(path)
    if '.bak' in p or 'node_modules' in p or '/.next/' in p or '\\.next\\' in p:
        return True
    if path.name.endswith(('.bak', '.bak.tsx', '.bak.ts', '.tmp')):
        return True
    # 우리가 만든 안전한 파일 제외
    if path.name in ('analytics.ts',) and 'lib' in str(path):
        return True
    if 'p0-' in path.name:
        return True
    return False


def collect_files(specific_files):
    if specific_files:
        return [ROOT / f for f in specific_files if (ROOT / f).exists()]
    files = []
    for pattern in INCLUDE_PATTERNS:
        files.extend(ROOT.glob(pattern))
    return [f for f in files if f.is_file() and not should_skip_path(f)]


URL_PROTECT = [
    re.compile(r'/baseball/predictions'),
    re.compile(r'/baseball/combo-picks'),
    re.compile(r'baseball/predictions'),
    re.compile(r'baseball/combo-picks'),
]


def in_url(line, ms, me):
    for rgx in URL_PROTECT:
        for m in rgx.finditer(line):
            if m.start() <= ms and me <= m.end():
                return True
    return False


def apply_korean(content):
    changes = []
    new = content
    for old, replacement in KOREAN_REPLACEMENTS:
        if old in new:
            n = new.count(old)
            new = new.replace(old, replacement)
            if n:
                changes.append((old, replacement, n))
    return new, changes


def apply_english(content):
    changes = []
    new = content
    for pattern, replacement in ENGLISH_REPLACEMENTS:
        rgx = re.compile(pattern)
        # URL 보호: 라인 기반 처리
        lines = new.splitlines(keepends=True)
        out = []
        applied = 0
        for line in lines:
            ms = list(rgx.finditer(line))
            if not ms:
                out.append(line)
                continue
            # URL 안에 매치된 것 제외하고 sub
            buf = ''
            last = 0
            for m in ms:
                buf += line[last:m.start()]
                if in_url(line, m.start(), m.end()):
                    buf += line[m.start():m.end()]
                else:
                    buf += rgx.sub(replacement, line[m.start():m.end()])
                    applied += 1
                last = m.end()
            buf += line[last:]
            out.append(buf)
        new = ''.join(out)
        if applied:
            changes.append((pattern, replacement, applied))
    return new, changes


def atomic_write(path, content):
    """tempfile + os.replace로 원자적 쓰기"""
    fd, tmp = tempfile.mkstemp(prefix='.p0_', suffix='.tmp', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def process_file(path, apply_changes):
    try:
        original = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        return {'path': path, 'error': 'encoding'}

    new1, kc = apply_korean(original)
    new2, ec = apply_english(new1)

    if new2 == original:
        return {'path': path, 'changed': False, 'kor': [], 'eng': []}

    # 안전 체크: 50% 이상 줄어들면 의심
    if len(new2) < len(original) * 0.5:
        return {'path': path, 'error': 'suspicious_shrink',
                'old_size': len(original), 'new_size': len(new2)}

    if apply_changes:
        atomic_write(path, new2)
        # write-back 검증
        verify = path.read_text(encoding='utf-8')
        if verify != new2:
            return {'path': path, 'error': 'verify_failed'}

    return {'path': path, 'changed': True, 'kor': kc, 'eng': ec,
            'old_size': len(original), 'new_size': len(new2)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--files', nargs='+')
    ap.add_argument('--summary-only', action='store_true')
    args = ap.parse_args()

    files = collect_files(args.files)
    print(f'대상 파일: {len(files)}개\n')

    changed = []
    errors = []
    total_kor = 0
    total_eng = 0

    for f in files:
        r = process_file(f, args.apply)
        if r.get('error'):
            errors.append((f, r.get('error'), r.get('old_size'), r.get('new_size')))
            continue
        if r.get('changed'):
            changed.append(r)
            total_kor += sum(c[2] for c in r['kor'])
            total_eng += sum(c[2] for c in r['eng'])

    print('=' * 60)
    if args.summary_only:
        for r in changed:
            kc = sum(c[2] for c in r['kor'])
            ec = sum(c[2] for c in r['eng'])
            rel = r['path'].relative_to(ROOT)
            print(f'  {rel}  (ko {kc} / en {ec})')
    else:
        for r in changed:
            rel = r['path'].relative_to(ROOT)
            print(f'\n[FILE] {rel}')
            for old, new, n in r['kor']:
                print(f'   ko: "{old}" -> "{new}"  ({n})')
            for old, new, n in r['eng']:
                print(f'   en: {old} -> "{new}"  ({n})')

    print('\n' + '=' * 60)
    print(f'변경 파일: {len(changed)}')
    print(f'한글 치환: {total_kor}')
    print(f'영문 치환: {total_eng}')

    if errors:
        print(f'\n[ERROR] {len(errors)}개 파일 스킵:')
        for f, err, oldsz, newsz in errors:
            sz = f' ({oldsz}->{newsz})' if oldsz else ''
            print(f'  [{err}] {f.relative_to(ROOT)}{sz}')

    if not args.apply:
        print('\n>> dry-run. --apply 추가하면 실제 적용.')


if __name__ == '__main__':
    main()
