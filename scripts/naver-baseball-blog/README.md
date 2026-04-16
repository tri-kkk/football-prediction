# 야구 블로그 자동화 (네이버 블로그)

Supabase DB의 야구 경기 데이터를 Claude API로 분석하여 네이버 블로그에 자동 발행하는 스크립트.

## 구조

```
naver-baseball-blog/
├── index.js            # 메인 실행 스크립트
├── config.js           # 설정 (환경변수 로드)
├── data-collector.js   # Supabase에서 야구 데이터 수집
├── blog-generator.js   # Claude API로 블로그 HTML 생성
├── naver-publisher.js  # 네이버 블로그 API 발행
├── output/             # 생성된 HTML 백업
└── README.md
```

## 사용법

```bash
# 내일 경기 전체 자동화 (네이버 발행 포함)
node index.js

# 경기 목록만 확인
node index.js --list-only

# 특정 날짜
node index.js --date 2026-04-17

# 특정 리그만
node index.js --league KBO
node index.js --league MLB

# 미리보기 (발행 없이 HTML만 생성)
node index.js --preview

# 1경기만 테스트
node index.js --test

# 특정 경기만
node index.js --match-id 12345
```

## 네이버 블로그 API 설정

### 1단계: 네이버 개발자센터 앱 등록
1. https://developers.naver.com/apps/#/register 접속
2. 애플리케이션 등록:
   - 사용 API: **블로그**
   - 환경: **WEB**
   - 서비스 URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/callback`
3. Client ID와 Client Secret 복사

### 2단계: .env.local에 키 추가
```
NAVER_BLOG_CLIENT_ID=발급받은_Client_ID
NAVER_BLOG_CLIENT_SECRET=발급받은_Client_Secret
```

### 3단계: OAuth 토큰 발급
```bash
# 인증 URL 확인
node index.js --auth-url

# 브라우저에서 URL 접속 → 로그인 → 리다이렉트된 URL에서 code= 파라미터 복사

# 토큰 발급
node index.js --get-token [복사한코드]
```

### 4단계: .env.local에 토큰 추가
```
NAVER_BLOG_ACCESS_TOKEN=발급받은_Access_Token
NAVER_BLOG_REFRESH_TOKEN=발급받은_Refresh_Token
```

## 환경변수 전체 목록

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | O | Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | O | Supabase Service Key |
| `ANTHROPIC_API_KEY` | O | Claude API Key |
| `NAVER_BLOG_CLIENT_ID` | 발행시 | 네이버 Client ID |
| `NAVER_BLOG_CLIENT_SECRET` | 발행시 | 네이버 Client Secret |
| `NAVER_BLOG_ACCESS_TOKEN` | 발행시 | 네이버 OAuth Token |
