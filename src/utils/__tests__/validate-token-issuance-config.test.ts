import { describe, it, expect } from 'vitest'
import { createDefaultTokenIssuanceConfig } from '@/types/token-issuance'
import { validateTokenIssuanceConfig } from '@/utils/validate-token-issuance-config'

describe('validate-token-issuance-config', () => {
  it('비활성화 상태면 검증을 통과해야 함', () => {
    const config = createDefaultTokenIssuanceConfig()
    expect(validateTokenIssuanceConfig(config)).toEqual({ isValid: true, errors: [] })
  })

  it('활성화 + 유효한 POST 설정을 통과해야 함', () => {
    const result = validateTokenIssuanceConfig({
      enabled: true,
      method: 'post',
      url: 'https://api.example.com/auth/login',
      body: '{"email":"a@b.com","password":"secret"}'
    })

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('활성화 시 URL·Body 오류를 반환해야 함', () => {
    const result = validateTokenIssuanceConfig({
      enabled: true,
      method: 'post',
      url: 'not-a-url',
      body: '{invalid'
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('유효한 URL을 입력해주세요')
    expect(result.errors).toContain('요청 Body는 유효한 JSON이어야 합니다')
  })

  it('GET은 Body 없이 통과해야 함', () => {
    const result = validateTokenIssuanceConfig({
      enabled: true,
      method: 'get',
      url: 'https://api.example.com/token',
      body: ''
    })

    expect(result.isValid).toBe(true)
  })

  it('requireEnabled 옵션 시 비활성화를 거부해야 함', () => {
    const result = validateTokenIssuanceConfig(createDefaultTokenIssuanceConfig(), {
      requireEnabled: true
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('토큰 발급 API가 비활성화되어 있습니다')
  })
})
