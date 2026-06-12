import { describe, it, expect } from 'vitest'
import { createDefaultTokenIssuanceConfig } from '@/types/token-issuance'
import { validateTokenIssuanceConfig } from '@/utils/validate-token-issuance-config'

describe('validate-token-issuance-config', () => {
  it('기본 설정은 URL·Body 오류를 반환해야 함', () => {
    const result = validateTokenIssuanceConfig(createDefaultTokenIssuanceConfig())

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('URL을 입력해주세요')
    expect(result.errors).toContain('요청 Body(JSON)를 입력해주세요')
  })

  it('유효한 POST 설정을 통과해야 함', () => {
    const result = validateTokenIssuanceConfig({
      method: 'post',
      url: 'https://api.example.com/auth/login',
      body: '{"email":"a@b.com","password":"secret"}',
      pinData: false
    })

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('URL·Body 오류를 반환해야 함', () => {
    const result = validateTokenIssuanceConfig({
      method: 'post',
      url: 'not-a-url',
      body: '{invalid',
      pinData: false
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('유효한 URL을 입력해주세요')
    expect(result.errors).toContain('요청 Body는 유효한 JSON이어야 합니다')
  })

  it('GET은 Body 없이 통과해야 함', () => {
    const result = validateTokenIssuanceConfig({
      method: 'get',
      url: 'https://api.example.com/token',
      body: '',
      pinData: false
    })

    expect(result.isValid).toBe(true)
  })
})
