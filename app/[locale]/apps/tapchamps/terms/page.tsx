// Tap Champs (모바일 게임) 이용약관
// 앱 설정·첫 실행 안내·플레이 스토어에서 연결하는 공개 URL
//   ko: https://www.trendsoccer.com/apps/tapchamps/terms
//   en: https://www.trendsoccer.com/en/apps/tapchamps/terms
// 다른 언어 사용자는 영어판으로 연결. 해석이 다를 때는 한국어판이 우선 (단, 이용자 거주국의 강행 소비자보호 규정은 그대로 적용)

const EFFECTIVE = '2026-10-16'
const EMAIL = 'trikilab2025@gmail.com'

export default async function TapChampsTermsPage({
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{isKo ? '이용약관' : 'Terms of Service'}</h1>
          <p className="text-gray-400 text-sm">{isKo ? `시행일: ${EFFECTIVE}` : `Effective date: ${EFFECTIVE}`}</p>
          <p className="text-gray-500 text-sm mt-2">
            <a href="/apps/tapchamps/terms" className="hover:text-gray-300">한국어</a>
            {'  ·  '}
            <a href="/en/apps/tapchamps/terms" className="hover:text-gray-300">English</a>
          </p>
        </div>
        <div className="prose prose-invert max-w-none">{isKo ? <Ko /> : <En />}</div>
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
        <H>제1조 (목적)</H>
        <P>
          이 약관은 주식회사 트리기(이하 「회사」, 개발자명 Tri-Ki)가 제공하는 모바일 게임 <strong>Tap Champs</strong>(이하 「게임」)의
          이용 조건과 회사와 이용자의 권리·의무를 정합니다.
        </P>
      </section>

      <section>
        <H>제2조 (용어)</H>
        <Ul>
          <li><strong>이용자</strong>: 이 약관에 따라 게임을 이용하는 사람</li>
          <li><strong>하트</strong>: 게임을 한 판 시작할 때 쓰는 게임 안의 재화. 시간이 지나면 무료로 채워지는 하트, 광고 시청·보상·우편으로 받는 무료 하트, Google Play에서 구매하는 유료 하트가 있습니다.</li>
          <li><strong>유료 하트</strong>: 이용자가 Google Play 결제로 구매한 하트(보너스로 함께 지급되는 하트는 무료 하트로 봅니다)</li>
          <li><strong>기록</strong>: 게임별 점수, 트로피, 나라 대항전·리더보드 순위 등 게임 이용 결과</li>
        </Ul>
      </section>

      <section>
        <H>제3조 (약관의 효력과 변경)</H>
        <Ul>
          <li>게임을 설치·실행하여 이용을 시작하면 이 약관에 동의한 것으로 봅니다. 동의하지 않으면 이용을 중단하고 게임을 삭제할 수 있습니다.</li>
          <li>회사는 관련 법령을 위반하지 않는 범위에서 약관을 바꿀 수 있으며, 시행 7일 전(이용자에게 불리한 변경은 30일 전)부터 이 페이지와 게임 안 공지로 알립니다.</li>
          <li>변경 약관 시행 뒤에도 게임을 계속 이용하면 변경에 동의한 것으로 봅니다.</li>
        </Ul>
      </section>

      <section>
        <H>제4조 (이용 연령)</H>
        <P>
          게임은 13세 이상을 대상으로 합니다. 미성년자가 유료 하트를 구매할 때는 법정대리인(부모 등)의 동의가 필요합니다.
        </P>
      </section>

      <section>
        <H>제5조 (게임 이용과 데이터)</H>
        <Ul>
          <li>게임은 회원가입 없이 무료로 이용할 수 있으며, 일부 기능은 Google Play 게임즈 로그인이 필요합니다.</li>
          <li>게임 데이터는 기기에 저장되고, Google Play 게임즈에 로그인한 경우 이용자의 Google 계정 「저장된 게임」에 백업됩니다. 로그인하지 않은 상태에서 게임을 삭제하거나 기기를 초기화하면 데이터가 사라질 수 있으며, 이 경우 회사가 복구해 드릴 수 없습니다.</li>
          <li>개인정보 처리는 <a href="/apps/tapchamps/privacy" className={link}>개인정보 처리방침</a>을 따릅니다.</li>
        </Ul>
      </section>

      <section>
        <H>제6조 (하트)</H>
        <Ul>
          <li>하트는 게임 안에서만 쓰는 이용권이며 현금이나 다른 재화로 바꾸거나, 다른 사람에게 양도·판매할 수 없습니다.</li>
          <li>게임 안에서는 유료·무료 하트를 구분하지 않고 함께 사용합니다.</li>
          <li>하트는 서비스가 종료될 때까지 유효합니다. 우편함의 보상은 우편마다 표시된 기간이 지나면 받을 수 없습니다.</li>
        </Ul>
      </section>

      <section>
        <H>제7조 (결제와 청약철회·환불)</H>
        <Ul>
          <li>유료 하트는 Google Play 결제 시스템으로 구매하며, 결제·영수증·결제 수단 관리는 Google Play 정책을 따릅니다.</li>
          <li>
            이용자는 유료 하트를 구매한 날부터 <strong>7일 이내</strong>에, 구매한 하트를 사용하지 않은 경우 청약을 철회할 수 있습니다
            (「전자상거래 등에서의 소비자보호에 관한 법률」 제17조).
          </li>
          <li>
            유료 하트는 구매 즉시 지급되어 사용 가능한 상품이므로, <strong>구매한 하트를 사용한 경우</strong>에는 사용한 만큼 청약철회가 제한됩니다.
            이 내용은 상점 화면에도 표시합니다.
          </li>
          <li>
            미성년자가 법정대리인의 동의 없이 결제한 경우, 본인 또는 법정대리인은 그 결제를 취소할 수 있습니다. 다만 미성년자가 성년자로 속이거나
            법정대리인이 처분을 허락한 범위의 결제는 취소할 수 없습니다.
          </li>
          <li>결제했는데 하트가 지급되지 않는 등 회사의 잘못이 있는 경우에는 기간과 관계없이 지급 또는 환불해 드립니다.</li>
          <li>
            신청 방법: Google Play의 환불 요청(Google Play 앱 → 프로필 → 결제 및 정기 결제 → 예산 및 기록) 또는 아래 이메일로
            Google Play 주문번호(GPA로 시작)를 보내 주세요. 환불은 Google Play 정책과 절차에 따라 원래 결제 수단으로 이루어집니다.
          </li>
          <li>
            유럽경제지역(EEA)·영국 이용자: 디지털 콘텐츠를 구매 즉시 제공받는 데 동의한 경우, 관련 법에 따라 14일 철회권이 제한될 수 있습니다.
            이용자 거주국의 강행 소비자보호 규정이 있으면 그 규정을 따릅니다.
          </li>
        </Ul>
      </section>

      <section>
        <H>제8조 (광고)</H>
        <P>게임에는 이용자가 직접 골라서 보는 보상형 광고가 있습니다. 광고 보상(하트 등)의 횟수는 게임 안에 표시된 한도를 따릅니다.</P>
      </section>

      <section>
        <H>제9조 (순위와 공정한 이용)</H>
        <P>다음 행위는 금지되며, 확인되면 회사는 해당 기록·순위·보상을 삭제하거나 이용을 제한할 수 있습니다.</P>
        <Ul>
          <li>게임 프로그램·저장 파일·통신을 변조하거나, 비정상적인 방법(매크로, 해킹 도구 등)으로 기록·하트를 얻는 행위</li>
          <li>게임의 오류를 고의로 이용하거나, 알고도 알리지 않고 반복해서 이용하는 행위</li>
          <li>서버(나라 대항전 등)에 비정상적인 데이터를 보내거나 서비스 운영을 방해하는 행위</li>
          <li>Google Play 게임즈 닉네임 등에 타인의 권리를 침해하거나 불쾌감을 주는 표현을 쓰는 행위(Google 정책도 함께 적용)</li>
        </Ul>
      </section>

      <section>
        <H>제10조 (서비스 변경과 종료)</H>
        <Ul>
          <li>회사는 게임 내용(게임 종류, 난이도, 보상, 순위 방식 등)을 개선을 위해 바꿀 수 있습니다.</li>
          <li>
            게임 서비스를 종료할 때는 종료일 30일 전부터 게임 안과 이 페이지에 알립니다. 종료 시점에 남은 유료 하트는 관련 법령과
            「콘텐츠이용자보호지침」에 따라 처리합니다.
          </li>
        </Ul>
      </section>

      <section>
        <H>제11조 (책임의 한계)</H>
        <Ul>
          <li>회사는 천재지변, 통신망 장애, Google 등 외부 서비스의 장애처럼 회사가 막을 수 없는 사유로 생긴 손해에 대해서는 책임지지 않습니다. 다만 회사의 고의나 과실이 있는 경우는 그렇지 않습니다.</li>
          <li>이용자의 기기 관리 소홀, 이 약관을 어긴 이용으로 생긴 손해는 이용자가 책임집니다.</li>
        </Ul>
      </section>

      <section>
        <H>제12조 (준거법과 분쟁 해결)</H>
        <Ul>
          <li>이 약관은 대한민국 법을 따릅니다. 다만 이용자 거주국의 강행 소비자보호 규정은 그대로 적용됩니다.</li>
          <li>분쟁은 먼저 아래 연락처로 협의하며, 소송은 「민사소송법」에 따른 관할 법원에 제기합니다.</li>
          <li>한국어판과 영어판의 내용이 다를 때는 한국어판을 우선합니다.</li>
        </Ul>
      </section>

      <section>
        <H>제13조 (문의와 사업자 정보)</H>
        <P>문의: <a href={`mailto:${EMAIL}`} className={link}>{EMAIL}</a> / 070-5029-3063</P>
        <P>
          상호: 주식회사 트리기 · 대표자: 김기탁 · 사업자등록번호: 406-88-03260 · 통신판매업신고: 제 2025-서울영등포-0011 호
        </P>
        <P>주소: 서울특별시 영등포구 국제금융로6길 33, 919호 (여의도동, 맨하탄빌딩)</P>
      </section>

      <section>
        <H>부칙</H>
        <P>이 약관은 {EFFECTIVE}부터 시행합니다.</P>
      </section>
    </Box>
  )
}

/* ───────────────────────── English ───────────────────────── */
function En() {
  return (
    <Box>
      <section>
        <H>1. About these Terms</H>
        <P>
          These Terms of Service (“Terms”) govern your use of the mobile game <strong>Tap Champs</strong> (the “Game”) provided by Triki Inc.
          (developer name Tri-Ki, “we”, “us”). By installing or playing the Game you agree to these Terms. If you do not agree, please stop using
          the Game and uninstall it.
        </P>
      </section>

      <section>
        <H>2. Definitions</H>
        <Ul>
          <li><strong>Hearts</strong>: the in-game item used to start a game. Hearts refill for free over time and can also be earned from ads, rewards and mail, or purchased through Google Play.</li>
          <li><strong>Paid Hearts</strong>: Hearts you buy through Google Play billing (bonus Hearts included in a pack are treated as free Hearts).</li>
          <li><strong>Records</strong>: your scores, trophies and rankings (Country Battle, leaderboards).</li>
        </Ul>
      </section>

      <section>
        <H>3. Changes to these Terms</H>
        <P>
          We may update these Terms. We will post changes on this page and in the Game at least 7 days before they take effect (30 days for changes
          that are unfavorable to you). If you keep using the Game after the effective date, you accept the updated Terms.
        </P>
      </section>

      <section>
        <H>4. Age</H>
        <P>
          The Game is intended for users aged 13 and over. If you are a minor under the laws of your country, you need permission from a parent or
          legal guardian before making purchases.
        </P>
      </section>

      <section>
        <H>5. Using the Game and your data</H>
        <Ul>
          <li>The Game is free to play and does not require registration. Some features require signing in to Google Play Games.</li>
          <li>Your game data is stored on your device and, if you are signed in to Google Play Games, backed up to “Saved Games” in your Google Account. If you are not signed in, uninstalling the Game or resetting your device may delete your data, and we cannot restore it.</li>
          <li>Our handling of personal data is described in the <a href="/en/apps/tapchamps/privacy" className={link}>Privacy Policy</a>.</li>
        </Ul>
      </section>

      <section>
        <H>6. Hearts</H>
        <Ul>
          <li>Hearts are a limited license to use in-game features. They have no cash value, cannot be exchanged for money or other items, and cannot be transferred or sold.</li>
          <li>Paid and free Hearts are used together in the Game without distinction.</li>
          <li>Hearts remain valid until the service ends. Rewards in the mailbox expire on the date shown on each mail.</li>
        </Ul>
      </section>

      <section>
        <H>7. Purchases, cancellations and refunds</H>
        <Ul>
          <li>Paid Hearts are sold through Google Play billing. Payments, receipts and payment methods are handled under Google Play’s policies.</li>
          <li>Paid Hearts are delivered immediately when you buy them. Where your local law gives you a right to cancel, it may be limited or lost for Hearts you have already used.</li>
          <li>EEA/UK users: by asking for immediate delivery of digital content you acknowledge that you may lose your 14-day right of withdrawal once delivery has started.</li>
          <li>If you were charged but did not receive your Hearts, or there is another error on our side, we will deliver the Hearts or refund you.</li>
          <li>To request a refund, use Google Play’s refund request or email us with your Google Play order number (starts with “GPA”). Refunds are made to the original payment method under Google Play’s policies.</li>
          <li>Nothing in these Terms limits the mandatory consumer protection rights you have under the laws of your country.</li>
        </Ul>
      </section>

      <section>
        <H>8. Ads</H>
        <P>The Game shows rewarded ads only when you choose to watch them. Ad rewards are limited as shown in the Game.</P>
      </section>

      <section>
        <H>9. Fair play</H>
        <P>The following are not allowed. If we detect them, we may remove the related records, rankings or rewards, or restrict your use.</P>
        <Ul>
          <li>Modifying the Game, its save files or network traffic, or using macros, hacking tools or other unfair means to gain records or Hearts</li>
          <li>Deliberately exploiting bugs</li>
          <li>Sending abnormal data to our servers (such as Country Battle) or disrupting the service</li>
          <li>Using offensive names or content that infringes others’ rights in Google Play Games (Google’s policies also apply)</li>
        </Ul>
      </section>

      <section>
        <H>10. Changes to the service and shutdown</H>
        <P>
          We may change the Game’s content (games, difficulty, rewards, rankings) to improve it. If we decide to end the service, we will announce it
          in the Game and on this page at least 30 days in advance, and handle any remaining Paid Hearts as required by applicable law.
        </P>
      </section>

      <section>
        <H>11. Limitation of liability</H>
        <P>
          To the extent permitted by law, we are not liable for losses caused by events beyond our reasonable control, such as natural disasters,
          network failures or outages of third-party services (including Google). This does not limit liability for our intentional misconduct or
          negligence, or any liability that cannot be excluded by law.
        </P>
      </section>

      <section>
        <H>12. Governing law</H>
        <P>
          These Terms are governed by the laws of the Republic of Korea, without depriving you of the protection of mandatory consumer laws of your
          country of residence. We will first try to resolve any dispute by talking with you. If the English and Korean versions differ, the Korean
          version prevails to the extent permitted by law.
        </P>
      </section>

      <section>
        <H>13. Contact</H>
        <P>Email: <a href={`mailto:${EMAIL}`} className={link}>{EMAIL}</a> / +82-70-5029-3063</P>
        <P>
          Triki Inc. · CEO: Gitak Kim · Business Reg. No. 406-88-03260 · E-Commerce Reg. No. 2025-Seoul-Yeongdeungpo-0011
        </P>
        <P>#919, 33 Gukjegeumyung-ro 6-gil, Yeongdeungpo-gu, Seoul, Republic of Korea</P>
        <P>Effective date: {EFFECTIVE}</P>
      </section>
    </Box>
  )
}
