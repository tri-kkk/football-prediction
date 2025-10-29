// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey)

// 사용 예시:
// import { supabase } from '@/lib/supabase'
// const { data } = await supabase.from('match_predictions').select('*')
