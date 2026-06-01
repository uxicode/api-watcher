export interface SwaggerDocument {
  openapi?: string
  swagger?: string
  info: { title: string; version: string; description?: string }
  paths: Record<string, Record<string, unknown>>
  servers?: Array<{ url: string }>
}

export interface Project {
  id: string
  name: string
  swaggerUrl: string
  apiKey: string | null
  apiKeyHeader: string | null
  userId: string
}

export interface Snapshot {
  id: string
  projectId: string
  data: string
  version: string
  createdAt: string
}

export const DIFF_TYPE = {
  ADDED: 'added',
  REMOVED: 'removed',
  MODIFIED: 'modified'
} as const

export type DiffType = (typeof DIFF_TYPE)[keyof typeof DIFF_TYPE]

export interface DiffChange {
  type: DiffType
  path: string
  oldValue?: unknown
  newValue?: unknown
  description: string
}

export interface EndpointDiff {
  path: string
  method: string
  changes: DiffChange[]
  isBreaking: boolean
  tags?: string[]
}

export interface DiffResultPayload {
  projectId: string
  previousSnapshotId: string
  currentSnapshotId: string
  comparedAt: string
  endpointDiffs: EndpointDiff[]
  summary: {
    added: number
    removed: number
    modified: number
    breaking: number
  }
}
