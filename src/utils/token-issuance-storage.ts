import {
  createDefaultTokenIssuanceConfig,
  type TokenIssuanceConfig
} from '@/types/token-issuance'
import {
  loadPinnedTokenIssuanceConfig,
  removePinnedTokenIssuanceConfig,
  savePinnedTokenIssuanceConfig
} from '@/utils/token-issuance-cookie'
import { parseTokenIssuanceConfig } from '@/utils/parse-token-issuance-config'

const STORAGE_PREFIX = 'api-watcher:token-issuance:'

export function getStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`
}

export function loadTokenIssuanceConfig(projectId: string): TokenIssuanceConfig | null {
  if (!projectId) return null

  try {
    const sessionRaw = sessionStorage.getItem(getStorageKey(projectId))
    if (sessionRaw) {
      return parseTokenIssuanceConfig(JSON.parse(sessionRaw))
    }
  } catch {
    // fall through to cookie
  }

  return loadPinnedTokenIssuanceConfig(projectId)
}

export function saveTokenIssuanceConfig(projectId: string, config: TokenIssuanceConfig): void {
  if (!projectId) return

  sessionStorage.setItem(getStorageKey(projectId), JSON.stringify(config))

  if (config.pinData) {
    savePinnedTokenIssuanceConfig(projectId, config)
    return
  }

  removePinnedTokenIssuanceConfig(projectId)
}

export function removeTokenIssuanceConfig(projectId: string): void {
  if (!projectId) return

  sessionStorage.removeItem(getStorageKey(projectId))
  removePinnedTokenIssuanceConfig(projectId)
}

export function loadTokenIssuanceConfigOrDefault(projectId: string): TokenIssuanceConfig {
  return loadTokenIssuanceConfig(projectId) ?? createDefaultTokenIssuanceConfig()
}
