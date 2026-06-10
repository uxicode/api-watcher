import {
  createDefaultTokenIssuanceConfig,
  ISSUANCE_METHODS,
  type IssuanceMethod,
  type TokenIssuanceConfig
} from '@/types/token-issuance'

const STORAGE_PREFIX = 'api-watcher:token-issuance:'

export function getStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`
}

function isIssuanceMethod(value: unknown): value is IssuanceMethod {
  return typeof value === 'string' && (ISSUANCE_METHODS as readonly string[]).includes(value)
}

function normalizeConfig(raw: unknown): TokenIssuanceConfig | null {
  if (!raw || typeof raw !== 'object') return null

  const record = raw as Record<string, unknown>
  if (typeof record.enabled !== 'boolean') return null
  if (!isIssuanceMethod(record.method)) return null
  if (typeof record.url !== 'string') return null
  if (typeof record.body !== 'string') return null

  return {
    enabled: record.enabled,
    method: record.method,
    url: record.url,
    body: record.body
  }
}

export function loadTokenIssuanceConfig(projectId: string): TokenIssuanceConfig | null {
  if (!projectId) return null

  try {
    const raw = sessionStorage.getItem(getStorageKey(projectId))
    if (!raw) return null

    return normalizeConfig(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveTokenIssuanceConfig(projectId: string, config: TokenIssuanceConfig): void {
  if (!projectId) return

  sessionStorage.setItem(getStorageKey(projectId), JSON.stringify(config))
}

export function removeTokenIssuanceConfig(projectId: string): void {
  if (!projectId) return

  sessionStorage.removeItem(getStorageKey(projectId))
}

export function loadTokenIssuanceConfigOrDefault(projectId: string): TokenIssuanceConfig {
  return loadTokenIssuanceConfig(projectId) ?? createDefaultTokenIssuanceConfig()
}
