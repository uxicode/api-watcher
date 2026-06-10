import { computed, ref, unref, type ComputedRef, type Ref } from 'vue'
import {
  createDefaultTokenIssuanceConfig,
  type TokenIssuanceConfig
} from '@/types/token-issuance'
import { extractAccessTokenFromResponseBody } from '@/utils/extract-access-token'
import { invokeProxyRequest } from '@/utils/invoke-proxy-request'
import {
  loadTokenIssuanceConfig,
  loadTokenIssuanceConfigOrDefault,
  saveTokenIssuanceConfig
} from '@/utils/token-issuance-storage'
import { validateTokenIssuanceConfig } from '@/utils/validate-token-issuance-config'

export interface AuthConfigRef {
  bearerToken: string
  apiKey: string
  apiKeyHeader: string
}

export interface IssueBearerTokenResult {
  success: boolean
  message: string
}

export interface UseTokenIssuanceReturn {
  draft: Ref<TokenIssuanceConfig>
  savedConfig: Ref<TokenIssuanceConfig | null>
  validationErrors: ComputedRef<string[]>
  canShowIssuanceFab: ComputedRef<boolean>
  isIssuing: Ref<boolean>
  loadFromStorage: () => void
  saveSettings: () => IssueBearerTokenResult
  issueBearerToken: () => Promise<IssueBearerTokenResult>
}

const BODY_METHODS = new Set(['post', 'put', 'patch'])

function buildIssuanceHeaders(config: TokenIssuanceConfig): Record<string, string> {
  if (!BODY_METHODS.has(config.method) || !config.body.trim()) {
    return {}
  }

  return { 'Content-Type': 'application/json' }
}

function parseIssuanceBody(config: TokenIssuanceConfig): unknown {
  if (!BODY_METHODS.has(config.method) || !config.body.trim()) {
    return undefined
  }

  return JSON.parse(config.body)
}

export function useTokenIssuance(
  projectId: Ref<string> | string,
  authConfig: Ref<AuthConfigRef>
): UseTokenIssuanceReturn {
  const draft = ref<TokenIssuanceConfig>(createDefaultTokenIssuanceConfig())
  const savedConfig = ref<TokenIssuanceConfig | null>(null)
  const isIssuing = ref(false)

  const validationErrors = computed(() => {
    return validateTokenIssuanceConfig(draft.value).errors
  })

  const canShowIssuanceFab = computed(() => {
    if (!savedConfig.value?.enabled) return false
    return validateTokenIssuanceConfig(savedConfig.value).isValid
  })

  function loadFromStorage() {
    const id = unref(projectId)
    const loaded = loadTokenIssuanceConfig(id)
    savedConfig.value = loaded
    draft.value = loaded ? { ...loaded } : createDefaultTokenIssuanceConfig()
  }

  function saveSettings(): IssueBearerTokenResult {
    const validation = validateTokenIssuanceConfig(draft.value)

    if (!validation.isValid) {
      return {
        success: false,
        message: validation.errors[0] || '설정을 저장할 수 없습니다'
      }
    }

    const id = unref(projectId)
    const config = { ...draft.value }
    saveTokenIssuanceConfig(id, config)
    savedConfig.value = config

    return {
      success: true,
      message: '토큰 발급 API 설정이 저장되었습니다'
    }
  }

  async function issueBearerToken(): Promise<IssueBearerTokenResult> {
    const config = savedConfig.value ?? loadTokenIssuanceConfigOrDefault(unref(projectId))
    const validation = validateTokenIssuanceConfig(config, { requireEnabled: true })

    if (!validation.isValid) {
      return {
        success: false,
        message: validation.errors[0] || '토큰 발급 API 설정이 유효하지 않습니다'
      }
    }

    isIssuing.value = true

    try {
      const response = await invokeProxyRequest({
        method: config.method,
        url: config.url.trim(),
        headers: buildIssuanceHeaders(config),
        body: parseIssuanceBody(config)
      })

      if (response.status < 200 || response.status >= 300) {
        return {
          success: false,
          message: `발급 API 요청 실패 (${response.status} ${response.statusText})`
        }
      }

      const token = extractAccessTokenFromResponseBody(response.body)
      if (!token) {
        return {
          success: false,
          message: '응답에서 accessToken을 찾을 수 없습니다'
        }
      }

      authConfig.value.bearerToken = token

      return {
        success: true,
        message: 'Bearer token이 발급되었습니다'
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '토큰 발급 중 오류가 발생했습니다'
      return { success: false, message }
    } finally {
      isIssuing.value = false
    }
  }

  return {
    draft,
    savedConfig,
    validationErrors,
    canShowIssuanceFab,
    isIssuing,
    loadFromStorage,
    saveSettings,
    issueBearerToken
  }
}
