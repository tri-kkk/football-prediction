// 🔥 /baseball → / 로 리다이렉트
// 기존 분리된 야구 페이지는 더 이상 사용하지 않음. 통합 홈에서 종목 탭/리그 칩으로 필터링
import { redirect } from 'next/navigation'

export default function BaseballPage() {
  redirect('/?sport=baseball')
}
