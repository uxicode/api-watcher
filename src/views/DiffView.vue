<template>
  <div class="diff-view">
    <header class="page-header">
      <div class="header-left">
        <button class="btn-back" @click="goHome" title="홈으로">
          ← 홈
        </button>
        <div>
          <h1>변경 내역 비교</h1>
          <p class="subtitle">{{ project?.name }}</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="$router.back()">
          뒤로가기
        </button>
      </div>
    </header>

    <div v-if="!diffResult" class="loading">로딩 중...</div>

    <template v-else>
      <div class="diff-summary">
        <div class="summary-item">
          <span class="label">추가</span>
          <span class="value value-added">{{ diffResult.summary.added }}건</span>
        </div>
        <div class="summary-item">
          <span class="label">삭제</span>
          <span class="value value-removed">{{ diffResult.summary.removed }}건</span>
        </div>
        <div class="summary-item">
          <span class="label">수정</span>
          <span class="value value-modified">{{ diffResult.summary.modified }}건</span>
        </div>
        <div class="summary-item">
          <span class="label">Breaking</span>
          <span class="value value-breaking">{{ diffResult.summary.breaking }}건</span>
        </div>
      </div>

      <div class="diff-content">
        <div
          v-for="(endpointDiff, index) in diffResult.endpointDiffs"
          :key="`${endpointDiff.method}-${endpointDiff.path}`"
          class="endpoint-diff"
          :class="{ 'is-expanded': expandedEndpoints[index] }"
        >
          <div
            class="endpoint-header"
            @click="toggleEndpoint(index)"
          >
            <div class="header-left">
              <span class="toggle-icon" :class="{ 'is-expanded': expandedEndpoints[index] }">
                ▼
              </span>
              <span class="method" :class="`method-${endpointDiff.method.toLowerCase()}`">
                {{ endpointDiff.method.toUpperCase() }}
              </span>
              <span class="path">{{ endpointDiff.path }}</span>
            </div>
            <div class="header-right">
              <span v-if="endpointDiff.isBreaking" class="breaking-badge">Breaking</span>
              <span class="change-count">{{ endpointDiff.changes.length }}개 변경</span>
            </div>
          </div>

          <div
            v-show="expandedEndpoints[index]"
            class="changes-list"
          >
            <div
              v-for="(change, index) in endpointDiff.changes"
              :key="index"
              class="change-item"
              :class="`change-${change.type}`"
            >
              <div class="change-header">
                <span class="change-type">{{ changeTypeLabel[change.type] }}</span>
                <span class="change-path">{{ change.path }}</span>
              </div>
              <div class="change-description">{{ change.description }}</div>
              <div v-if="change.oldValue" class="change-value old-value">
                <div class="value-label">이전 값:</div>
                <pre>{{ formatValue(change.oldValue) }}</pre>
              </div>
              <div v-if="change.newValue" class="change-value new-value">
                <div class="value-label">새 값:</div>
                <pre>{{ formatValue(change.newValue) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project-store'
import { DIFF_TYPE } from '@/types/diff'
import type { DiffResult } from '@/types/diff'

const route = useRoute()
const router = useRouter()
const store = useProjectStore()

const projectId = route.params.projectId as string
const snapshotId = route.params.snapshotId as string

const project = computed(() => store.getProject(projectId))
const diffResult = computed(() => {
  return store.diffResults.find(
    d => d.projectId === projectId && d.currentSnapshotId === snapshotId
  )
})

// 각 endpoint의 확장 상태 관리
const expandedEndpoints = ref<boolean[]>([])

// endpoint 토글 함수
function toggleEndpoint(index: number) {
  expandedEndpoints.value[index] = !expandedEndpoints.value[index]
}

// diffResult가 변경될 때 모든 endpoint를 기본적으로 접힌 상태로 설정
function initializeExpandedState() {
  if (diffResult.value) {
    expandedEndpoints.value = new Array(diffResult.value.endpointDiffs.length).fill(false)
  }
}

const changeTypeLabel = {
  [DIFF_TYPE.ADDED]: '추가',
  [DIFF_TYPE.REMOVED]: '삭제',
  [DIFF_TYPE.MODIFIED]: '수정',
  [DIFF_TYPE.UNCHANGED]: '변경 없음'
}

function formatValue(value: unknown): string {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function goHome() {
  router.push('/')
}

onMounted(() => {
  if (!project.value || !diffResult.value) {
    router.push('/')
  } else {
    initializeExpandedState()
  }
})

// diffResult가 변경될 때마다 상태 초기화
watch(() => diffResult.value, () => {
  initializeExpandedState()
}, { immediate: true })
</script>

<style lang="scss" scoped>
.diff-view {
  min-height: 100vh;
  background: var(--bg-secondary);
  padding: $spacing-xl;
}

.page-header {
  max-width: 1400px;
  margin: 0 auto $spacing-xl;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-lg;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: $spacing-md;
  flex: 1;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: $spacing-xs;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
}

.header-actions {
  display: flex;
  gap: $spacing-md;
  align-items: center;
}

.btn-back {
  background: var(--bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-size: 0.875rem;
  margin-top: $spacing-xs;

  &:hover {
    background: var(--color-border-light);
  }
}

.diff-summary {
  max-width: 1400px;
  margin: 0 auto $spacing-xl;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: $spacing-md;
}

.summary-item {
  @include card;
  text-align: center;

  .label {
    display: block;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-bottom: $spacing-sm;
  }

  .value {
    display: block;
    font-size: 2rem;
    font-weight: 700;

    &.value-added {
      color: var(--color-success);
    }

    &.value-removed {
      color: var(--color-danger);
    }

    &.value-modified {
      color: var(--color-warning);
    }

    &.value-breaking {
      color: var(--color-danger);
    }
  }
}

.diff-content {
  max-width: 1400px;
  margin: 0 auto;
}

.endpoint-diff {
  @include card;
  margin-bottom: $spacing-lg;
  transition: all 0.2s;

  &.is-expanded {
    .endpoint-header {
      border-bottom: 1px solid var(--color-border-light);
      margin-bottom: $spacing-lg;
      padding-bottom: $spacing-md;
    }
  }
}

.endpoint-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
  cursor: pointer;
  padding: $spacing-md;
  margin: -$spacing-lg;
  margin-bottom: 0;
  border-radius: $radius-lg $radius-lg 0 0;
  transition: background-color 0.2s;

  &:hover {
    background: var(--bg-secondary);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    flex: 1;
    min-width: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    flex-shrink: 0;
  }

  .toggle-icon {
    display: inline-block;
    transition: transform 0.2s;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    width: 16px;
    text-align: center;

    &.is-expanded {
      transform: rotate(0deg);
    }

    &:not(.is-expanded) {
      transform: rotate(-90deg);
    }
  }

  .change-count {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }
}

.method {
  padding: $spacing-xs $spacing-md;
  border-radius: $radius-sm;
  font-weight: 600;
  font-size: 0.875rem;
  min-width: 60px;
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
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.breaking-badge {
  padding: $spacing-xs $spacing-md;
  background: #fee2e2;
  color: #991b1b;
  border-radius: $radius-sm;
  font-size: 0.875rem;
  font-weight: 600;
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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

.change-value {
  margin-top: $spacing-sm;
  padding: $spacing-sm;
  background: rgba(0, 0, 0, 0.05);
  border-radius: $radius-sm;

  .value-label {
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: $spacing-xs;
    color: var(--color-text-secondary);
  }

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
</style>
