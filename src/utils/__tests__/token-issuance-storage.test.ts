import { describe, it, expect, beforeEach } from 'vitest'
import { createDefaultTokenIssuanceConfig } from '@/types/token-issuance'
import {
  getStorageKey,
  loadTokenIssuanceConfig,
  loadTokenIssuanceConfigOrDefault,
  removeTokenIssuanceConfig,
  saveTokenIssuanceConfig
} from '@/utils/token-issuance-storage'

describe('token-issuance-storage', () => {
  const projectId = 'project-1'

  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('storage key를 projectId 기준으로 생성해야 함', () => {
    expect(getStorageKey(projectId)).toBe('api-watcher:token-issuance:project-1')
  })

  it('설정을 저장하고 불러와야 함', () => {
    const config = {
      method: 'post' as const,
      url: 'https://api.example.com/login',
      body: '{"email":"test@example.com"}',
      pinData: false
    }

    saveTokenIssuanceConfig(projectId, config)
    expect(loadTokenIssuanceConfig(projectId)).toEqual(config)
  })

  it('잘못된 JSON은 null을 반환해야 함', () => {
    sessionStorage.setItem(getStorageKey(projectId), '{bad-json')
    expect(loadTokenIssuanceConfig(projectId)).toBeNull()
  })

  it('필드가 누락되면 null을 반환해야 함', () => {
    sessionStorage.setItem(getStorageKey(projectId), JSON.stringify({ method: 'post' }))
    expect(loadTokenIssuanceConfig(projectId)).toBeNull()
  })

  it('설정을 삭제해야 함', () => {
    saveTokenIssuanceConfig(projectId, createDefaultTokenIssuanceConfig())
    removeTokenIssuanceConfig(projectId)
    expect(loadTokenIssuanceConfig(projectId)).toBeNull()
  })

  it('저장값이 없으면 기본값을 반환해야 함', () => {
    expect(loadTokenIssuanceConfigOrDefault(projectId)).toEqual(createDefaultTokenIssuanceConfig())
  })
})
