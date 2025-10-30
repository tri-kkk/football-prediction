// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

// 환경 변수 체크
if (!supabaseUrl) {
  throw new Error('❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 없습니다!')
}

if (!supabaseAnonKey) {
  throw new Error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY 환경 변수가 없습니다!')
}

if (!supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY 환경 변수가 없습니다. 읽기만 가능합니다.')
}

console.log('✅ Supabase URL:', supabaseUrl.substring(0, 30) + '...')
console.log('✅ Anon Key:', supabaseAnonKey ? '설정됨' : '없음')
console.log('✅ Service Key:', supabaseServiceKey ? '설정됨' : '없음')

// 클라이언트용 (브라우저에서 사용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 서버용 (API 라우트에서 사용, 쓰기 권한 있음)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase // Service Key 없으면 일반 클라이언트 사용