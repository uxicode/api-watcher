import { vi } from 'vitest'

function createStorageMock() {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
}

Object.defineProperty(window, 'localStorage', {
  value: createStorageMock()
})

Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock()
})

let cookieStore: Record<string, string> = {}

function buildCookieString(): string {
  return Object.entries(cookieStore)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ')
}

Object.defineProperty(document, 'cookie', {
  configurable: true,
  get() {
    return buildCookieString()
  },
  set(value: string) {
    const [pair, ...attributes] = value.split(';').map((part) => part.trim())
    const separatorIndex = pair.indexOf('=')
    if (separatorIndex === -1) return

    const name = pair.slice(0, separatorIndex)
    const rawValue = pair.slice(separatorIndex + 1)
    const decodedValue = decodeURIComponent(rawValue)

    if (attributes.some((attribute) => attribute === 'max-age=0')) {
      delete cookieStore[name]
      return
    }

    cookieStore[name] = decodedValue
  }
})

export function clearCookieStore() {
  cookieStore = {}
}

// Clipboard API 모킹
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined)
  },
  writable: true
})
