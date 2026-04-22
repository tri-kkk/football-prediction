"""
TheSportsDB에서 경기 VS 카드 썸네일 URL 가져오기
- searchevents.php로 경기 검색 → strThumb URL 반환
- 다운로드 없이 URL만 반환 (HTML img 태그로 삽입)
"""
import requests

SPORTSDB_API = "https://www.thesportsdb.com/api/v1/json/3"


def search_event_thumb(home_team: str, away_team: str, match_date: str = "") -> str | None:
    """
    TheSportsDB에서 경기 검색 후 VS 카드 썸네일 URL 반환
    Args:
        home_team: 영어 홈팀명 (e.g. "Boston Red Sox")
        away_team: 영어 어웨이팀명 (e.g. "Detroit Tigers")
        match_date: 경기 날짜 YYYY-MM-DD (매칭용)
    Returns:
        썸네일 이미지 URL 또는 None
    """
    if not home_team or not away_team:
        return None

    event_name = f"{home_team} vs {away_team}"
    try:
        resp = requests.get(
            f"{SPORTSDB_API}/searchevents.php",
            params={"e": event_name},
            timeout=15
        )
        resp.raise_for_status()
        data = resp.json()
        events = data.get("event")
        if not events:
            return None

        # 날짜 매칭 우선, 없으면 첫 번째 썸네일 있는 이벤트
        best = None
        for ev in events:
            thumb = ev.get("strThumb")
            if not thumb:
                continue
            if match_date and ev.get("dateEvent") == match_date:
                return thumb  # 정확한 날짜 매칭
            if not best:
                best = thumb

        return best

    except Exception as e:
        print(f"    ⚠️ TheSportsDB 검색 실패: {e}")
        return None


def fetch_thumbnail_url(match_info: dict) -> str | None:
    """
    경기 정보로 VS 카드 썸네일 URL 가져오기
    Args:
        match_info: {"home_team": "...", "away_team": "...", "date": "..."}
    Returns:
        이미지 URL 또는 None
    """
    home = match_info.get("home_team", "")
    away = match_info.get("away_team", "")
    date = match_info.get("date", "")

    if not home or not away:
        print(f"    ⚠️ 영어 팀명 없음 — 썸네일 스킵")
        return None

    # 검색
    thumb_url = search_event_thumb(home, away, date)
    if not thumb_url:
        # 홈/어웨이 반대로도 시도
        thumb_url = search_event_thumb(away, home, date)

    if thumb_url:
        print(f"    🎴 VS 카드: {home} vs {away}")
    else:
        print(f"    ⚠️ VS 카드 못 찾음: {home} vs {away}")

    return thumb_url


if __name__ == "__main__":
    test = {
        "home_team": "Boston Red Sox",
        "away_team": "Detroit Tigers",
        "date": "2026-04-20",
    }
    url = fetch_thumbnail_url(test)
    print(f"\n결과: {url}")
