import { Request, Response, NextFunction } from 'express'
import axios from 'axios'

/**
 * Try it out CORS 우회 프록시
 * 프론트엔드 → 이 서버 → 외부 API (CORS 없이 서버 간 통신)
 */
export async function proxyRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { method, url, headers, body } = req.body as {
      method: string
      url: string
      headers?: Record<string, string>
      body?: any
    }

    if (!method || !url) {
      res.status(400).json({ error: { message: 'method, url 은 필수입니다' } })
      return
    }

    // 허용되는 HTTP 메서드 검증
    const allowedMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
    if (!allowedMethods.includes(method.toLowerCase())) {
      res.status(400).json({ error: { message: `허용되지 않는 메서드: ${method}` } })
      return
    }

    // 내부 루프백 주소 차단 (SSRF 방지)
    const targetUrl = new URL(url)
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
    if (blocked.some(h => targetUrl.hostname === h) && process.env.NODE_ENV === 'production') {
      res.status(400).json({ error: { message: '내부 주소로의 요청은 허용되지 않습니다' } })
      return
    }

    const response = await axios.request({
      method: method.toLowerCase() as any,
      url,
      headers: headers || {},
      data: body,
      validateStatus: () => true, // 모든 status 코드를 에러로 처리하지 않음
      timeout: 30000,
      // 응답을 버퍼로 받아 바이너리도 처리 가능하게
      responseType: 'text',
      transformResponse: [(data) => data] // 자동 JSON 파싱 비활성화
    })

    // 응답 헤더에서 전달할 것들 필터링 (hop-by-hop 헤더 제외)
    const skipHeaders = new Set([
      'transfer-encoding', 'connection', 'keep-alive', 'upgrade',
      'proxy-authenticate', 'proxy-authorization', 'te', 'trailers'
    ])
    const responseHeaders: Record<string, string> = {}
    for (const [key, value] of Object.entries(response.headers)) {
      if (!skipHeaders.has(key.toLowerCase())) {
        responseHeaders[key] = String(value)
      }
    }

    // JSON 파싱 시도
    let parsedBody: any = response.data
    const contentType = String(response.headers['content-type'] || '')
    if (contentType.includes('application/json')) {
      try { parsedBody = JSON.parse(response.data) } catch { /* 파싱 실패 시 텍스트 그대로 */ }
    }

    res.status(200).json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: parsedBody
    })
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      res.status(502).json({ error: { message: `대상 서버에 연결할 수 없습니다: ${err.message}` } })
      return
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      res.status(504).json({ error: { message: '요청 시간이 초과되었습니다 (30초)' } })
      return
    }
    next(err)
  }
}
