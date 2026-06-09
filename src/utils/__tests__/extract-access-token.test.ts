import { describe, it, expect } from 'vitest'
import {
  extractAccessTokenFromResponseBody,
  hasInsertableAccessToken
} from '@/utils/extract-access-token'

const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

describe('extract-access-token', () => {
  it('최상위 accessToken을 추출해야 함', () => {
    const body = JSON.stringify({ accessToken: jwtToken, refreshToken: 'refresh' })
    expect(extractAccessTokenFromResponseBody(body)).toBe(jwtToken)
    expect(hasInsertableAccessToken(body)).toBe(true)
  })

  it('중첩된 accessToken을 추출해야 함', () => {
    const body = JSON.stringify({ data: { accessToken: jwtToken } })
    expect(extractAccessTokenFromResponseBody(body)).toBe(jwtToken)
  })

  it('accessToken이 없거나 토큰 형태가 아니면 null을 반환해야 함', () => {
    expect(extractAccessTokenFromResponseBody('{"token":"abc"}')).toBeNull()
    expect(extractAccessTokenFromResponseBody('{"accessToken":"short"}')).toBeNull()
    expect(hasInsertableAccessToken('not-json')).toBe(false)
  })
})
