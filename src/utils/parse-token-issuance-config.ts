import {
  ISSUANCE_METHODS,
  type IssuanceMethod,
  type TokenIssuanceConfig
} from '@/types/token-issuance'

function isIssuanceMethod(value: unknown): value is IssuanceMethod {
  return typeof value === 'string' && (ISSUANCE_METHODS as readonly string[]).includes(value)
}

export function parseTokenIssuanceConfig(raw: unknown): TokenIssuanceConfig | null {
  if (!raw || typeof raw !== 'object') return null

  const record = raw as Record<string, unknown>
  if (!isIssuanceMethod(record.method)) return null
  if (typeof record.url !== 'string') return null
  if (typeof record.body !== 'string') return null

  return {
    method: record.method,
    url: record.url,
    body: record.body,
    pinData: record.pinData === true
  }
}
