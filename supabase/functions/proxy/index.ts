import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 인증 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: { message: '인증 토큰이 필요합니다' } }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: { message: '유효하지 않은 토큰입니다' } }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { method, url, headers: targetHeaders, body } = await req.json()

    if (!method || !url) {
      return new Response(JSON.stringify({ error: { message: 'method, url은 필수입니다' } }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const allowedMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
    if (!allowedMethods.includes(method.toLowerCase())) {
      return new Response(JSON.stringify({ error: { message: `허용되지 않는 메서드: ${method}` } }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: targetHeaders || {}
    }
    if (body && !['get', 'head'].includes(method.toLowerCase())) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    const targetResponse = await fetch(url, fetchOptions)

    const responseText = await targetResponse.text()
    const contentType = targetResponse.headers.get('content-type') || ''

    let parsedBody: unknown = responseText
    if (contentType.includes('application/json')) {
      try { parsedBody = JSON.parse(responseText) } catch { /* 텍스트 그대로 */ }
    }

    // hop-by-hop 헤더 제외
    const skipHeaders = new Set(['transfer-encoding', 'connection', 'keep-alive', 'upgrade'])
    const responseHeaders: Record<string, string> = {}
    targetResponse.headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) responseHeaders[key] = value
    })

    return new Response(JSON.stringify({
      status: targetResponse.status,
      statusText: targetResponse.statusText,
      headers: responseHeaders,
      body: parsedBody
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다' } }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
