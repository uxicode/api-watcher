import type { TokenIssuanceConfig } from '@/types/token-issuance'
import { parseTokenIssuanceConfig } from '@/utils/parse-token-issuance-config'

const COOKIE_PREFIX = 'api-watcher:token-issuance:'
const COOKIE_MAX_AGE_DAYS = 30

export function getCookieKey(projectId: string): string {
  return `${COOKIE_PREFIX}${projectId}`
}

function readCookie(name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string): void {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
}

export function loadPinnedTokenIssuanceConfig(projectId: string): TokenIssuanceConfig | null {
  if (!projectId) return null

  try {
    const raw = readCookie(getCookieKey(projectId))
    if (!raw) return null

    const parsed = parseTokenIssuanceConfig(JSON.parse(raw))
    if (!parsed) return null

    return { ...parsed, pinData: true }
  } catch {
    return null
  }
}

export function savePinnedTokenIssuanceConfig(projectId: string, config: TokenIssuanceConfig): void {
  if (!projectId) return

  const { pinData: _pinData, ...payload } = config
  writeCookie(getCookieKey(projectId), JSON.stringify(payload))
}

export function removePinnedTokenIssuanceConfig(projectId: string): void {
  if (!projectId) return

  deleteCookie(getCookieKey(projectId))
}
