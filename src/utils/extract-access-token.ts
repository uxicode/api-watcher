function looksLikeAccessToken(value: unknown): value is string {
  if (typeof value !== 'string') return false

  const trimmed = value.trim()
  if (trimmed.length < 10) return false

  // JWT (header.payload.signature)
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(trimmed)) return true

  // 일반 Bearer/Opaque 토큰
  if (trimmed.length >= 16 && /^[A-Za-z0-9._-]+$/.test(trimmed)) return true

  return false
}

function findAccessTokenInObject(obj: unknown, maxDepth = 6): string | null {
  if (maxDepth <= 0 || obj === null || obj === undefined) return null

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findAccessTokenInObject(item, maxDepth - 1)
      if (found) return found
    }
    return null
  }

  if (typeof obj !== 'object') return null

  const record = obj as Record<string, unknown>
  if (Object.prototype.hasOwnProperty.call(record, 'accessToken')
    && looksLikeAccessToken(record.accessToken)) {
    return record.accessToken.trim()
  }

  for (const value of Object.values(record)) {
    if (value !== null && typeof value === 'object') {
      const found = findAccessTokenInObject(value, maxDepth - 1)
      if (found) return found
    }
  }

  return null
}

export function extractAccessTokenFromResponseBody(body: string): string | null {
  if (!body.trim()) return null

  try {
    return findAccessTokenInObject(JSON.parse(body))
  } catch {
    return null
  }
}

export function hasInsertableAccessToken(body: string): boolean {
  return extractAccessTokenFromResponseBody(body) !== null
}
