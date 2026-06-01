import { describe, it, expect } from 'vitest'
import { buildCurlCommand } from '@/utils/build-curl-command'

describe('buildCurlCommand', () => {
  it('Authorization 헤더와 body를 포함한 curl을 생성해야 함', () => {
    const curl = buildCurlCommand(
      'post',
      'https://api.example.com/users',
      {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      { name: 'test' }
    )

    expect(curl).toContain("curl -X 'POST'")
    expect(curl).toContain("'https://api.example.com/users'")
    expect(curl).toContain("Authorization: Bearer test-token")
    expect(curl).toContain('-d ')
    expect(curl).toContain('"name":"test"')
  })

  it('GET 요청에는 body를 포함하지 않아야 함', () => {
    const curl = buildCurlCommand(
      'get',
      'https://api.example.com/users',
      { Authorization: 'Bearer token' }
    )

    expect(curl).not.toContain('-d ')
  })
})
