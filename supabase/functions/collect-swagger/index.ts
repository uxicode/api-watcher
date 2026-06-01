import { handleOptions, errorResponse } from '../_shared/cors.ts'
import { handleCollectSwagger } from './collect.ts'

// 스와그그 수집 핸들러 서버 생성
Deno.serve(async (req) => {
  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') return handleOptions()

  try {
    // 스웨거 수집 핸들러 호출
    return await handleCollectSwagger(req)
  // 오류 발생 시 에러 응답 반환 (500 Internal Server Error)
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : '오류가 발생했습니다', // 오류 메시지
      500 // 500 Internal Server Error
    )
  }
})
