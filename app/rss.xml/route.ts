// /rss.xml — /rss 의 별칭.
// 네이버 서치어드바이저·구글·RSS 리더 대부분이 .xml 확장자를 먼저 탐색하므로
// 동일한 피드를 두 경로 모두에서 제공한다.
export { GET } from '../rss/route'

export const revalidate = 1800
