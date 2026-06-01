// CORS 헤더 설정
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
} as const

// OPTIONS 요청 처리
export function handleOptions(): Response {
  return new Response('ok', { headers: corsHeaders })
}

// JSON 응답 생성
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// 에러 응답 생성
export function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status)
}
