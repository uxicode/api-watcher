import type { TokenIssuanceConfig } from '@/types/token-issuance'
import { parseTokenIssuanceConfig } from '@/utils/parse-token-issuance-config'

const PINNED_PREFIX = 'api-watcher:token-issuance-pinned:'
const LEGACY_COOKIE_PREFIX = 'api-watcher:token-issuance:'

export function getPinnedStorageKey(projectId: string): string {
  return `${PINNED_PREFIX}${projectId}`
}

function getLegacyCookieKey(projectId: string): string {
  return `${LEGACY_COOKIE_PREFIX}${projectId}`
}

function readLegacyCookie(name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function deleteLegacyCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
}

function loadLegacyCookieConfig(projectId: string): TokenIssuanceConfig | null {
  try {
    const raw = readLegacyCookie(getLegacyCookieKey(projectId))
    if (!raw) return null

    const parsed = parseTokenIssuanceConfig(JSON.parse(raw))
    if (!parsed) return null

    return { ...parsed, pinData: true }
  } catch {
    return null
  }
}

function migrateLegacyCookieToLocalStorage(projectId: string): TokenIssuanceConfig | null {
  const legacy = loadLegacyCookieConfig(projectId)
  if (!legacy) return null

  savePinnedTokenIssuanceConfig(projectId, legacy)
  deleteLegacyCookie(getLegacyCookieKey(projectId))
  return legacy
}

export function loadPinnedTokenIssuanceConfig(projectId: string): TokenIssuanceConfig | null {
  if (!projectId) return null

  try {
    const raw = localStorage.getItem(getPinnedStorageKey(projectId))
    if (raw) {
      const parsed = parseTokenIssuanceConfig(JSON.parse(raw))
      if (!parsed) return null
      return { ...parsed, pinData: true }
    }
  } catch {
    // fall through to legacy cookie migration
  }

  return migrateLegacyCookieToLocalStorage(projectId)
}

export function savePinnedTokenIssuanceConfig(projectId: string, config: TokenIssuanceConfig): void {
  if (!projectId) return

  const { pinData: _pinData, ...payload } = config
  localStorage.setItem(getPinnedStorageKey(projectId), JSON.stringify(payload))
  deleteLegacyCookie(getLegacyCookieKey(projectId))
}

export function removePinnedTokenIssuanceConfig(projectId: string): void {
  if (!projectId) return

  localStorage.removeItem(getPinnedStorageKey(projectId))
  deleteLegacyCookie(getLegacyCookieKey(projectId))
}

// @deprecated 테스트·하위 호환용 alias
export const getCookieKey = getPinnedStorageKey
