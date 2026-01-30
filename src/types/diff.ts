export const DIFF_TYPE = {
  ADDED: 'added',
  REMOVED: 'removed',
  MODIFIED: 'modified',
  UNCHANGED: 'unchanged'
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

export interface DiffResult {
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
