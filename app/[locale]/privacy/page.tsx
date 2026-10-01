'use client'

import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'

// 버전 히스토리
const VERSIONS = [
  { id: 'v2.1', date: '2026-10-01', label_ko: '2026년 10월 1일 (현재)', label_en: 'October 1, 2026 (Current)' },
  { id: 'v2.0', date: '2026-02-06', label_ko: '2026년 2월 6일', label_en: 'February 6, 2026' },
  { id: 'v1.1', date: '2025-01-14', label_ko: '2025년 1월 14일', label_en: 'January 14, 2025' },
  { id: 'v1.0', date: '2025-11-06', label_ko: '2025년 11월 6일', label_en: 'November 6, 2025' },
]

export default function PrivacyPage() {
  const { language } = useLanguage()
  const isKo = language === 'ko'
  const [selectedVersion, setSelectedVersion] = useState('v2.1')

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {isKo ? '개인정보 처리방침' : 'Privacy Policy'}
          </h1>
          
          {/* 버전 선택 */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <label className="text-gray-400 text-sm">
              {isKo ? '버전:' : 'Version:'}
            </label>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {VERSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {isKo ? v.label_ko : v.label_en}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none">
          {selectedVersion === 'v2.1' ? (
            <PrivacyV2_1 isKo={isKo} />
          ) : selectedVersion === 'v2.0' ? (
            <PrivacyV2_0 isKo={isKo} />
          ) : selectedVersion === 'v1.1' ? (
            <PrivacyV1_1 isKo={isKo} />
          ) : (
            <PrivacyV1_0 isKo={isKo} />
          )}
        </div>

        {/* 홈으로 */}
        <div className="text-center mt-8">
          <a href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← {isKo ? '홈으로' : 'Back to Home'}
          </a>
        </div>
      </div>
    </div>
  )
}

// v2.1 - 2026년 10월 1일 (모바일 앱 조항 추가: 수집·국외이전·행태광고 / 10-01 Crashlytics 반영)
// 웹 방침(v2.0) 본문 + 모바일 앱(Android) 추가 조항을 함께 렌더한다.
function PrivacyV2_1({ isKo }: { isKo: boolean }) {
  return (
    <div className="space-y-8">
      <PrivacyV2_0 isKo={isKo} />

      {/* ───────── 모바일 앱(Android) 추가 조항 — 한국어 ───────── */}
      {isKo && (
      <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
        <div className="border-b border-gray-700 pb-4">
          <h2 className="text-2xl font-bold text-white">모바일 앱(Android) 서비스 추가 조항</h2>
          <p className="text-gray-400 text-sm mt-2">본 조항은 TrendSoccer 모바일 앱에 적용됩니다. (iOS 출시 시 동일 조항을 적용하고 iOS 항목을 보강합니다.) 시행일: 2026-10-01</p>
        </div>

        {/* 앱-1 */}
        <section>
          <h3 className="text-xl font-semibold mb-3 text-emerald-400">앱-1. 모바일 앱에서 수집하는 개인정보</h3>
          <p className="text-gray-300 mb-2">회사는 TrendSoccer 모바일 앱(이하 「앱」) 이용 과정에서 다음 정보를 수집합니다.</p>
          <p className="text-gray-300 font-semibold mt-3">1) 회원가입 및 로그인 시 (필수)</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li>Google 또는 네이버 계정 로그인: 이름, 이메일 주소, 로그인 서비스의 회원 식별값</li>
          </ul>
          <p className="text-gray-300 font-semibold mt-3">2) 앱 이용 과정에서 자동으로 수집되는 정보</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li>기기 정보: 광고식별자(ADID), 앱 인스턴스 식별값, 기기 모델, 운영체제 버전, 앱 버전</li>
            <li>앱 이용 기록: 화면 방문 및 기능 이용 기록, 경기 리포트 열람 기록, 가입 방식(Google·네이버)</li>
            <li>구매 기록: 구독 상품 정보, 결제 금액, 결제 통화</li>
            <li>접속 정보: IP 주소 및 이를 통해 추정되는 대략적인 위치(국가·도시 단위)</li>
            <li>앱 성능 정보: 앱 실행 시간, 비정상 종료율 등 진단 정보, 앱 비정상 종료 시의 오류 기록(비정상 종료 로그·오류 발생 위치·기기 모델·OS 버전·앱 설치 식별값)</li>
            <li>알림 수신용 토큰(푸시 알림 수신에 동의한 경우)</li>
          </ul>
          <p className="text-gray-400 text-sm mt-3">회사는 결제 수단 정보(카드 번호 등)를 수집하지 않습니다. 인앱 결제는 Google Play 결제 시스템에서 처리됩니다.</p>
        </section>

        {/* 앱-2 */}
        <section>
          <h3 className="text-xl font-semibold mb-3 text-emerald-400">앱-2. 개인정보 처리위탁 및 국외 이전</h3>
          <p className="text-gray-300 mb-3">회사는 앱 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하거나 국외로 이전합니다. 정보는 앱 이용 시점에 암호화된 네트워크(TLS)를 통해 전송됩니다.</p>
          <ul className="list-disc list-inside text-gray-300 space-y-3 ml-4">
            <li><strong>Google LLC (Firebase Analytics, Cloud Messaging, Remote Config)</strong> — 이전국가: 미국 / 이전항목: 앱 인스턴스 식별값, 기기 정보, 앱 이용 기록, 알림 토큰 / 목적: 서비스 이용 통계 분석, 푸시 알림 발송, 앱 설정 배포 / 보유·이용 기간: 회원 탈퇴 또는 위탁 계약 종료 시까지</li>
            <li><strong>Google LLC (Firebase Crashlytics)</strong> — 이전국가: 미국 / 이전항목: 비정상 종료 로그, 오류 발생 위치, 기기 모델, OS 버전, 앱 설치 식별값 / 목적: 앱 오류 분석 및 안정성 개선 / 보유·이용 기간: 수집일로부터 90일</li>
            <li><strong>Google LLC (AdMob)</strong> — 이전국가: 미국 / 이전항목: 광고식별자, IP 주소, 앱 이용 기록, 진단 정보 / 목적: 광고 게재, 광고 성과 측정, 부정 이용 방지 / 보유·이용 기간: 회원 탈퇴 또는 위탁 계약 종료 시까지</li>
            <li><strong>Google LLC (Google Play 결제, Google 로그인)</strong> — 이전국가: 미국 / 이전항목: 구매 기록, Google 계정 식별값 / 목적: 인앱 결제 처리, 로그인 인증 / 보유·이용 기간: 관련 법령에 따른 보존 기간까지</li>
            <li><strong>Meta Platforms, Inc.</strong> — 이전국가: 미국 / 이전항목: 광고식별자, 기기 정보, 앱 이용 기록(가입 방식, 리포트 열람), 구매 기록(금액, 통화) / 목적: 광고 성과 측정 및 마케팅 / 보유·이용 기간: 회원 탈퇴 또는 위탁 계약 종료 시까지</li>
            <li><strong>Supabase, Inc.</strong> — 이전국가: 호주(시드니 리전 서버) / 이전항목: 이름, 이메일 주소, 로그인 서비스 식별값, 구독·구매 정보 / 목적: 회원 정보 저장 및 인증 처리 / 보유·이용 기간: 회원 탈퇴 후 30일까지(법령상 보존 항목은 해당 기간까지)</li>
          </ul>

          <p className="text-gray-300 font-semibold mt-4">이전받는 자의 개인정보 보호 문의처</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li>Google LLC: <a href="https://policies.google.com/privacy" className="text-emerald-400 hover:text-blue-300">https://policies.google.com/privacy</a></li>
            <li>Meta Platforms, Inc.: <a href="https://www.facebook.com/privacy/policy" className="text-emerald-400 hover:text-blue-300">https://www.facebook.com/privacy/policy</a></li>
            <li>Supabase, Inc.: <a href="https://supabase.com/privacy" className="text-emerald-400 hover:text-blue-300">https://supabase.com/privacy</a></li>
          </ul>

          <p className="text-gray-300 font-semibold mt-4">국외 이전 거부 방법 및 효과</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li>이용자는 회원 탈퇴 또는 고객센터(trikilab2025@gmail.com)를 통해 국외 이전을 거부할 수 있습니다.</li>
            <li>Google 로그인, 회원 정보 저장(Supabase), 인앱 결제는 서비스 제공에 필수이므로, 거부할 경우 앱 이용이 제한됩니다.</li>
            <li>광고 목적의 이전(AdMob, Meta)은 「앱-3」의 방법으로 광고식별자 사용을 중지해 거부할 수 있으며, 이 경우에도 앱의 기본 기능은 이용할 수 있습니다.</li>
          </ul>
          <p className="text-gray-400 text-sm mt-3">국내 처리위탁: 네이버㈜ — 네이버 계정 로그인 인증 (국외 이전 없음)</p>
        </section>

        {/* 앱-3 */}
        <section>
          <h3 className="text-xl font-semibold mb-3 text-emerald-400">앱-3. 맞춤형 광고 및 행태정보</h3>
          <p className="text-gray-300 mb-3">회사는 앱에서 광고를 게재하고 광고 성과를 측정하기 위해 행태정보를 수집·이용합니다.</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li><strong>수집하는 행태정보:</strong> 앱 이용 기록(화면·기능 이용, 리포트 열람), 구매 기록, 광고식별자</li>
            <li><strong>수집 방법:</strong> 앱 실행 및 이용 시 자동 수집</li>
            <li><strong>이용 목적:</strong> 이용자 관심에 맞는 광고 게재, 광고 성과 측정</li>
            <li><strong>행태정보를 수집·처리하는 사업자:</strong> Google LLC (AdMob), Meta Platforms, Inc.</li>
            <li><strong>보유·이용 기간:</strong> 수집일로부터 6개월 또는 회원 탈퇴 시까지</li>
          </ul>
          <p className="text-gray-300 font-semibold mt-4">이용자의 통제 방법</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li>Android: 기기의 「설정 → Google → 모든 서비스 → 광고」에서 광고 ID를 삭제하거나 재설정할 수 있습니다. 메뉴 명칭은 기기 제조사와 OS 버전에 따라 다를 수 있습니다.</li>
            <li>광고 ID를 삭제하면 맞춤형 광고가 중지되며, 일반 광고는 계속 표시될 수 있습니다.</li>
            <li>유료 구독 이용자에게는 앱 내 광고가 표시되지 않습니다.</li>
          </ul>
          <p className="text-gray-300 font-semibold mt-4">행태정보 관련 문의 — 개인정보 보호책임자</p>
          <p className="text-gray-300 ml-1">성명: 김기탁 (대표자) / 이메일: trikilab2025@gmail.com</p>
        </section>
      </div>
      )}

      {/* ───────── Mobile App (Android) Additional Provisions — English ───────── */}
      {!isKo && (
      <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
        <div className="border-b border-gray-700 pb-4">
          <h2 className="text-2xl font-bold text-white">Mobile App (Android) — Additional Provisions</h2>
          <p className="text-gray-400 text-sm mt-2">These provisions apply to the TrendSoccer mobile app (the same provisions will apply to iOS at launch). Effective: 2026-10-01</p>
        </div>

        {/* App-1 */}
        <section>
          <h3 className="text-xl font-semibold mb-3 text-emerald-400">App-1. Personal Information Collected Through the Mobile App</h3>
          <p className="text-gray-300 mb-2">When you use the TrendSoccer mobile app (the "App"), we collect the following information.</p>
          <p className="text-gray-300 font-semibold mt-3">1) When you sign up or log in (required)</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li>Google or Naver account login: name, email address, and the account identifier issued by the login service</li>
          </ul>
          <p className="text-gray-300 font-semibold mt-3">2) Information collected automatically while you use the App</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li>Device information: advertising ID (ADID), app instance ID, device model, operating system version, app version</li>
            <li>App usage records: screens visited and features used, match reports viewed, sign-up method (Google or Naver)</li>
            <li>Purchase records: subscription product, payment amount, payment currency</li>
            <li>Connection information: IP address and the approximate location (country/city level) inferred from it</li>
            <li>App performance information: app launch time, crash rate and other diagnostics, and error records when the App crashes (crash logs, error location, device model, OS version, app installation ID)</li>
            <li>Push notification token (only if you allow push notifications)</li>
          </ul>
          <p className="text-gray-400 text-sm mt-3">We do not collect payment card numbers or other payment instrument details. In-app purchases are processed by the Google Play billing system.</p>
        </section>

        {/* App-2 */}
        <section>
          <h3 className="text-xl font-semibold mb-3 text-emerald-400">App-2. Outsourcing of Processing and Cross-Border Transfer of Personal Information</h3>
          <p className="text-gray-300 mb-3">To provide the App, we entrust the processing of personal information to, or transfer it to, the parties listed below. Information is transmitted over an encrypted network connection (TLS) at the time you use the App.</p>
          <ul className="list-disc list-inside text-gray-300 space-y-3 ml-4">
            <li><strong>Google LLC (Firebase Analytics, Cloud Messaging, Remote Config)</strong> — Country: United States / Items: app instance ID, device information, app usage records, push notification token / Purpose: usage analytics, sending push notifications, distributing app configuration / Retention: until account deletion or termination of the service agreement</li>
            <li><strong>Google LLC (Firebase Crashlytics)</strong> — Country: United States / Items: crash logs, error location, device model, OS version, app installation ID / Purpose: analyzing app errors and improving stability / Retention: 90 days from collection</li>
            <li><strong>Google LLC (AdMob)</strong> — Country: United States / Items: advertising ID, IP address, app usage records, diagnostics / Purpose: serving ads, measuring ad performance, preventing fraud / Retention: until account deletion or termination of the service agreement</li>
            <li><strong>Google LLC (Google Play Billing, Google Sign-In)</strong> — Country: United States / Items: purchase records, Google account identifier / Purpose: processing in-app payments, login authentication / Retention: for the period required by applicable law</li>
            <li><strong>Meta Platforms, Inc.</strong> — Country: United States / Items: advertising ID, device information, app usage records (sign-up method, report views), purchase records (amount, currency) / Purpose: measuring ad performance and marketing / Retention: until account deletion or termination of the service agreement</li>
            <li><strong>Supabase, Inc.</strong> — Country: Australia (Sydney region servers) / Items: name, email address, login service identifier, subscription and purchase information / Purpose: storing member information and processing authentication / Retention: up to 30 days after account deletion (items that must be retained by law are kept for the legally required period)</li>
          </ul>

          <p className="text-gray-300 font-semibold mt-4">Privacy contacts of the recipients</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li>Google LLC: <a href="https://policies.google.com/privacy" className="text-emerald-400 hover:text-blue-300">https://policies.google.com/privacy</a></li>
            <li>Meta Platforms, Inc.: <a href="https://www.facebook.com/privacy/policy" className="text-emerald-400 hover:text-blue-300">https://www.facebook.com/privacy/policy</a></li>
            <li>Supabase, Inc.: <a href="https://supabase.com/privacy" className="text-emerald-400 hover:text-blue-300">https://supabase.com/privacy</a></li>
          </ul>

          <p className="text-gray-300 font-semibold mt-4">How to refuse cross-border transfer, and what happens if you do</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li>You may refuse cross-border transfer by deleting your account or by contacting us at trikilab2025@gmail.com.</li>
            <li>Google Sign-In, member data storage (Supabase), and in-app payments are essential to the service. If you refuse these transfers, your use of the App will be limited.</li>
            <li>You may refuse transfers for advertising purposes (AdMob, Meta) by stopping the use of your advertising ID as described in App-3. You can still use the App's core features in that case.</li>
          </ul>
          <p className="text-gray-400 text-sm mt-3">Domestic (Korea) outsourcing: NAVER Corp. — Naver account login authentication (no cross-border transfer)</p>
        </section>

        {/* App-3 */}
        <section>
          <h3 className="text-xl font-semibold mb-3 text-emerald-400">App-3. Personalized Advertising and Behavioral Information</h3>
          <p className="text-gray-300 mb-3">We collect and use behavioral information to show ads in the App and to measure their performance.</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li><strong>Behavioral information collected:</strong> app usage records (screens and features used, report views), purchase records, advertising ID</li>
            <li><strong>Collection method:</strong> collected automatically when you open and use the App</li>
            <li><strong>Purpose:</strong> showing ads relevant to your interests, measuring ad performance</li>
            <li><strong>Businesses that collect and process behavioral information:</strong> Google LLC (AdMob), Meta Platforms, Inc.</li>
            <li><strong>Retention period:</strong> 6 months from collection, or until account deletion</li>
          </ul>
          <p className="text-gray-300 font-semibold mt-4">How you can control it</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
            <li>Android: go to <strong>Settings → Google → All services → Ads</strong> on your device to delete or reset your advertising ID. Menu names may differ by device manufacturer and OS version.</li>
            <li>If you delete your advertising ID, personalized ads stop. Non-personalized ads may still be shown.</li>
            <li>Paid subscribers do not see ads in the App.</li>
          </ul>
          <p className="text-gray-300 font-semibold mt-4">Contact for behavioral information — Chief Privacy Officer</p>
          <p className="text-gray-300 ml-1">Name: Kim Gi-tak (Representative) / Email: trikilab2025@gmail.com</p>
        </section>

        {/* App-4 */}
        <section>
          <h3 className="text-xl font-semibold mb-3 text-emerald-400">App-4. Users Outside the Republic of Korea</h3>
          <p className="text-gray-300 mb-3">TrendSoccer is operated by Tri-Ki Co., Ltd. in the Republic of Korea. If you use the App outside Korea, your information is processed in Korea and transferred to the countries listed in App-2 (United States and Australia).</p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
            <li><strong>Your rights.</strong> Depending on where you live, you may have the right to access, correct, delete, or obtain a copy of your personal information, to object to or restrict certain processing, and to withdraw consent. To exercise these rights, contact us at trikilab2025@gmail.com. We will respond within the period required by applicable law.</li>
            <li><strong>Advertising and "sharing".</strong> We do not sell your personal information for money. We do share the advertising ID, app usage records and purchase records with Google (AdMob) and Meta for advertising measurement as described in App-2 and App-3. Under some laws (for example, certain U.S. state privacy laws), this may be considered "sharing" for targeted advertising. You can opt out at any time by deleting or resetting your advertising ID as described in App-3, or by contacting us.</li>
            <li><strong>Children.</strong> The App is not directed to children, and we do not knowingly collect personal information from children under the age required by applicable law.</li>
          </ul>
        </section>
      </div>
      )}
    </div>
  )
}

// v2.0 - 2026년 2월 6일 (이용권 모델 전환, SeedPay PG 추가)
function PrivacyV2_0({ isKo }: { isKo: boolean }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
      
      {/* 1. 개요 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '1. 개요' : '1. Overview'}
        </h2>
        <p className="text-gray-300 leading-relaxed">
          {isKo 
            ? 'TrendSoccer(이하 "회사")는 귀하의 개인정보 보호를 중요하게 생각합니다. 본 개인정보 처리방침은 귀하가 저희 웹사이트(trendsoccer.com)를 이용할 때 개인정보를 수집, 사용, 공개 및 보호하는 방법을 설명합니다.'
            : 'TrendSoccer ("Company") values your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our website (trendsoccer.com).'}
        </p>
      </section>

      {/* 2. 수집하는 정보 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '2. 수집하는 정보' : '2. Information We Collect'}
        </h2>
        
        <h3 className="text-xl font-semibold mb-3 text-emerald-400">
          {isKo ? '2.1 회원가입 시 수집 정보' : '2.1 Information Collected During Registration'}
        </h3>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '소셜 로그인(Google, Naver)을 통해 회원가입 시 다음 정보가 수집됩니다:'
            : 'When you sign up through social login (Google, Naver), the following information is collected:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '이메일 주소' : 'Email address'}</li>
          <li>{isKo ? '이름 (닉네임)' : 'Name (nickname)'}</li>
          <li>{isKo ? '프로필 이미지 (선택)' : 'Profile image (optional)'}</li>
          <li>{isKo ? '소셜 계정 고유 ID' : 'Social account unique ID'}</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3 mt-6 text-emerald-400">
          {isKo ? '2.2 이용권 결제 시 수집 정보' : '2.2 Information Collected During Access Pass Payment'}
        </h3>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '프리미엄 이용권 결제 시 다음 정보가 수집됩니다:'
            : 'When purchasing a premium access pass, the following information is collected:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '결제 수단 정보 (카드사명, 카드 종류)' : 'Payment method information (card issuer, card type)'}</li>
          <li>{isKo ? '결제 승인번호' : 'Payment approval number'}</li>
          <li>{isKo ? '결제 금액 및 결제일시' : 'Payment amount and date/time'}</li>
          <li>{isKo ? '이용권 시작일 및 만료일' : 'Access pass start and expiration date'}</li>
          <li>{isKo ? '주문번호 (거래 식별용)' : 'Order number (for transaction identification)'}</li>
        </ul>
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 mt-3">
          <p className="text-gray-300">
            <strong className="text-emerald-400">{isKo ? '안전한 결제 처리:' : 'Secure Payment Processing:'}</strong>{' '}
            {isKo 
              ? '결제는 SeedPay 결제대행 서비스를 통해 처리됩니다. 신용카드 번호, CVC, 비밀번호 등 민감한 결제 정보는 회사가 직접 저장하지 않으며, PG사(결제대행사)에서 안전하게 관리합니다.'
              : 'Payments are processed through SeedPay payment gateway. Sensitive payment information such as credit card numbers, CVC, and passwords are not stored directly by the Company and are securely managed by the payment gateway.'}
          </p>
        </div>

        <h3 className="text-xl font-semibold mb-3 mt-6 text-emerald-400">
          {isKo ? '2.3 자동으로 수집되는 정보' : '2.3 Automatically Collected Information'}
        </h3>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '웹사이트 방문 시 다음 정보가 자동으로 수집됩니다:'
            : 'The following information is automatically collected when you visit our website:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '브라우저 종류 및 버전' : 'Browser type and version'}</li>
          <li>{isKo ? 'IP 주소' : 'IP address'}</li>
          <li>{isKo ? '방문 페이지 및 체류 시간' : 'Pages visited and time spent'}</li>
          <li>{isKo ? '운영 체제 정보' : 'Operating system information'}</li>
          <li>{isKo ? '기기 정보 (모바일/데스크톱)' : 'Device information (mobile/desktop)'}</li>
        </ul>
      </section>

      {/* 3. 정보 사용 목적 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '3. 정보 사용 목적' : '3. How We Use Your Information'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '수집된 정보는 다음 목적으로 사용됩니다:'
            : 'The collected information is used for the following purposes:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '회원 식별 및 서비스 제공' : 'Member identification and service provision'}</li>
          <li>{isKo ? '프리미엄 이용권 관리 및 결제 처리' : 'Premium access pass management and payment processing'}</li>
          <li>{isKo ? '이용권 만료 안내 및 서비스 관련 공지사항 전달' : 'Access pass expiration notifications and service-related announcements'}</li>
          <li>{isKo ? '서비스 개선 및 개인화' : 'Improving and personalizing our services'}</li>
          <li>{isKo ? '사용자 행동 분석 및 이해' : 'Analyzing and understanding user behavior'}</li>
          <li>{isKo ? '고객 지원 및 문의 응답' : 'Customer support and responding to inquiries'}</li>
          <li>{isKo ? '보안 및 사기 방지' : 'Security and fraud prevention'}</li>
        </ul>
      </section>

      {/* 4. 개인정보 보관 기간 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '4. 개인정보 보관 기간' : '4. Data Retention Period'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '회원의 개인정보는 다음 기간 동안 보관됩니다:'
            : 'Member personal information is retained for the following periods:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>
            <strong>{isKo ? '회원 정보:' : 'Member information:'}</strong>{' '}
            {isKo ? '회원 탈퇴 시까지 (탈퇴 후 30일 이내 삭제)' : 'Until membership withdrawal (deleted within 30 days after withdrawal)'}
          </li>
          <li>
            <strong>{isKo ? '결제 정보:' : 'Payment information:'}</strong>{' '}
            {isKo ? '전자상거래법에 따라 5년간 보관' : 'Retained for 5 years in accordance with e-commerce law'}
          </li>
          <li>
            <strong>{isKo ? '접속 기록:' : 'Access logs:'}</strong>{' '}
            {isKo ? '통신비밀보호법에 따라 3개월간 보관' : 'Retained for 3 months in accordance with communication privacy law'}
          </li>
        </ul>
      </section>

      {/* 5. 쿠키 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '5. 쿠키 및 추적 기술' : '5. Cookies and Tracking Technologies'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '저희는 쿠키 및 유사한 추적 기술을 사용하여 웹사이트 활동을 추적하고 특정 정보를 저장합니다.'
            : 'We use cookies and similar tracking technologies to track website activity and store certain information.'}
        </p>
        
        <h3 className="text-xl font-semibold mb-3 mt-4 text-emerald-400">
          {isKo ? '사용하는 쿠키 유형:' : 'Types of Cookies We Use:'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>
            <strong>{isKo ? '필수 쿠키:' : 'Essential Cookies:'}</strong>{' '}
            {isKo ? '로그인 상태 유지, 웹사이트 기능에 필요' : 'Login session, required for website functionality'}
          </li>
          <li>
            <strong>{isKo ? '분석 쿠키:' : 'Analytics Cookies:'}</strong>{' '}
            {isKo ? '방문자의 웹사이트 이용 방식 이해' : 'Understanding how visitors use the website'}
          </li>
          <li>
            <strong>{isKo ? '기능 쿠키:' : 'Functional Cookies:'}</strong>{' '}
            {isKo ? '언어 설정 등 환경 설정 기억' : 'Remembering settings like language preferences'}
          </li>
        </ul>
        <p className="text-gray-300 mt-3 text-sm">
          {isKo 
            ? '브라우저 설정에서 모든 쿠키를 거부하거나 쿠키 전송 시 알림을 받도록 설정할 수 있습니다.'
            : 'You can set your browser to refuse all cookies or to notify you when a cookie is being sent.'}
        </p>
      </section>

      {/* 6. 제3자 서비스 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '6. 제3자 서비스' : '6. Third-Party Services'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '저희는 다음과 같은 제3자 서비스를 사용합니다:'
            : 'We use the following third-party services:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>
            <strong>Google OAuth:</strong>{' '}
            {isKo ? '소셜 로그인 인증' : 'Social login authentication'}
          </li>
          <li>
            <strong>Naver OAuth:</strong>{' '}
            {isKo ? '소셜 로그인 인증' : 'Social login authentication'}
          </li>
          <li>
            <strong>SeedPay:</strong>{' '}
            {isKo ? '이용권 결제 처리 (신용카드, 체크카드)' : 'Access pass payment processing (credit card, debit card)'}
          </li>
          <li>
            <strong>Google Analytics:</strong>{' '}
            {isKo ? '웹사이트 트래픽 및 사용자 행동 분석' : 'Website traffic and user behavior analysis'}
          </li>
          <li>
            <strong>Google AdSense:</strong>{' '}
            {isKo ? '광고 표시 (무료 회원 대상)' : 'Displaying advertisements (for free members)'}
          </li>
          <li>
            <strong>Supabase:</strong>{' '}
            {isKo ? '사용자 데이터 저장 및 인증 관리' : 'User data storage and authentication management'}
          </li>
        </ul>
        <p className="text-gray-300 mt-3">
          {isKo 
            ? '이러한 제3자는 자체 개인정보 보호정책을 가지고 있으며, 해당 정보 사용 방법에 대해 설명합니다.'
            : 'These third parties have their own privacy policies that explain how they use information.'}
        </p>
      </section>

      {/* 7. 결제 정보 처리 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '7. 결제 정보 처리' : '7. Payment Information Processing'}
        </h2>
        
        <h3 className="text-xl font-semibold mb-3 text-emerald-400">
          {isKo ? '7.1 회사가 저장하는 정보' : '7.1 Information Stored by the Company'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
          <li>{isKo ? '주문번호 및 거래번호 (TID)' : 'Order number and transaction ID (TID)'}</li>
          <li>{isKo ? '결제 금액 및 결제 상태' : 'Payment amount and payment status'}</li>
          <li>{isKo ? '카드사명 (예: 삼성카드, 현대카드)' : 'Card issuer name (e.g., Samsung Card, Hyundai Card)'}</li>
          <li>{isKo ? '승인번호' : 'Approval number'}</li>
          <li>{isKo ? '결제 일시' : 'Payment date and time'}</li>
          <li>{isKo ? '구매한 이용권 종류 (1개월권/3개월권)' : 'Access pass type purchased (1-month/3-month)'}</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-emerald-400">
          {isKo ? '7.2 회사가 저장하지 않는 정보' : '7.2 Information NOT Stored by the Company'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '신용카드/체크카드 전체 번호' : 'Full credit/debit card number'}</li>
          <li>{isKo ? 'CVC/CVV 보안 코드' : 'CVC/CVV security code'}</li>
          <li>{isKo ? '카드 비밀번호' : 'Card PIN/password'}</li>
          <li>{isKo ? '카드 유효기간' : 'Card expiration date'}</li>
        </ul>
        <p className="text-gray-400 text-sm mt-3">
          {isKo 
            ? '※ 위 민감 정보는 SeedPay PG사에서 PCI-DSS 보안 표준에 따라 안전하게 처리됩니다.'
            : '※ The above sensitive information is securely processed by SeedPay PG in accordance with PCI-DSS security standards.'}
        </p>
      </section>

      {/* 8. 데이터 보안 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '8. 데이터 보안' : '8. Data Security'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '저희는 귀하의 개인정보를 보호하기 위해 다음과 같은 보안 조치를 시행합니다:'
            : 'We implement the following security measures to protect your personal information:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? 'SSL/TLS 암호화를 통한 데이터 전송 보호' : 'Data transmission protection through SSL/TLS encryption'}</li>
          <li>{isKo ? '안전한 서버 환경 (Vercel, Supabase)' : 'Secure server environment (Vercel, Supabase)'}</li>
          <li>{isKo ? '접근 권한 관리 및 인증 시스템' : 'Access control and authentication systems'}</li>
          <li>{isKo ? 'PG사를 통한 결제 정보 분리 관리' : 'Separate payment information management through PG'}</li>
        </ul>
        <p className="text-gray-300 mt-3 text-sm">
          {isKo 
            ? '그러나 인터넷을 통한 전송 방법이나 전자 저장 방법이 100% 안전하다고 보장할 수 없습니다.'
            : 'However, no method of transmission over the Internet or electronic storage is 100% secure.'}
        </p>
      </section>

      {/* 9. 귀하의 권리 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '9. 귀하의 권리' : '9. Your Rights'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo ? '귀하는 다음과 같은 권리를 가집니다:' : 'You have the following rights:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '저희가 보유한 개인정보에 대한 열람' : 'Access to personal information we hold about you'}</li>
          <li>{isKo ? '부정확한 정보의 정정 요청' : 'Request correction of inaccurate information'}</li>
          <li>{isKo ? '개인정보 삭제 요청 (회원 탈퇴)' : 'Request deletion of personal information (membership withdrawal)'}</li>
          <li>{isKo ? '개인정보 처리에 대한 이의 제기' : 'Object to processing of personal information'}</li>
          <li>{isKo ? '결제 내역 확인 요청' : 'Request to view payment history'}</li>
          <li>{isKo ? '언제든지 동의 철회' : 'Withdraw consent at any time'}</li>
        </ul>
        <p className="text-gray-400 text-sm mt-3">
          {isKo 
            ? '※ 위 권리 행사를 원하시면 아래 연락처로 문의해 주세요.'
            : '※ To exercise these rights, please contact us using the information below.'}
        </p>
      </section>

      {/* 10. 개인정보 처리방침 변경 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '10. 개인정보 처리방침의 변경' : '10. Changes to This Privacy Policy'}
        </h2>
        <p className="text-gray-300">
          {isKo 
            ? '저희는 수시로 개인정보 처리방침을 업데이트할 수 있습니다. 변경 사항이 있을 경우 본 페이지에 새로운 개인정보 처리방침을 게시하고 "최종 수정일"을 업데이트하여 알려드립니다. 중요한 변경사항은 서비스 내 공지를 통해 안내드립니다.'
            : 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Significant changes will be announced through in-service notifications.'}
        </p>
      </section>

      {/* 11. 문의 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '11. 문의' : '11. Contact Us'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '본 개인정보 처리방침에 대한 질문이 있으시면 다음으로 연락 주시기 바랍니다:'
            : 'If you have any questions about this Privacy Policy, please contact us:'}
        </p>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-700">
          <p className="text-gray-300 mb-2">
            <strong>{isKo ? '서비스명:' : 'Service:'}</strong> TrendSoccer
          </p>
          <p className="text-gray-300 mb-2">
            <strong>{isKo ? '웹사이트:' : 'Website:'}</strong>{' '}
            <a href="https://trendsoccer.com" className="text-emerald-400 hover:text-blue-300">
              https://trendsoccer.com
            </a>
          </p>
          <p className="text-gray-300">
            <strong>{isKo ? '이메일:' : 'Email:'}</strong>{' '}
            <a href="mailto:trikilab2025@gmail.com" className="text-emerald-400 hover:text-blue-300">
              trikilab2025@gmail.com
            </a>
          </p>
        </div>
      </section>

    </div>
  )
}

// v1.1 - 2025년 1월 14일 (유료화 업데이트 - 구독 모델)
function PrivacyV1_1({ isKo }: { isKo: boolean }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
      
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <p className="text-yellow-400 text-sm">
          {isKo 
            ? '⚠️ 이 버전은 더 이상 유효하지 않습니다. 현재 적용되는 개인정보 처리방침은 최신 버전(v2.0)을 확인해 주세요.'
            : '⚠️ This version is no longer valid. Please check the latest version (v2.0) for the currently applicable privacy policy.'}
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '1. 개요' : '1. Overview'}
        </h2>
        <p className="text-gray-300 leading-relaxed">
          {isKo 
            ? 'TrendSoccer(이하 "회사")는 귀하의 개인정보 보호를 중요하게 생각합니다. 본 개인정보 처리방침은 귀하가 저희 웹사이트(trendsoccer.com)를 이용할 때 개인정보를 수집, 사용, 공개 및 보호하는 방법을 설명합니다.'
            : 'TrendSoccer ("Company") values your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our website (trendsoccer.com).'}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '2. 수집하는 정보' : '2. Information We Collect'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '이 버전에서는 정기구독 모델 기준으로 결제 정보를 수집했습니다. PG사는 특정되지 않았습니다.'
            : 'This version collected payment information based on the recurring subscription model. The PG was not specified.'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '이메일, 이름, 프로필 이미지, 소셜 계정 ID' : 'Email, name, profile image, social account ID'}</li>
          <li>{isKo ? '결제 수단 정보 (PG사를 통해 처리)' : 'Payment method information (processed through PG)'}</li>
          <li>{isKo ? '구독 시작일 및 만료일' : 'Subscription start and expiration date'}</li>
          <li>{isKo ? '결제 내역' : 'Payment history'}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '6. 제3자 서비스 (v1.1 기준)' : '6. Third-Party Services (v1.1)'}
        </h2>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li><strong>Google/Naver OAuth</strong> - {isKo ? '소셜 로그인' : 'Social login'}</li>
          <li><strong>Google Analytics</strong> - {isKo ? '트래픽 분석' : 'Traffic analysis'}</li>
          <li><strong>Google AdSense</strong> - {isKo ? '광고 표시' : 'Ad display'}</li>
          <li><strong>{isKo ? '결제대행사 (PG):' : 'PG:'}</strong> {isKo ? '미특정' : 'Not specified'}</li>
        </ul>
      </section>

      <section className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <p className="text-gray-300">
          {isKo 
            ? '최신 개인정보 처리방침(v2.0)을 확인해 주세요.'
            : 'Please refer to the latest privacy policy (v2.0).'}
        </p>
      </section>
    </div>
  )
}

// v1.0 - 2025년 11월 6일 (초기 버전)
function PrivacyV1_0({ isKo }: { isKo: boolean }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
      
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <p className="text-yellow-400 text-sm">
          {isKo 
            ? '⚠️ 이 버전은 더 이상 유효하지 않습니다. 현재 적용되는 개인정보 처리방침은 최신 버전을 확인해 주세요.'
            : '⚠️ This version is no longer valid. Please check the latest version for the currently applicable privacy policy.'}
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '1. 개요' : '1. Overview'}
        </h2>
        <p className="text-gray-300 leading-relaxed">
          {isKo 
            ? 'Trend Soccer는 귀하의 개인정보 보호를 중요하게 생각합니다. 본 개인정보 처리방침은 귀하가 저희 웹사이트를 방문할 때 개인정보를 수집, 사용, 공개 및 보호하는 방법을 설명합니다.'
            : 'Trend Soccer values your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you visit our website.'}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '2. 수집하는 정보' : '2. Information We Collect'}
        </h2>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '브라우저 종류 및 버전' : 'Browser type and version'}</li>
          <li>{isKo ? 'IP 주소' : 'IP address'}</li>
          <li>{isKo ? '방문 페이지 및 체류 시간' : 'Pages visited and time spent'}</li>
          <li>{isKo ? '운영 체제 정보' : 'Operating system information'}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '3. 준거법' : '3. Governing Law'}
        </h2>
        <p className="text-gray-300">
          {isKo 
            ? '본 방침은 대한민국 법률에 따라 규율됩니다.'
            : 'This policy is governed by the laws of the Republic of Korea.'}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '9. 문의' : '9. Contact Us'}
        </h2>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-700">
          <p className="text-gray-300">
            {isKo ? '이메일: ' : 'Email: '}
            <a href="mailto:trikilab2025@gmail.com" className="text-emerald-400 hover:text-blue-300">
              trikilab2025@gmail.com
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
