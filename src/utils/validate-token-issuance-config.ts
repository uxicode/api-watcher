import {
  ISSUANCE_METHODS,
  type IssuanceMethod,
  type TokenIssuanceConfig
} from '@/types/token-issuance'

export interface TokenIssuanceValidationResult {
  isValid: boolean
  errors: string[]
}

const BODY_REQUIRED_METHODS = new Set<IssuanceMethod>(['post', 'put', 'patch'])

function isIssuanceMethod(value: string): value is IssuanceMethod {
  return (ISSUANCE_METHODS as readonly string[]).includes(value)
}

export function validateTokenIssuanceConfig(
  config: TokenIssuanceConfig,
  options: { requireEnabled?: boolean } = {}
): TokenIssuanceValidationResult {
  const errors: string[] = []

  if (options.requireEnabled && !config.enabled) {
    errors.push('토큰 발급 API가 비활성화되어 있습니다')
    return { isValid: false, errors }
  }

  if (!config.enabled) {
    return { isValid: true, errors }
  }

  if (!isIssuanceMethod(config.method)) {
    errors.push('허용되지 않는 HTTP 메서드입니다')
  }

  const url = config.url.trim()
  if (!url) {
    errors.push('URL을 입력해주세요')
  } else {
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push('URL은 http 또는 https여야 합니다')
      }
    } catch {
      errors.push('유효한 URL을 입력해주세요')
    }
  }

  if (BODY_REQUIRED_METHODS.has(config.method)) {
    const body = config.body.trim()
    if (!body) {
      errors.push('요청 Body(JSON)를 입력해주세요')
    } else {
      try {
        JSON.parse(body)
      } catch {
        errors.push('요청 Body는 유효한 JSON이어야 합니다')
      }
    }
  }

  return { isValid: errors.length === 0, errors }
}
