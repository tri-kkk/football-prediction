"""
블로그 콘텐츠 생성 (TrendSoccer API 호출)
"""
import requests
import time
import random
from config import BLOG_GENERATE_API


def generate_blog(match_id: str) -> dict | None:
    """
    블로그 생성 API 호출
    Returns: { title, htmlContent, tags, excerpt } or None
    """
    try:
        resp = requests.post(
            BLOG_GENERATE_API,
            json={"match_id": match_id},
            timeout=120,  # Claude API 호출이라 오래 걸릴 수 있음
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get("success"):
            return data["data"]
        else:
            print(f"    [ERROR] 생성 실패: {data.get('error')}")
            return None
    except Exception as e:
        print(f"    [ERROR] API 호출 실패: {e}")
        return None


def generate_all(matches: list) -> list:
    """
    선택된 경기들 블로그 생성
    Returns: [{ match_info, blog: { title, htmlContent, tags, excerpt } }]
    """
    results = []

    for i, match in enumerate(matches):
        tag = f"[{match['time_category']}]" if match.get('time_category') else ""
        print(f"\n  [{i+1}/{len(matches)}] {match['league']} {tag} {match['display_name']}")

        if match.get("already_saved"):
            print(f"    ⏭️ 이미 생성된 블로그 있음 — 스킵")
            # 이미 생성된 건 API에서 savedBlogs로 가져올 수 있지만,
            # 여기서는 재생성 없이 스킵
            continue

        print(f"    🤖 Claude API로 블로그 생성 중...")
        blog = generate_blog(match["match_id"])

        if blog:
            results.append({
                "match_info": match,
                "blog": blog,
            })
            print(f"    ✅ 생성 완료: {blog['title']}")
        else:
            print(f"    ❌ 생성 실패")

        # API 부하 방지 — 랜덤 딜레이
        if i < len(matches) - 1:
            delay = random.uniform(3, 6)
            print(f"    ⏳ {delay:.1f}초 대기...")
            time.sleep(delay)

    print(f"\n📝 블로그 생성 완료: {len(results)}/{len(matches)}개")
    return results
