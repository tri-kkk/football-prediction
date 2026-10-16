// Tap Champs (모바일 게임) 개인정보처리방침
// 플레이 스토어 · 애드몹 동의 메시지 · Google OAuth 동의 화면에 등록하는 공개 URL
//   ko: https://www.trendsoccer.com/apps/tapchamps/privacy
//   en: https://www.trendsoccer.com/en/apps/tapchamps/privacy

const EFFECTIVE = '2026-10-17'
const EMAIL = 'trikilab2025@gmail.com'

export default async function TapChampsPrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isKo = locale === 'ko'

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <p className="text-emerald-400 font-semibold mb-2">Tap Champs</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {isKo ? '개인정보 처리방침' : 'Privacy Policy'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isKo ? `시행일: ${EFFECTIVE}` : `Effective date: ${EFFECTIVE}`}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            <a href="/apps/tapchamps/privacy" className="hover:text-gray-300">한국어</a>
            {'  ·  '}
            <a href="/en/apps/tapchamps/privacy" className="hover:text-gray-300">English</a>
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          {isKo ? <Ko /> : <En />}
        </div>
      </div>
    </div>
  )
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">{children}</div>
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-semibold mb-3 text-emerald-400">{children}</h3>
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">{children}</ul>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-300 mb-2">{children}</p>
}

const link = 'text-emerald-400 hover:text-blue-300'

/* ───────────────────────── 한국어 ───────────────────────── */
function Ko() {
  return (
    <Box>
      <section>
        <P>
          (주)트리기(이하 「회사」, 개발자명 Tri-Ki)는 모바일 게임 <strong>Tap Champs</strong>(이하 「앱」)를 이용하는
          분의 정보를 소중히 다루며, 「개인정보 보호법」 등 관련 법령을 지킵니다. 이 방침은 앱에만 적용되며,
          트렌드사커 웹사이트의 처리방침은 <a href="/privacy" className={link}>별도 페이지</a>에서 확인할 수 있습니다.
        </P>
        <P>
          앱은 회원가입이 없으며 이름, 이메일, 전화번호, 연락처, 정밀 위치(GPS) 정보를 수집하지 않습니다.
        </P>
      </section>

      <section>
        <H>1. 처리하는 정보와 목적</H>
        <Ul>
          <li>
            <strong>게임 기록 (기기 + 클라우드 저장)</strong> — 게임별 최고 기록, 플레이 횟수, 하트 수, 트로피 보상·옷, 설정(언어·소리), 결제 처리 기록(중복 지급 방지용 결제 토큰).
            기기 안에 암호화해 저장하며, Google Play 게임즈에 로그인한 경우 같은 내용을 Google Play 게임즈 「저장된 게임」(이용자 본인의 Google 계정 저장공간)에 백업해
            앱을 다시 설치하거나 기기를 바꿔도 이어서 할 수 있게 합니다. 백업은 Google 계정 설정에서 앱 데이터를 삭제하여 지울 수 있습니다.
          </li>
          <li>
            <strong>나라 대항전 기록 (서버에 저장)</strong> — 앱이 자동으로 만드는 익명 식별값, 국가 코드, 트로피 수, 게임별 최고 기록.
            국가 코드는 기기의 언어·지역 설정에서 정하거나 이용자가 직접 고르며, 위치 정보를 사용하지 않습니다.
            목적: 나라별 순위 계산과 표시. 익명 식별값만으로는 이용자 개인을 알아볼 수 없습니다.
          </li>
          <li>
            <strong>Google Play 게임즈 정보</strong> — Google Play 게임즈에 로그인한 경우 플레이어 ID, 닉네임, 프로필 이미지, 리더보드 점수.
            목적: 게임별 세계 순위(리더보드). 이 정보는 Google이 처리하며 회사는 별도로 저장하지 않습니다.
          </li>
          <li>
            <strong>광고 관련 정보</strong> — 광고식별자(ADID), IP 주소, 기기 모델·OS 버전, 광고 노출·클릭 기록, 진단 정보.
            목적: 보상형 광고(하트 받기·이어하기) 게재, 광고 성과 측정, 부정 이용 방지.
          </li>
          <li>
            <strong>앱 이용 기록과 오류 정보</strong> — 앱 인스턴스 ID, 기기 모델·OS 버전, 언어·국가 설정, 게임 시작·종료·점수·단계,
            화면 이용(상점·랭킹 열기 등), 광고 시청 여부, 앱 비정상 종료 기록과 오류 내용.
            목적: 게임 난이도·화면 개선, 서비스 안정성 확보(오류 수정). 이름·연락처는 수집하지 않습니다.
          </li>
        </Ul>
      </section>

      <section>
        <H>2. 처리위탁 및 국외 이전</H>
        <P>앱은 아래 사업자의 서비스를 사용하며, 정보는 앱 이용 시점에 암호화된 네트워크(TLS)로 전송됩니다.</P>
        <Ul>
          <li>
            <strong>Google LLC (Firebase Authentication, Cloud Firestore)</strong> — 이전국가: 싱가포르(서버 위치) /
            항목: 익명 식별값, 국가 코드, 트로피 수, 게임별 최고 기록 / 목적: 나라 대항전 순위 /
            보유 기간: 서비스 종료 또는 삭제 요청 시까지
          </li>
          <li>
            <strong>Google LLC (Google Play 게임즈 서비스)</strong> — 이전국가: 미국 / 항목: 플레이어 ID, 닉네임, 리더보드 점수 /
            목적: 로그인, 리더보드 / 보유 기간: Google 정책에 따름
          </li>
          <li>
            <strong>Google LLC (AdMob, 사용자 메시지 플랫폼)</strong> — 이전국가: 미국 / 항목: 광고식별자, IP 주소, 기기 정보,
            광고 이용 기록 / 목적: 광고 게재·측정, 동의 관리 / 보유 기간: Google 정책에 따름
          </li>
          <li>
            <strong>Google LLC (Firebase Analytics, Firebase Crashlytics)</strong> — 이전국가: 미국 / 항목: 앱 인스턴스 ID, 기기 정보,
            앱 이용 기록, 오류·비정상 종료 기록 / 목적: 이용 통계, 오류 분석 / 보유 기간: 이용 기록 최대 14개월, 오류 기록 90일
          </li>
        </Ul>
        <P>
          Google의 개인정보 처리방침:{' '}
          <a href="https://policies.google.com/privacy" className={link}>https://policies.google.com/privacy</a>
          {' '}/ 광고 파트너가 데이터를 사용하는 방법:{' '}
          <a href="https://policies.google.com/technologies/partner-sites" className={link}>
            https://policies.google.com/technologies/partner-sites
          </a>
        </P>
        <P>
          국외 이전을 원하지 않으면 앱 이용을 중단하고 앱을 삭제할 수 있습니다. 광고 목적의 이전은 아래 3번의 방법으로 줄일 수 있으며,
          이 경우에도 게임은 이용할 수 있습니다.
        </P>
      </section>

      <section>
        <H>3. 광고와 이용자의 선택</H>
        <Ul>
          <li>앱은 이용자가 직접 고른 경우에만 보상형 광고를 보여줍니다(하트 받기, 이어하기).</li>
          <li>유럽경제지역(EEA)·영국·스위스 등에서는 처음 실행할 때 광고 동의 창이 표시되며, 앱 설정의 「광고 개인정보 설정」에서 언제든 바꿀 수 있습니다.</li>
          <li>Android 기기의 「설정 → Google → 모든 서비스 → 광고」에서 광고 ID를 삭제하거나 재설정할 수 있습니다. 메뉴 이름은 기기에 따라 다를 수 있습니다. 광고 ID를 삭제하면 맞춤형 광고가 중지되고, 일반 광고는 계속 표시될 수 있습니다.</li>
        </Ul>
      </section>

      <section>
        <H>4. 보관 기간과 파기</H>
        <Ul>
          <li>기기에 저장된 정보: 앱을 삭제하거나 앱 데이터를 지우면 즉시 삭제됩니다.</li>
          <li>나라 대항전 기록: 서비스 종료 시 또는 삭제 요청을 받은 날로부터 30일 안에 삭제합니다. 나라별 합계는 개인을 알아볼 수 없는 통계로 남을 수 있습니다.</li>
        </Ul>
      </section>

      <section>
        <H>5. 이용자의 권리와 삭제 요청</H>
        <P>
          이용자는 자신의 정보에 대한 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. 앱은 계정이 없으므로 삭제를 원하시면
          {' '}<a href={`mailto:${EMAIL}`} className={link}>{EMAIL}</a>로 「Tap Champs 기록 삭제」를 요청해 주세요.
          확인을 위해 앱의 나라와 게임 기록을 함께 알려주시면 빠르게 처리할 수 있습니다.
          Google Play 게임즈 정보는 Google 계정 설정에서 관리하거나 삭제할 수 있습니다.
        </P>
      </section>

      <section>
        <H>6. 아동의 개인정보</H>
        <P>
          앱은 만 14세 미만 아동을 주 이용 대상으로 하지 않으며, 아동의 개인정보를 알고서 수집하지 않습니다.
          아동의 정보가 수집된 사실을 알게 되면 지체 없이 삭제합니다.
        </P>
      </section>

      <section>
        <H>7. 안전성 확보 조치</H>
        <P>
          서버와 주고받는 정보는 암호화된 연결(TLS)로 전송하며, 서버의 기록은 이용자 본인의 익명 식별값으로만 쓸 수 있도록
          접근 규칙을 적용하고 있습니다.
        </P>
      </section>

      <section>
        <H>8. 개인정보 보호책임자</H>
        <P>성명: 김기탁 (대표자) / 이메일: <a href={`mailto:${EMAIL}`} className={link}>{EMAIL}</a></P>
        <P>회사: (주)트리기 / 서울특별시 영등포구 국제금융로6길 33</P>
        <P>
          개인정보 침해에 대한 신고·상담은 개인정보침해신고센터(privacy.kisa.or.kr, 국번없이 118),
          개인정보분쟁조정위원회(www.kopico.go.kr, 1833-6972)에 문의할 수 있습니다.
        </P>
      </section>

      <section>
        <H>9. 방침의 변경</H>
        <P>이 방침이 바뀌면 이 페이지에 시행일과 함께 알립니다. 현재 방침 시행일: {EFFECTIVE}</P>
      </section>
    </Box>
  )
}

/* ───────────────────────── English ───────────────────────── */
function En() {
  return (
    <Box>
      <section>
        <P>
          Tri-Ki Co., Ltd. (&quot;we&quot;, developer name &quot;Tri-Ki&quot;) respects the privacy of everyone who plays the mobile game{' '}
          <strong>Tap Champs</strong> (the &quot;App&quot;). This policy applies only to the App. The privacy policy of the TrendSoccer
          website is available <a href="/en/privacy" className={link}>on a separate page</a>.
        </P>
        <P>
          The App has no sign-up. We do not collect your name, email address, phone number, contacts, or precise (GPS) location.
        </P>
      </section>

      <section>
        <H>1. Information we process and why</H>
        <Ul>
          <li>
            <strong>Game data (on your device and in your cloud save)</strong> — best score and play count for each game, hearts, trophy rewards and outfits,
            settings (language, sound) and purchase processing records (purchase tokens used to prevent double delivery). It is stored encrypted on
            your device and, if you are signed in to Google Play Games, backed up to Google Play Games “Saved Games” (storage in your own Google
            Account) so you can continue after reinstalling or changing devices. You can delete the backup by removing the app’s data in your Google
            Account settings.
          </li>
          <li>
            <strong>Country Battle data (stored on our server)</strong> — an anonymous ID created automatically by the App, a country code,
            your trophy count and best score for each game. The country code comes from your device&apos;s language/region setting or your own
            choice; no location data is used. Purpose: calculating and showing country rankings. The anonymous ID alone does not identify you.
          </li>
          <li>
            <strong>Google Play Games data</strong> — if you are signed in to Google Play Games: player ID, nickname, profile image and leaderboard
            scores. Purpose: per-game global leaderboards. This data is processed by Google; we do not store it separately.
          </li>
          <li>
            <strong>Advertising data</strong> — advertising ID, IP address, device model and OS version, ad impressions and clicks, diagnostics.
            Purpose: showing rewarded ads (extra hearts, continue), measuring ad performance, preventing fraud.
          </li>
          <li>
            <strong>App usage and error data</strong> — app instance ID, device model and OS version, language and country settings, game starts,
            ends, scores and stages, screen usage (e.g. opening the shop or rankings), whether ads were watched, crash logs and error details.
            Purpose: improving game difficulty and screens, keeping the App stable (fixing errors). We do not collect your name or contact details.
          </li>
        </Ul>
      </section>

      <section>
        <H>2. Service providers and international transfers</H>
        <P>The App uses the services below. Data is sent over an encrypted connection (TLS) when you use the App.</P>
        <Ul>
          <li>
            <strong>Google LLC (Firebase Authentication, Cloud Firestore)</strong> — Server location: Singapore / Data: anonymous ID, country code,
            trophy count, best scores / Purpose: Country Battle rankings / Retention: until the service ends or you ask us to delete it
          </li>
          <li>
            <strong>Google LLC (Google Play Games Services)</strong> — Country: United States / Data: player ID, nickname, leaderboard scores /
            Purpose: sign-in and leaderboards / Retention: according to Google&apos;s policy
          </li>
          <li>
            <strong>Google LLC (AdMob, User Messaging Platform)</strong> — Country: United States / Data: advertising ID, IP address, device
            information, ad interaction data / Purpose: serving and measuring ads, consent management / Retention: according to Google&apos;s policy
          </li>
          <li>
            <strong>Google LLC (Firebase Analytics, Firebase Crashlytics)</strong> — Country: United States / Data: app instance ID, device
            information, app usage, error and crash logs / Purpose: usage statistics, error analysis / Retention: usage data up to 14 months, crash data 90 days
          </li>
        </Ul>
        <P>
          Google Privacy Policy: <a href="https://policies.google.com/privacy" className={link}>https://policies.google.com/privacy</a>
          {' '}/ How Google uses data from partner apps:{' '}
          <a href="https://policies.google.com/technologies/partner-sites" className={link}>
            https://policies.google.com/technologies/partner-sites
          </a>
        </P>
      </section>

      <section>
        <H>3. Ads and your choices</H>
        <Ul>
          <li>The App shows rewarded ads only when you choose to watch one (extra hearts, continue).</li>
          <li>In the EEA, the UK and Switzerland, a consent form is shown on first launch. You can change your choice at any time under &quot;Ad privacy settings&quot; in the App&apos;s settings.</li>
          <li>On Android, you can delete or reset your advertising ID in Settings → Google → All services → Ads (menu names may vary by device). Personalized ads stop when the ID is deleted; non-personalized ads may still appear.</li>
        </Ul>
      </section>

      <section>
        <H>4. Retention and deletion</H>
        <Ul>
          <li>Data on your device is deleted immediately when you uninstall the App or clear its data.</li>
          <li>Country Battle data is deleted when the service ends, or within 30 days of a deletion request. Country totals may remain as statistics that cannot identify anyone.</li>
        </Ul>
      </section>

      <section>
        <H>5. Your rights and deletion requests</H>
        <P>
          Depending on where you live, you may have the right to access, correct or delete your data, or to object to or restrict its
          processing. Because the App has no accounts, please email <a href={`mailto:${EMAIL}`} className={link}>{EMAIL}</a> with
          &quot;Delete my Tap Champs data&quot;. Telling us your country and game scores in the App helps us find your record. You can manage or
          delete your Google Play Games data in your Google Account settings.
        </P>
      </section>

      <section>
        <H>6. Children</H>
        <P>
          The App is not directed at children under 13 (or the minimum age in your country), and we do not knowingly collect their personal
          information. If we learn that we have collected such information, we will delete it promptly.
        </P>
      </section>

      <section>
        <H>7. Security</H>
        <P>
          Data sent to our server uses an encrypted connection (TLS), and server access rules allow each record to be written only with its
          own anonymous ID.
        </P>
      </section>

      <section>
        <H>8. Contact</H>
        <P>Privacy officer: Kim Gi-tak (Representative) / Email: <a href={`mailto:${EMAIL}`} className={link}>{EMAIL}</a></P>
        <P>Tri-Ki Co., Ltd., 33 Gukjegeumyung-ro 6-gil, Yeongdeungpo-gu, Seoul, Republic of Korea</P>
      </section>

      <section>
        <H>9. Changes</H>
        <P>We will post any changes on this page with a new effective date. Current effective date: {EFFECTIVE}</P>
      </section>
    </Box>
  )
}
