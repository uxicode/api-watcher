export interface Project {
  id: string
  name: string
  swaggerUrl: string
  apiKey?: string
  apiKeyHeader?: string
  createdAt: string
  updatedAt: string
  lastCheckedAt?: string
  isActive: boolean
}

export interface Snapshot {
  id: string
  projectId: string
  createdAt: string
  data: string // 압축된 JSON 문자열
  version: string
}

export interface ApiEndpoint {
  path: string
  method: string
  summary?: string
  parameters?: unknown[]
  requestBody?: unknown
  responses?: unknown
}
