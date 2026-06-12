import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { clearCookieStore } from '@/test/setup'
import { useTokenIssuance } from '@/composables/use-token-issuance'
import { getStorageKey } from '@/utils/token-issuance-storage'

vi.mock('@/utils/invoke-proxy-request', () => ({
  invokeProxyRequest: vi.fn()
}))

vi.mock('@/utils/extract-access-token', () => ({
  extractAccessTokenFromResponseBody: vi.fn()
}))

import { invokeProxyRequest } from '@/utils/invoke-proxy-request'
import { extractAccessTokenFromResponseBody } from '@/utils/extract-access-token'

const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

const validConfig = {
  method: 'post' as const,
  url: 'https://api.example.com/login',
  body: '{"email":"test@example.com","password":"secret"}',
  pinData: false
}

describe('use-token-issuance', () => {
  const projectId = 'project-abc'
  const authConfig = ref({
    bearerToken: '',
    apiKey: '',
    apiKeyHeader: 'X-API-Key'
  })

  beforeEach(() => {
    sessionStorage.clear()
    clearCookieStore()
    authConfig.value.bearerToken = ''
    vi.clearAllMocks()
  })

  it('저장 후 FAB 표시 조건을 만족해야 함', () => {
    const issuance = useTokenIssuance(projectId, authConfig)

    issuance.draft.value = { ...validConfig }

    const saveResult = issuance.saveSettings()
    expect(saveResult.success).toBe(true)
    expect(issuance.canShowIssuanceFab.value).toBe(true)
    expect(sessionStorage.getItem(getStorageKey(projectId))).toBeTruthy()
  })

  it('loadFromStorage로 draft와 savedConfig를 복원해야 함', () => {
    const issuance = useTokenIssuance(projectId, authConfig)
    issuance.draft.value = {
      method: 'get',
      url: 'https://api.example.com/token',
      body: '',
      pinData: false
    }
    issuance.saveSettings()

    const reloaded = useTokenIssuance(projectId, authConfig)
    reloaded.loadFromStorage()

    expect(reloaded.savedConfig.value?.method).toBe('get')
    expect(reloaded.draft.value.url).toBe('https://api.example.com/token')
    expect(reloaded.canShowIssuanceFab.value).toBe(true)
  })

  it('issueBearerToken 성공 시 bearerToken을 설정해야 함', async () => {
    vi.mocked(invokeProxyRequest).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: JSON.stringify({ accessToken: jwtToken })
    })
    vi.mocked(extractAccessTokenFromResponseBody).mockReturnValue(jwtToken)

    const issuance = useTokenIssuance(projectId, authConfig)
    issuance.draft.value = { ...validConfig, body: '{"email":"test@example.com"}' }
    issuance.saveSettings()

    const result = await issuance.issueBearerToken()

    expect(result.success).toBe(true)
    expect(authConfig.value.bearerToken).toBe(jwtToken)
  })

  it('issueBearerToken 실패 시 에러 메시지를 반환해야 함', async () => {
    vi.mocked(invokeProxyRequest).mockResolvedValue({
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      body: '{"message":"invalid credentials"}'
    })

    const issuance = useTokenIssuance(projectId, authConfig)
    issuance.draft.value = { ...validConfig, body: '{"email":"test@example.com"}' }
    issuance.saveSettings()

    const result = await issuance.issueBearerToken()

    expect(result.success).toBe(false)
    expect(result.message).toContain('401')
  })

  it('accessToken이 없으면 실패해야 함', async () => {
    vi.mocked(invokeProxyRequest).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: '{"token":"no-access-token"}'
    })
    vi.mocked(extractAccessTokenFromResponseBody).mockReturnValue(null)

    const issuance = useTokenIssuance(projectId, authConfig)
    issuance.draft.value = { ...validConfig, body: '{"email":"test@example.com"}' }
    issuance.saveSettings()

    const result = await issuance.issueBearerToken()

    expect(result.success).toBe(false)
    expect(result.message).toContain('accessToken')
  })
})
