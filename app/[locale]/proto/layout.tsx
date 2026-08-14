import { redirect } from 'next/navigation'

// 프로토 계산기 서비스 비활성화 — 모든 접근을 홈으로 리다이렉트
export default function ProtoLayout() {
  redirect('/')
}
