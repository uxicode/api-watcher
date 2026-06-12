import { describe, it, expect, beforeEach } from 'vitest'
import { createDefaultTokenIssuanceConfig } from '@/types/token-issuance'
import { clearCookieStore } from '@/test/setup'
import {
  getCookieKey,
  loadPinnedTokenIssuanceConfig,
  removePinnedTokenIssuanceConfig,
  savePinnedTokenIssuanceConfig
} from '@/utils/token-issuance-cookie'
import {
  getStorageKey,
  loadTokenIssuanceConfig,
  saveTokenIssuanceConfig
} from '@/utils/token-issuance-storage'

describe('token-issuance-cookie', () => {
  const projectId = 'project-1'

  beforeEach(() => {
    sessionStorage.clear()
    clearCookieStore()
  })

  it('고정 저장 시 쿠키에 설정을 저장해야 함', () => {
    savePinnedTokenIssuanceConfig(projectId, {
      method: 'post',
      url: 'https://api.example.com/login',
      body: '{"email":"test@example.com"}',
      pinData: true
    })

    expect(loadPinnedTokenIssuanceConfig(projectId)).toEqual({
      method: 'post',
      url: 'https://api.example.com/login',
      body: '{"email":"test@example.com"}',
      pinData: true
    })
  })

  it('고정 해제 시 쿠키를 삭제해야 함', () => {
    savePinnedTokenIssuanceConfig(projectId, {
      ...createDefaultTokenIssuanceConfig(),
      url: 'https://api.example.com/login',
      body: '{}',
      pinData: true
    })

    removePinnedTokenIssuanceConfig(projectId)
    expect(loadPinnedTokenIssuanceConfig(projectId)).toBeNull()
  })

  it('sessionStorage가 없을 때 쿠키에서 불러와야 함', () => {
    savePinnedTokenIssuanceConfig(projectId, {
      method: 'get',
      url: 'https://api.example.com/token',
      body: '',
      pinData: true
    })

    expect(loadTokenIssuanceConfig(projectId)).toEqual({
      method: 'get',
      url: 'https://api.example.com/token',
      body: '',
      pinData: true
    })
  })

  it('pinData가 false이면 saveTokenIssuanceConfig가 쿠키를 제거해야 함', () => {
    saveTokenIssuanceConfig(projectId, {
      method: 'post',
      url: 'https://api.example.com/login',
      body: '{}',
      pinData: true
    })

    saveTokenIssuanceConfig(projectId, {
      method: 'post',
      url: 'https://api.example.com/login',
      body: '{}',
      pinData: false
    })

    expect(loadPinnedTokenIssuanceConfig(projectId)).toBeNull()
    expect(document.cookie).not.toContain(getCookieKey(projectId))
  })

  it('pinData가 true이면 saveTokenIssuanceConfig가 쿠키에 저장해야 함', () => {
    saveTokenIssuanceConfig(projectId, {
      method: 'post',
      url: 'https://api.example.com/login',
      body: '{"password":"secret"}',
      pinData: true
    })

    expect(document.cookie).toContain(getCookieKey(projectId))
    expect(sessionStorage.getItem(getStorageKey(projectId))).toBeTruthy()
  })
})
