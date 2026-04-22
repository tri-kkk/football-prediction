"""설정 관리"""
import os
from dotenv import load_dotenv

load_dotenv(override=True)

# 네이버 계정
NAVER_ID = os.getenv("NAVER_ID", "")
NAVER_PW = os.getenv("NAVER_PW", "")
NAVER_BLOG_ID = os.getenv("NAVER_BLOG_ID", "playbypick")

# TrendSoccer API
SITE_URL = os.getenv("SITE_URL", "https://www.trendsoccer.com")
BLOG_GENERATE_API = f"{SITE_URL}/api/admin/blog/baseball-generate"

# 경기 선택
KBO_COUNT = int(os.getenv("KBO_COUNT", "2"))
NPB_COUNT = int(os.getenv("NPB_COUNT", "2"))
MLB_COUNT = int(os.getenv("MLB_COUNT", "3"))

# MLB 시간대 분류 (KST 기준)
MLB_DAWN_CUTOFF = os.getenv("MLB_DAWN_CUTOFF", "07:00")  # 이전 = 새벽, 이후 = 오전

# 스케줄
SCHEDULE_TIME = os.getenv("SCHEDULE_TIME", "11:30")

# 쿠키 저장 경로
COOKIE_FILE = os.path.join(os.path.dirname(__file__), "naver_cookies.pkl")

# Chrome 프로필 경로
CHROME_PROFILE_DIR = os.path.join(os.path.dirname(__file__), "chrome_profile")

# 네이버 블로그 카테고리 (리그별)
# 카테고리 이름은 네이버 블로그 발행 설정에 표시되는 텍스트와 정확히 일치해야 함
CATEGORY_MAP = {
    "KBO": "KBO 예측",
    "NPB": "NPB 예측",
    "MLB": "MLB 예측",
}
