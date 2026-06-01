import { describe, it, expect } from 'vitest'
import { collectFieldChanges, formatCompactValue, getFieldChangesForChange } from '@/utils/diff-value-display'
import { DIFF_TYPE } from '@/types/diff'

describe('diff-value-display', () => {
  it('Response schema $ref 변경만 추출해야 함', () => {
    const oldValue = {
      content: {
        '*/*': {
          schema: { $ref: '#/components/schemas/OldSchema' }
        }
      }
    }
    const newValue = {
      content: {
        '*/*': {
          schema: { $ref: '#/components/schemas/ApiResponseListOrganizationSpecialtyItem' }
        }
      }
    }

    const changes = collectFieldChanges(oldValue, newValue)

    expect(changes).toHaveLength(1)
    expect(changes[0].path).toBe('content.*/*.schema.$ref')
    expect(formatCompactValue(changes[0].oldValue)).toBe('#/components/schemas/OldSchema')
    expect(formatCompactValue(changes[0].newValue)).toBe('#/components/schemas/ApiResponseListOrganizationSpecialtyItem')
  })

  it('MODIFIED 변경에서 필드 diff를 반환해야 함', () => {
    const changes = getFieldChangesForChange({
      type: DIFF_TYPE.MODIFIED,
      path: 'GET /items/responses/200',
      description: 'Response 변경: 200',
      oldValue: { description: 'old' },
      newValue: { description: 'new' }
    })

    expect(changes).toEqual([
      { path: 'description', oldValue: 'old', newValue: 'new' }
    ])
  })
})
