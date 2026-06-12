import { describe, it, expect, beforeEach } from 'vitest'
import { createDefaultTokenIssuanceConfig } from '@/types/token-issuance'
import {
  getPinnedStorageKey,
  loadPinnedTokenIssuanceConfig,
  removePinnedTokenIssuanceConfig,
  savePinnedTokenIssuanceConfig
} from '@/utils/token-issuance-pinned-storage'
import {
  getStorageKey,
  loadTokenIssuanceConfig,
  saveTokenIssuanceConfig
} from '@/utils/token-issuance-storage'

describe('token-issuance-pinned-storage', () => {
  const projectId = 'project-1'

  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    document.cookie = ''
  })

  it('고정 저장 시 localStorage에 설정을 저장해야 함', () => {
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
    expect(localStorage.getItem(getPinnedStorageKey(projectId))).toBeTruthy()
  })

  it('고정 해제 시 localStorage를 삭제해야 함', () => {
    savePinnedTokenIssuanceConfig(projectId, {
      ...createDefaultTokenIssuanceConfig(),
      url: 'https://api.example.com/login',
      body: '{}',
      pinData: true
    })

    removePinnedTokenIssuanceConfig(projectId)
    expect(loadPinnedTokenIssuanceConfig(projectId)).toBeNull()
  })

  it('sessionStorage가 없을 때 localStorage에서 불러와야 함', () => {
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

  it('pinData가 false이면 saveTokenIssuanceConfig가 고정 저장소를 제거해야 함', () => {
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
    expect(localStorage.getItem(getPinnedStorageKey(projectId))).toBeNull()
  })

  it('pinData가 true이면 saveTokenIssuanceConfig가 localStorage에 저장해야 함', () => {
    saveTokenIssuanceConfig(projectId, {
      method: 'post',
      url: 'https://api.example.com/login',
      body: '{"password":"secret"}',
      pinData: true
    })

    expect(localStorage.getItem(getPinnedStorageKey(projectId))).toBeTruthy()
    expect(sessionStorage.getItem(getStorageKey(projectId))).toBeTruthy()
  })

  it('legacy cookie가 있으면 localStorage로 마이그레이션해야 함', () => {
    const legacyKey = `api-watcher:token-issuance:${projectId}`
    document.cookie = `${legacyKey}=${encodeURIComponent(JSON.stringify({
      method: 'post',
      url: 'https://api.example.com/login',
      body: '{"email":"legacy@example.com"}'
    }))}; path=/; max-age=3600; SameSite=Lax`

    expect(loadTokenIssuanceConfig(projectId)).toEqual({
      method: 'post',
      url: 'https://api.example.com/login',
      body: '{"email":"legacy@example.com"}',
      pinData: true
    })
    expect(localStorage.getItem(getPinnedStorageKey(projectId))).toBeTruthy()
  })
})
