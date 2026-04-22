"""
경기 선택 로직
- KBO: 당일 2경기
- NPB: 당일 2경기
- MLB: 내일 3경기 (새벽/오전 분류)
- CPBL: 제외
- 투수 미정 경기: 제외
"""
import requests
from datetime import datetime, timedelta
from config import BLOG_GENERATE_API, KBO_COUNT, NPB_COUNT, MLB_COUNT, MLB_DAWN_CUTOFF


def get_kst_today():
    """KST 기준 오늘 날짜"""
    utc_now = datetime.utcnow()
    kst_now = utc_now + timedelta(hours=9)
    return kst_now.strftime("%Y-%m-%d")


def get_kst_tomorrow():
    """KST 기준 내일 날짜"""
    utc_now = datetime.utcnow()
    kst_tomorrow = utc_now + timedelta(hours=9, days=1)
    return kst_tomorrow.strftime("%Y-%m-%d")


def fetch_matches(date: str) -> dict:
    """API에서 경기 목록 조회"""
    try:
        resp = requests.get(BLOG_GENERATE_API, params={"date": date}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("success"):
            return data["data"]
        print(f"  [ERROR] API 응답 실패: {data.get('error')}")
        return {}
    except Exception as e:
        print(f"  [ERROR] 경기 목록 조회 실패: {e}")
        return {}


def has_pitcher(match: dict) -> bool:
    """투수 정보가 있는 경기인지 확인 (미정 제외)"""
    pitcher_display = match.get("pitcher_display", "")
    # "미정 vs 미정" 또는 한쪽이라도 미정이면 제외
    if "미정" in pitcher_display:
        return False
    # 투수 이름이 실제로 있는지 확인
    home_pitcher = match.get("home_pitcher_ko") or match.get("home_pitcher")
    away_pitcher = match.get("away_pitcher_ko") or match.get("away_pitcher")
    return bool(home_pitcher and away_pitcher)


def classify_mlb_time(match: dict) -> str:
    """MLB 경기 시간대 분류 (KST 기준)"""
    match_time = match.get("match_time", "")
    if not match_time:
        return "오전"

    try:
        hour_min = match_time[:5]  # "07:00" 형식
        cutoff = MLB_DAWN_CUTOFF
        if hour_min < cutoff:
            return "새벽"
        return "오전"
    except:
        return "오전"


def select_matches() -> tuple:
    """
    블로그 작성할 경기 선택
    Returns: (matches_list, saved_blogs_dict)
    """
    today = get_kst_today()
    tomorrow = get_kst_tomorrow()

    print(f"\n📅 KBO/NPB 날짜: {today} (당일)")
    print(f"📅 MLB 날짜: {tomorrow} (내일)")

    # KBO/NPB: 당일 경기 조회
    today_data = fetch_matches(today)
    today_grouped = today_data.get("grouped", {})

    # MLB: 내일 경기 조회
    tomorrow_data = fetch_matches(tomorrow)
    tomorrow_grouped = tomorrow_data.get("grouped", {})

    # 이미 생성된 블로그 확인
    today_saved = today_data.get("savedBlogs", {})
    tomorrow_saved = tomorrow_data.get("savedBlogs", {})
    all_saved = {**today_saved, **tomorrow_saved}

    selected = []

    # ── KBO: 당일 2경기 ──
    kbo_matches = today_grouped.get("KBO", [])
    kbo_with_pitcher = [m for m in kbo_matches if has_pitcher(m)]
    kbo_selected = kbo_with_pitcher[:KBO_COUNT]
    for m in kbo_selected:
        selected.append({
            "match_id": m["match_id"],
            "league": "KBO",
            "display_name": m["display_name"],
            "home_team": m.get("home_team", ""),
            "away_team": m.get("away_team", ""),
            "match_time": m.get("match_time", ""),
            "time_category": None,
            "date": today,
            "already_saved": m["match_id"] in today_saved,
        })
    print(f"  ⚾ KBO: {len(kbo_with_pitcher)}경기 중 {len(kbo_selected)}개 선택 (투수 미정 {len(kbo_matches) - len(kbo_with_pitcher)}개 제외)")

    # ── NPB: 당일 2경기 ──
    npb_matches = today_grouped.get("NPB", [])
    npb_with_pitcher = [m for m in npb_matches if has_pitcher(m)]
    npb_selected = npb_with_pitcher[:NPB_COUNT]
    for m in npb_selected:
        selected.append({
            "match_id": m["match_id"],
            "league": "NPB",
            "display_name": m["display_name"],
            "home_team": m.get("home_team", ""),
            "away_team": m.get("away_team", ""),
            "match_time": m.get("match_time", ""),
            "time_category": None,
            "date": today,
            "already_saved": m["match_id"] in today_saved,
        })
    print(f"  ⚾ NPB: {len(npb_with_pitcher)}경기 중 {len(npb_selected)}개 선택 (투수 미정 {len(npb_matches) - len(npb_with_pitcher)}개 제외)")

    # ── MLB: 내일 3경기 (새벽/오전 분류) ──
    mlb_matches = tomorrow_grouped.get("MLB", [])
    mlb_with_pitcher = [m for m in mlb_matches if has_pitcher(m)]

    # 시간대별 분류
    dawn_games = [m for m in mlb_with_pitcher if classify_mlb_time(m) == "새벽"]
    morning_games = [m for m in mlb_with_pitcher if classify_mlb_time(m) == "오전"]

    # 새벽/오전 골고루 선택 (새벽 1~2개, 오전 1~2개)
    mlb_selected = []
    if dawn_games and morning_games:
        # 둘 다 있으면 새벽 1 + 오전 2 또는 새벽 2 + 오전 1
        dawn_pick = min(len(dawn_games), max(1, MLB_COUNT - min(len(morning_games), 2)))
        morning_pick = MLB_COUNT - dawn_pick
        mlb_selected = dawn_games[:dawn_pick] + morning_games[:morning_pick]
    elif dawn_games:
        mlb_selected = dawn_games[:MLB_COUNT]
    elif morning_games:
        mlb_selected = morning_games[:MLB_COUNT]

    for m in mlb_selected:
        time_cat = classify_mlb_time(m)
        selected.append({
            "match_id": m["match_id"],
            "league": "MLB",
            "display_name": m["display_name"],
            "home_team": m.get("home_team", ""),
            "away_team": m.get("away_team", ""),
            "match_time": m.get("match_time", ""),
            "time_category": time_cat,
            "date": tomorrow,
            "already_saved": m["match_id"] in tomorrow_saved,
        })
    print(f"  ⚾ MLB: {len(mlb_with_pitcher)}경기 중 {len(mlb_selected)}개 선택 (새벽 {len(dawn_games)}개, 오전 {len(morning_games)}개)")

    print(f"\n✅ 총 {len(selected)}개 경기 선택됨")
    return selected, all_saved


if __name__ == "__main__":
    matches, saved = select_matches()
    for m in matches:
        tag = f"[{m['time_category']}]" if m['time_category'] else ""
        saved = " (이미 생성됨)" if m['already_saved'] else ""
        print(f"  {m['league']} {tag} {m['display_name']} ({m['match_time'][:5]}){saved}")
