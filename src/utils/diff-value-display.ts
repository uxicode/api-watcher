import { DIFF_TYPE, type DiffChange } from '@/types/diff'

export interface FieldChange {
  path: string
  oldValue?: unknown
  newValue?: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function collectFieldChanges(
  oldValue: unknown,
  newValue: unknown,
  basePath = ''
): FieldChange[] {
  if (oldValue === undefined && newValue === undefined) return []
  if (oldValue === undefined) return [{ path: basePath || '(root)', newValue }]
  if (newValue === undefined) return [{ path: basePath || '(root)', oldValue }]

  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return []

  if (!isPlainObject(oldValue) || !isPlainObject(newValue)) {
    return [{ path: basePath || '(root)', oldValue, newValue }]
  }

  const changes: FieldChange[] = []
  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)])

  for (const key of keys) {
    const path = basePath ? `${basePath}.${key}` : key
    const hasOld = key in oldValue
    const hasNew = key in newValue

    if (!hasOld && hasNew) {
      changes.push({ path, newValue: newValue[key] })
      continue
    }

    if (hasOld && !hasNew) {
      changes.push({ path, oldValue: oldValue[key] })
      continue
    }

    const nestedOld = oldValue[key]
    const nestedNew = newValue[key]

    if (JSON.stringify(nestedOld) === JSON.stringify(nestedNew)) continue

    if (isPlainObject(nestedOld) && isPlainObject(nestedNew)) {
      changes.push(...collectFieldChanges(nestedOld, nestedNew, path))
      continue
    }

    changes.push({ path, oldValue: nestedOld, newValue: nestedNew })
  }

  return changes
}

export function formatCompactValue(value: unknown): string {
  if (value === undefined) return '(없음)'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)

  if (isPlainObject(value) && typeof value.$ref === 'string') {
    return value.$ref
  }

  if (isPlainObject(value) && typeof value.type === 'string') {
    const parts = [value.type as string]
    if (typeof value.format === 'string') parts.push(`(${value.format})`)
    if (isPlainObject(value.items) && typeof value.items.$ref === 'string') {
      parts.push(`[${value.items.$ref}]`)
    }
    return parts.join(' ')
  }

  const json = JSON.stringify(value)
  if (json.length <= 100) return json
  return `${json.slice(0, 97)}...`
}

export function formatDisplayValue(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

export function getFieldChangesForChange(change: DiffChange): FieldChange[] {
  if (change.type !== DIFF_TYPE.MODIFIED) return []
  if (change.oldValue === undefined || change.newValue === undefined) return []
  return collectFieldChanges(change.oldValue, change.newValue)
}

export function shouldShowFieldDiff(change: DiffChange): boolean {
  return getFieldChangesForChange(change).length > 0
}
