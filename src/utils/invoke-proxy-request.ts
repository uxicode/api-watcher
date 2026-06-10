import { supabase } from '@/lib/supabase'

export interface ProxyRequestInput {
  method: string
  url: string
  headers?: Record<string, string>
  body?: unknown
}

export interface ProxyRequestResult {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
}

function normalizeProxyBody(body: unknown): string {
  if (body === null || body === undefined) return ''

  if (typeof body === 'object') {
    return JSON.stringify(body, null, 2)
  }

  return String(body)
}

export async function invokeProxyRequest(
  input: ProxyRequestInput
): Promise<ProxyRequestResult> {
  const { data, error } = await supabase.functions.invoke('proxy', {
    body: {
      method: input.method,
      url: input.url,
      headers: input.headers ?? {},
      body: input.body
    }
  })

  if (error) {
    let message = error.message || 'proxy 요청에 실패했습니다'

    if (error.context && typeof error.context.json === 'function') {
      try {
        const payload = await error.context.json()
        message = payload?.error?.message || message
      } catch {
        // ignore parse failure
      }
    }

    throw new Error(message)
  }

  if (!data) {
    throw new Error('proxy 응답이 비어 있습니다')
  }

  return {
    status: data.status,
    statusText: data.statusText,
    headers: data.headers || {},
    body: normalizeProxyBody(data.body)
  }
}
