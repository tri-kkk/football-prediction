#!/usr/bin/env python3
"""
네이버 야구 블로그 자동 포스팅
=================================
1. 경기 선택 (KBO 2, NPB 2, MLB 3 / 투수 미정 제외)
2. Claude API로 블로그 콘텐츠 생성
3. 네이버 블로그에 자동 발행

사용법:
  python main.py                  # 즉시 실행
  python main.py --schedule       # 매일 스케줄 실행
  python main.py --login          # 네이버 로그인만 (최초 1회)
  python main.py --dry-run        # 생성만 하고 발행 안함
  python main.py --list-only      # 경기 목록만 확인
"""
import argparse
import time
import random
import sys
from datetime import datetime

from match_selector import select_matches
from blog_generator import generate_all
from naver_poster import NaverBlogPoster
from thumbnail_fetcher import fetch_thumbnail_url
from config import SCHEDULE_TIME


def get_kst_now():
    """KST 현재 시간"""
    from datetime import timedelta
    return datetime.utcnow() + timedelta(hours=9)


def run_pipeline(dry_run=False, headless=False):
    """메인 파이프라인: 경기 선택 → 블로그 생성 → 네이버 발행"""
    kst_now = get_kst_now()
    print(f"\n{'='*60}")
    print(f"  ⚾ 네이버 야구 블로그 자동 포스팅")
    print(f"  📅 {kst_now.strftime('%Y-%m-%d %H:%M')} KST")
    print(f"{'='*60}")

    # 1. 경기 선택
    print("\n📋 [STEP 1] 경기 선택")
    matches, saved_blogs = select_matches()

    if not matches:
        print("\n⚠️ 포스팅할 경기가 없습니다. 종료합니다.")
        return

    # dry-run이면 목록만 보여주고 종료 (API 호출 안 함)
    if dry_run:
        print("\n🏁 [DRY RUN] 경기 목록 확인만 합니다 (블로그 생성 안 함).")
        for match in matches:
            tag = f"[{match['time_category']}]" if match.get('time_category') else ""
            saved = " ✅ 기존 블로그 있음" if match.get('already_saved') else " ⭕ 새로 생성 필요"
            print(f"  {match['league']} {tag} {match['display_name']} ({match['match_time'][:5]}){saved}")
        return

    # 2. 블로그 생성 (새 경기만) + 이미 생성된 블로그 합치기
    print("\n🤖 [STEP 2] 블로그 콘텐츠 준비")
    results = []

    for match in matches:
        mid = match["match_id"]
        if match.get("already_saved") and mid in saved_blogs:
            # 이미 생성된 블로그 사용
            blog = saved_blogs[mid]
            results.append({"match_info": match, "blog": blog})
            print(f"  ♻️ 기존 블로그 사용: {blog.get('title', mid)}")
        else:
            # 새로 생성
            tag = f"[{match['time_category']}]" if match.get('time_category') else ""
            print(f"  🤖 생성 중: {match['league']} {tag} {match['display_name']}")
            from blog_generator import generate_blog
            blog = generate_blog(mid)
            if blog:
                results.append({"match_info": match, "blog": blog})
                print(f"  ✅ 생성 완료: {blog['title']}")
            else:
                print(f"  ❌ 생성 실패: {match['display_name']}")

    if not results:
        print("\n⚠️ 발행할 블로그가 없습니다.")
        return

    # 3. 썸네일 URL 가져오기 (TheSportsDB VS 카드)
    print("\n🎴 [STEP 3] VS 카드 썸네일 준비")
    for result in results:
        match_info = result["match_info"]
        print(f"  🔍 {match_info['display_name']}")
        thumb_url = fetch_thumbnail_url(match_info)
        result["thumbnail_url"] = thumb_url or ""

    # 4. 네이버 발행
    print("\n🚀 [STEP 4] 네이버 블로그 발행")
    poster = NaverBlogPoster(headless=headless)

    try:
        if not poster.ensure_login():
            print("\n❌ 네이버 로그인 실패. 종료합니다.")
            return

        success_count = 0
        for i, result in enumerate(results):
            blog = result["blog"]
            match_info = result["match_info"]
            thumb_url = result.get("thumbnail_url", "")

            tag = f"[{match_info['time_category']}]" if match_info.get('time_category') else ""
            print(f"\n  [{i+1}/{len(results)}] {match_info['league']} {tag} 발행 중...")

            ok = poster.post_blog(
                title=blog["title"],
                html_content=blog["htmlContent"],
                tags=blog.get("tags", []),
                league=match_info.get("league", ""),
                thumbnail_url=thumb_url,
            )

            if ok:
                success_count += 1

            # 포스팅 간 랜덤 딜레이 (봇 탐지 방지)
            if i < len(results) - 1:
                delay = random.uniform(30, 60)
                print(f"    ⏳ 다음 포스팅까지 {delay:.0f}초 대기 (봇 탐지 방지)...")
                time.sleep(delay)

        print(f"\n{'='*60}")
        print(f"  ✅ 발행 완료: {success_count}/{len(results)}개")
        print(f"{'='*60}")

    finally:
        poster.close()


def run_schedule():
    """매일 지정 시간에 실행"""
    import schedule as sched

    print(f"\n⏰ 스케줄 모드 시작")
    print(f"   매일 {SCHEDULE_TIME} KST에 자동 실행됩니다.")
    print(f"   종료하려면 Ctrl+C\n")

    def job():
        try:
            run_pipeline(headless=True)
        except Exception as e:
            print(f"\n❌ 파이프라인 에러: {e}")

    sched.every().day.at(SCHEDULE_TIME).do(job)

    while True:
        sched.run_pending()
        time.sleep(30)


def main():
    parser = argparse.ArgumentParser(description="네이버 야구 블로그 자동 포스팅")
    parser.add_argument("--schedule", action="store_true", help="매일 스케줄 실행")
    parser.add_argument("--login", action="store_true", help="네이버 로그인만 (최초 1회)")
    parser.add_argument("--dry-run", action="store_true", help="생성만 하고 발행 안함")
    parser.add_argument("--list-only", action="store_true", help="경기 목록만 확인")
    parser.add_argument("--headless", action="store_true", help="브라우저 숨김 모드")
    args = parser.parse_args()

    if args.login:
        poster = NaverBlogPoster(headless=False)
        poster.login_manual()
        poster.close()
        return

    if args.list_only:
        matches = select_matches()
        if matches:
            print("\n📋 선택된 경기:")
            for m in matches:
                tag = f"[{m['time_category']}]" if m.get('time_category') else ""
                saved = " ✅" if m.get('already_saved') else ""
                print(f"  {m['league']} {tag} {m['display_name']} ({m['match_time'][:5]}){saved}")
        return

    if args.schedule:
        run_schedule()
    else:
        run_pipeline(dry_run=args.dry_run, headless=args.headless)


if __name__ == "__main__":
    main()
