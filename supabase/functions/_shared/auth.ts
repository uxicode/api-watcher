import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2'
import { errorResponse } from './cors.ts'

// User 는 Supabase 사용자 정보 타입
interface AuthSuccess {
  user: User
}

interface AuthFailure {
  response: Response
}

type AuthResult = AuthSuccess | AuthFailure

// 인증 실패 여부 확인
function isAuthFailure(result: AuthResult): result is AuthFailure {
  return 'response' in result
}

// 인증 사용자 필요 시 호출
export async function requireAuthUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { response: errorResponse('인증 토큰이 필요합니다', 401) }
  }

  // Supabase 클라이언트 생성
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )

  // 인증 토큰 검증
  const { data: { user }, error: authError } = await anonClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  // 인증 실패 시 에러 응답 반환
  if (authError || !user) {
    return { response: errorResponse('유효하지 않은 토큰입니다', 401) }
  }

  // 인증 성공 시 사용자 정보 반환
  return { user }
}

// 인증 실패 여부 확인 함수 내보내기
export { isAuthFailure }
