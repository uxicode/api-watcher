<template>
  <div class="change-item" :class="`change-${change.type}`">
    <div class="change-header">
      <span class="change-type">{{ changeTypeLabel[change.type] }}</span>
      <span class="change-path">{{ change.path }}</span>
    </div>

    <div class="change-description">{{ change.description }}</div>

    <div v-if="hasFieldDiff" class="field-diff-list">
      <div class="value-label">변경된 필드 ({{ fieldChanges.length }}개)</div>
      <div
        v-for="field in fieldChanges"
        :key="field.path"
        class="field-diff-row"
      >
        <code class="field-path">{{ field.path }}</code>
        <div class="field-diff-values">
          <span v-if="field.oldValue !== undefined" class="field-old">
            {{ formatCompactValue(field.oldValue) }}
          </span>
          <span
            v-if="field.oldValue !== undefined && field.newValue !== undefined"
            class="field-arrow"
          >
            →
          </span>
          <span v-if="field.newValue !== undefined" class="field-new">
            {{ formatCompactValue(field.newValue) }}
          </span>
        </div>
      </div>
    </div>

    <template v-else>
      <div v-if="change.oldValue !== undefined" class="change-value old-value">
        <div class="value-label">이전 값:</div>
        <pre>{{ formatDisplayValue(change.oldValue) }}</pre>
      </div>
      <div v-if="change.newValue !== undefined" class="change-value new-value">
        <div class="value-label">새 값:</div>
        <pre>{{ formatDisplayValue(change.newValue) }}</pre>
      </div>
    </template>

    <details v-if="hasFieldDiff" class="full-value-details">
      <summary>전체 값 보기</summary>
      <div v-if="change.oldValue !== undefined" class="change-value old-value">
        <div class="value-label">이전 값:</div>
        <pre>{{ formatDisplayValue(change.oldValue) }}</pre>
      </div>
      <div v-if="change.newValue !== undefined" class="change-value new-value">
        <div class="value-label">새 값:</div>
        <pre>{{ formatDisplayValue(change.newValue) }}</pre>
      </div>
    </details>

    <div
      v-if="change.type !== DIFF_TYPE.REMOVED && change.newValue && typescriptType"
      class="typescript-type"
    >
      <div class="type-header">
        <span class="type-label">TypeScript 타입:</span>
        <button
          class="btn-copy"
          type="button"
          title="클립보드에 복사"
          @click="copyToClipboard(typescriptType)"
        >
          📋 복사
        </button>
      </div>
      <pre class="type-code">{{ typescriptType }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DIFF_TYPE } from '@/types/diff'
import type { DiffChange, DiffType, EndpointDiff } from '@/types/diff'
import type { SwaggerSchema } from '@/types/swagger'
import { generateTypeScriptType } from '@/utils/schema-to-typescript'
import {
  formatCompactValue,
  formatDisplayValue,
  getFieldChangesForChange
} from '@/utils/diff-value-display'

interface Props {
  change: DiffChange
  endpointDiff: EndpointDiff
}

const props = defineProps<Props>()

const changeTypeLabel: Record<DiffType, string> = {
  [DIFF_TYPE.ADDED]: '추가',
  [DIFF_TYPE.REMOVED]: '삭제',
  [DIFF_TYPE.MODIFIED]: '수정',
  [DIFF_TYPE.UNCHANGED]: '변경 없음'
}

const fieldChanges = computed(() => getFieldChangesForChange(props.change))
const hasFieldDiff = computed(() => fieldChanges.value.length > 0)

const typescriptType = computed(() => getTypeScriptType(props.change, props.endpointDiff))

function getTypeScriptType(change: DiffChange, endpointDiff: EndpointDiff): string {
  if (!change.newValue || typeof change.newValue !== 'object') return ''

  try {
    const responseMatch = change.path.match(/responses\/(\d+)/)
    if (responseMatch) {
      const statusCode = responseMatch[1]
      const responseValue = change.newValue as {
        content?: Record<string, { schema?: SwaggerSchema }>
        description?: string
        schema?: SwaggerSchema
      }

      if (responseValue.content) {
        const jsonContent = responseValue.content['application/json']
          ?? responseValue.content['*/*']
          ?? Object.values(responseValue.content)[0]

        if (jsonContent?.schema) {
          return generateTypeScriptType(
            jsonContent.schema,
            statusCode,
            endpointDiff.path,
            endpointDiff.method,
            'Response'
          )
        }
      }

      if (responseValue.schema) {
        return generateTypeScriptType(
          responseValue.schema,
          statusCode,
          endpointDiff.path,
          endpointDiff.method,
          'Response'
        )
      }

      return ''
    }

    if (change.path.includes('requestBody')
      || (change.type === DIFF_TYPE.ADDED && (change.newValue as { requestBody?: unknown })?.requestBody)) {
      let requestBodyValue: {
        content?: Record<string, { schema?: SwaggerSchema }>
        required?: boolean
      }

      if (change.path.includes('requestBody')) {
        requestBodyValue = change.newValue as typeof requestBodyValue
      } else {
        const endpointValue = change.newValue as { requestBody?: typeof requestBodyValue }
        if (!endpointValue.requestBody) return ''
        requestBodyValue = endpointValue.requestBody
      }

      if (requestBodyValue.content) {
        const jsonContent = requestBodyValue.content['application/json']
          ?? requestBodyValue.content['*/*']

        if (jsonContent?.schema) {
          return generateTypeScriptType(
            jsonContent.schema,
            '',
            endpointDiff.path,
            endpointDiff.method,
            'Request'
          )
        }
      }

      return ''
    }

    const paramMatch = change.path.match(/parameters\/([^/\s]+)/)
    if (paramMatch) {
      const paramName = paramMatch[1]
      const paramValue = change.newValue as { schema?: SwaggerSchema }

      if (paramValue.schema) {
        return generateTypeScriptType(
          paramValue.schema,
          paramName,
          endpointDiff.path,
          endpointDiff.method,
          'Param'
        )
      }
    }
  } catch (error) {
    console.error('TypeScript 타입 생성 실패:', error, change)
    return ''
  }

  return ''
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    alert('클립보드에 복사되었습니다!')
  } catch (err) {
    console.error('복사 실패:', err)
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      alert('클립보드에 복사되었습니다!')
    } catch {
      alert('복사에 실패했습니다.')
    }
    document.body.removeChild(textarea)
  }
}
</script>

<style lang="scss" scoped>
.change-item {
  padding: $spacing-md;
  border-radius: $radius-md;
  border-left: 4px solid;

  &.change-added {
    background: #d1fae5;
    border-color: var(--color-success);
  }

  &.change-removed {
    background: #fee2e2;
    border-color: var(--color-danger);
  }

  &.change-modified {
    background: #fef3c7;
    border-color: var(--color-warning);
  }
}

.change-header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-sm;
}

.change-type {
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.1);
}

.change-path {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.change-description {
  margin-bottom: $spacing-sm;
  font-weight: 500;
  color: var(--color-text-primary);
}

.field-diff-list {
  margin-top: $spacing-sm;
  padding: $spacing-sm;
  background: rgba(255, 255, 255, 0.45);
  border-radius: $radius-sm;
}

.field-diff-row {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-sm 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.field-path {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  word-break: break-all;
}

.field-diff-values {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-xs;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.8125rem;
}

.field-old {
  color: #991b1b;
  background: rgba(254, 226, 226, 0.8);
  padding: 2px 6px;
  border-radius: $radius-sm;
  word-break: break-all;
}

.field-arrow {
  color: var(--color-text-secondary);
}

.field-new {
  color: #166534;
  background: rgba(220, 252, 231, 0.9);
  padding: 2px 6px;
  border-radius: $radius-sm;
  word-break: break-all;
}

.full-value-details {
  margin-top: $spacing-sm;

  summary {
    cursor: pointer;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    user-select: none;
  }
}

.change-value,
.field-diff-list {
  .value-label {
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: $spacing-xs;
    color: var(--color-text-secondary);
  }
}

.change-value {
  margin-top: $spacing-sm;
  padding: $spacing-sm;
  background: rgba(0, 0, 0, 0.05);
  border-radius: $radius-sm;

  pre {
    margin: 0;
    font-size: 0.75rem;
    font-family: 'Monaco', 'Courier New', monospace;
    white-space: pre-wrap;
    word-break: break-all;
  }

  &.old-value {
    border-left: 3px solid var(--color-danger);
  }

  &.new-value {
    border-left: 3px solid var(--color-success);
  }
}

.typescript-type {
  margin-top: $spacing-md;
  padding: $spacing-md;
  background: #1e293b;
  border-radius: $radius-md;
  border: 1px solid #334155;

  .type-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-sm;
  }

  .type-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #cbd5e1;
  }

  .btn-copy {
    padding: $spacing-xs $spacing-sm;
    background: #334155;
    color: #cbd5e1;
    border: 1px solid #475569;
    border-radius: $radius-sm;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #475569;
      color: white;
    }
  }

  .type-code {
    margin: 0;
    padding: $spacing-md;
    background: #0f172a;
    border-radius: $radius-sm;
    font-size: 0.875rem;
    font-family: 'Monaco', 'Courier New', monospace;
    color: #e2e8f0;
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
    line-height: 1.6;
  }
}
</style>
