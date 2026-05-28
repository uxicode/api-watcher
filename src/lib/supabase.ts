import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY 가 설정되지 않았습니다')
}

// 퍼블릭 anon 키: 브라우저에서 사용 (RLS로 보호)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
