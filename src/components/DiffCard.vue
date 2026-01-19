<template>
  <div class="diff-card" @click="handleClick">
    <div class="card-header">
      <div class="header-left">
        <span class="date">{{ formattedDate }}</span>
        <span class="summary">
          추가 {{ diff.summary.added }}건,
          삭제 {{ diff.summary.removed }}건,
          수정 {{ diff.summary.modified }}건
        </span>
      </div>
      <div class="header-right">
        <span v-if="diff.summary.breaking > 0" class="badge badge-danger">
          Breaking {{ diff.summary.breaking }}건
        </span>
        <span class="endpoint-count">
          {{ diff.endpointDiffs.length }}개 엔드포인트 변경
        </span>
      </div>
    </div>

    <div class="card-body">
      <div class="endpoints-preview">
        <div
          v-for="endpointDiff in diff.endpointDiffs.slice(0, 5)"
          :key="`${endpointDiff.method}-${endpointDiff.path}`"
          class="endpoint-item"
        >
          <span class="method" :class="`method-${endpointDiff.method.toLowerCase()}`">
            {{ endpointDiff.method.toUpperCase() }}
          </span>
          <span class="path">{{ endpointDiff.path }}</span>
          <span v-if="endpointDiff.isBreaking" class="breaking-badge">Breaking</span>
        </div>
        <div v-if="diff.endpointDiffs.length > 5" class="more">
          + {{ diff.endpointDiffs.length - 5 }}개 더...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import type { DiffResult } from '@/types/diff'

interface Props {
  diff: DiffResult
}

const props = defineProps<Props>()

const emit = defineEmits<{
  view: [diff: DiffResult]
}>()

const formattedDate = computed(() => {
  try {
    return format(new Date(props.diff.comparedAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
  } catch {
    return props.diff.comparedAt
  }
})

function handleClick() {
  emit('view', props.diff)
}
</script>

<style lang="scss" scoped>
.diff-card {
  @include card;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-lg;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: $spacing-md;
  flex-wrap: wrap;
  gap: $spacing-sm;

  .header-left {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    flex-wrap: wrap;
  }

  .date {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .summary {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .endpoint-count {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
}

.card-body {
  margin-top: $spacing-md;
}

.endpoints-preview {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.endpoint-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xs $spacing-sm;
  background: var(--bg-secondary);
  border-radius: $radius-sm;
  font-size: 0.875rem;
}

.method {
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  font-weight: 600;
  font-size: 0.75rem;
  min-width: 50px;
  text-align: center;

  &.method-get {
    background: #dbeafe;
    color: #1e40af;
  }

  &.method-post {
    background: #d1fae5;
    color: #065f46;
  }

  &.method-put {
    background: #fef3c7;
    color: #92400e;
  }

  &.method-delete {
    background: #fee2e2;
    color: #991b1b;
  }

  &.method-patch {
    background: #f3e8ff;
    color: #6b21a8;
  }
}

.path {
  flex: 1;
  color: var(--color-text-primary);
  font-family: 'Monaco', 'Courier New', monospace;
}

.breaking-badge {
  padding: $spacing-xs $spacing-sm;
  background: #fee2e2;
  color: #991b1b;
  border-radius: $radius-sm;
  font-size: 0.75rem;
  font-weight: 600;
}

.more {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  padding: $spacing-sm;
}
</style>
