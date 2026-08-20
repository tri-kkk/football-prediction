// remotion/font.ts
// Pretendard 를 번들에 data URI 로 인라인해서 쓴다.
//
// 왜 이렇게 하는가:
//  1) Google Fonts CDN 을 쓰면 렌더할 때마다 수백 건의 네트워크 요청이 발생하고,
//     네트워크가 느리거나 막히면 렌더가 통째로 실패한다.
//  2) public/ 에 두고 staticFile() 로 불러도, concurrency 를 2 이상으로 올리면
//     여러 탭이 동시에 같은 폰트를 요청하면서 로드가 멈춰 delayRender 타임아웃이 난다.
//  → data URI 는 네트워크를 아예 타지 않으므로 concurrency 를 얼마로 올려도 안전하다.
//
// 폰트 파일 준비 (최초 1회):
//   npm i pretendard
//   node scripts/prepare-font.mjs


import fontUrl from './assets/Pretendard-subset.woff2'

export const FONT_FAMILY = 'PretendardVariable'
export const FONT_STACK = `"${FONT_FAMILY}", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`

let injected = false

export const ensureFont = () => {
  if (injected || typeof document === 'undefined') return
  injected = true

  const style = document.createElement('style')
  style.textContent = `
@font-face {
  font-family: '${FONT_FAMILY}';
  src: url('${fontUrl}') format('woff2');
  font-weight: 45 920;
  font-style: normal;
  font-display: block;
}`
  document.head.appendChild(style)

  // 일부러 delayRender() 를 쓰지 않는다.
  // document.fonts.load() 는 Chrome 렌더 탭에서 드물게 영영 resolve 하지 않고,
  // 그러면 delayRender 타임아웃으로 렌더 전체가 죽는다.
  // 폰트가 data URI 라 네트워크 대기가 없고, font-display: block 이라
  // 로드 전에는 글자가 그려지지 않는다. Remotion 은 자체적으로
  // document.fonts.ready 를 기다리므로 이것만으로 충분하다.
  document.fonts.load(`900 100px "${FONT_FAMILY}"`).catch(() => {})
}
