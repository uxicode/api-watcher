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
        <!-- Breaking Change 그룹 -->
        <div v-if="groupedDiffs.breaking.length > 0" class="diff-group">
          <div class="group-header breaking-header">
            <h2>⚠️ Breaking Changes</h2>
            <span class="group-count">{{ groupedDiffs.breaking.length }}개</span>
          </div>
          <div
            v-for="endpointDiff in groupedDiffs.breaking"
            :key="`breaking-${endpointDiff.method}-${endpointDiff.path}`"
            class="endpoint-diff"
            :class="{ 'is-expanded': expandedEndpoints[getEndpointIndex(endpointDiff)] }"
          >
            <div
              class="endpoint-header"
              @click="toggleEndpoint(getEndpointIndex(endpointDiff))"
            >
              <div class="header-left">
                <span class="toggle-icon" :class="{ 'is-expanded': expandedEndpoints[getEndpointIndex(endpointDiff)] }">
                  ▼
                </span>
                <span class="method" :class="`method-${endpointDiff.method.toLowerCase()}`">
                  {{ endpointDiff.method.toUpperCase() }}
                </span>
                <span class="path">{{ endpointDiff.path }} </span>
                <div v-if="endpointDiff.tags && endpointDiff.tags.length > 0" class="endpoint-tags">
                  <span
                    v-for="tag in endpointDiff.tags"
                    :key="tag"
                    class="tag-badge"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
              <div class="header-right">
                <span class="breaking-badge">Breaking</span>
                <span class="change-count">{{ endpointDiff.changes.length }}개 변경</span>
              </div>
            </div>
            <div
              v-show="expandedEndpoints[getEndpointIndex(endpointDiff)]"
              class="changes-list"
            >
              <div
                v-for="(change, changeIndex) in endpointDiff.changes"
                :key="changeIndex"
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
                <div
                  v-if="change.type !== DIFF_TYPE.REMOVED && change.newValue && getTypeScriptType(change, endpointDiff)"
                  class="typescript-type"
                >
                  <div class="type-header">
                    <span class="type-label">TypeScript 타입:</span>
                    <button
                      class="btn-copy"
                      @click="copyToClipboard(getTypeScriptType(change, endpointDiff))"
                      title="클립보드에 복사"
                    >
                      📋 복사
                    </button>
                  </div>
                  <pre class="type-code">{{ getTypeScriptType(change, endpointDiff) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 추가 그룹 -->
        <div v-if="groupedDiffs.added.length > 0" class="diff-group">
          <div class="group-header added-header">
            <h2>➕ 추가된 API</h2>
            <span class="group-count">{{ groupedDiffs.added.length }}개</span>
          </div>
          <div
            v-for="endpointDiff in groupedDiffs.added"
            :key="`added-${endpointDiff.method}-${endpointDiff.path}`"
            class="endpoint-diff"
            :class="{ 'is-expanded': expandedEndpoints[getEndpointIndex(endpointDiff)] }"
          >
            <div
              class="endpoint-header"
              @click="toggleEndpoint(getEndpointIndex(endpointDiff))"
            >
              <div class="header-left">
                <span class="toggle-icon" :class="{ 'is-expanded': expandedEndpoints[getEndpointIndex(endpointDiff)] }">
                  ▼
                </span>
                <span class="method" :class="`method-${endpointDiff.method.toLowerCase()}`">
                  {{ endpointDiff.method.toUpperCase() }}
                </span>
                <span class="path">{{ endpointDiff.path }}</span>
                <div v-if="endpointDiff.tags && endpointDiff.tags.length > 0" class="endpoint-tags">
                  <span
                    v-for="tag in endpointDiff.tags"
                    :key="tag"
                    class="tag-badge"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
              <div class="header-right">
                <span class="change-count">{{ endpointDiff.changes.length }}개 변경</span>
              </div>
            </div>
            <div
              v-show="expandedEndpoints[getEndpointIndex(endpointDiff)]"
              class="changes-list"
            >
              <div
                v-for="(change, changeIndex) in endpointDiff.changes"
                :key="changeIndex"
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
                <div
                  v-if="change.type !== DIFF_TYPE.REMOVED && change.newValue && getTypeScriptType(change, endpointDiff)"
                  class="typescript-type"
                >
                  <div class="type-header">
                    <span class="type-label">TypeScript 타입:</span>
                    <button
                      class="btn-copy"
                      @click="copyToClipboard(getTypeScriptType(change, endpointDiff))"
                      title="클립보드에 복사"
                    >
                      📋 복사
                    </button>
                  </div>
                  <pre class="type-code">{{ getTypeScriptType(change, endpointDiff) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 삭제 그룹 -->
        <div v-if="groupedDiffs.removed.length > 0" class="diff-group">
          <div class="group-header removed-header">
            <h2>➖ 삭제된 API</h2>
            <span class="group-count">{{ groupedDiffs.removed.length }}개</span>
          </div>
          <div
            v-for="endpointDiff in groupedDiffs.removed"
            :key="`removed-${endpointDiff.method}-${endpointDiff.path}`"
            class="endpoint-diff"
            :class="{ 'is-expanded': expandedEndpoints[getEndpointIndex(endpointDiff)] }"
          >
            <div
              class="endpoint-header"
              @click="toggleEndpoint(getEndpointIndex(endpointDiff))"
            >
              <div class="header-left">
                <span class="toggle-icon" :class="{ 'is-expanded': expandedEndpoints[getEndpointIndex(endpointDiff)] }">
                  ▼
                </span>
                <span class="method" :class="`method-${endpointDiff.method.toLowerCase()}`">
                  {{ endpointDiff.method.toUpperCase() }}
                </span>
                <span class="path">{{ endpointDiff.path }}</span>
                <div v-if="endpointDiff.tags && endpointDiff.tags.length > 0" class="endpoint-tags">
                  <span
                    v-for="tag in endpointDiff.tags"
                    :key="tag"
                    class="tag-badge"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
              <div class="header-right">
                <span class="change-count">{{ endpointDiff.changes.length }}개 변경</span>
              </div>
            </div>
            <div
              v-show="expandedEndpoints[getEndpointIndex(endpointDiff)]"
              class="changes-list"
            >
              <div
                v-for="(change, changeIndex) in endpointDiff.changes"
                :key="changeIndex"
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
                <div
                  v-if="change.type !== DIFF_TYPE.REMOVED && change.newValue && getTypeScriptType(change, endpointDiff)"
                  class="typescript-type"
                >
                  <div class="type-header">
                    <span class="type-label">TypeScript 타입:</span>
                    <button
                      class="btn-copy"
                      @click="copyToClipboard(getTypeScriptType(change, endpointDiff))"
                      title="클립보드에 복사"
                    >
                      📋 복사
                    </button>
                  </div>
                  <pre class="type-code">{{ getTypeScriptType(change, endpointDiff) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 수정 그룹 -->
        <div v-if="groupedDiffs.modified.length > 0" class="diff-group">
          <div class="group-header modified-header">
            <h2>✏️ 수정된 API</h2>
            <span class="group-count">{{ groupedDiffs.modified.length }}개</span>
          </div>
          <div
            v-for="endpointDiff in groupedDiffs.modified"
            :key="`modified-${endpointDiff.method}-${endpointDiff.path}`"
            class="endpoint-diff"
            :class="{ 'is-expanded': expandedEndpoints[getEndpointIndex(endpointDiff)] }"
          >
            <div
              class="endpoint-header"
              @click="toggleEndpoint(getEndpointIndex(endpointDiff))"
            >
              <div class="header-left">
                <span class="toggle-icon" :class="{ 'is-expanded': expandedEndpoints[getEndpointIndex(endpointDiff)] }">
                  ▼
                </span>
                <span class="method" :class="`method-${endpointDiff.method.toLowerCase()}`">
                  {{ endpointDiff.method.toUpperCase() }}
                </span>
                <span class="path">{{ endpointDiff.path }}</span>
                <div v-if="endpointDiff.tags && endpointDiff.tags.length > 0" class="endpoint-tags">
                  <span
                    v-for="tag in endpointDiff.tags"
                    :key="tag"
                    class="tag-badge"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
              <div class="header-right">
                <span class="change-count">{{ endpointDiff.changes.length }}개 변경</span>
              </div>
            </div>
            <div
              v-show="expandedEndpoints[getEndpointIndex(endpointDiff)]"
              class="changes-list"
            >
              <div
                v-for="(change, changeIndex) in endpointDiff.changes"
                :key="changeIndex"
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
                <div
                  v-if="change.type !== DIFF_TYPE.REMOVED && change.newValue && getTypeScriptType(change, endpointDiff)"
                  class="typescript-type"
                >
                  <div class="type-header">
                    <span class="type-label">TypeScript 타입:</span>
                    <button
                      class="btn-copy"
                      @click="copyToClipboard(getTypeScriptType(change, endpointDiff))"
                      title="클립보드에 복사"
                    >
                      📋 복사
                    </button>
                  </div>
                  <pre class="type-code">{{ getTypeScriptType(change, endpointDiff) }}</pre>
                </div>
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
import { useAuthStore } from '@/stores/auth-store'
import { DIFF_TYPE } from '@/types/diff'
import type { EndpointDiff, DiffChange } from '@/types/diff'
import { generateTypeScriptType } from '@/utils/schema-to-typescript'
import type { SwaggerSchema } from '@/types/swagger'

const route = useRoute()
const router = useRouter()
const store = useProjectStore()
const authStore = useAuthStore()

const projectId = route.params.projectId as string
const snapshotId = route.params.snapshotId as string

const project = computed(() => store.getProject(projectId))
const diffResult = computed(() => {
  return store.diffResults.find(
    d => d.projectId === projectId && d.currentSnapshotId === snapshotId
  )
})

// 현재 스냅샷에서 Swagger 데이터 가져오기
const currentSnapshot = computed(() => {
  if (!diffResult.value) return null
  return store.snapshots.find(s => s.id === diffResult.value!.currentSnapshotId)
})

// 각 endpointDiff에 tags 정보 추가
const endpointDiffsWithTags = computed(() => {
  if (!diffResult.value || !currentSnapshot.value) {
    return diffResult.value?.endpointDiffs || []
  }

  try {
    const swaggerData = JSON.parse(currentSnapshot.value.data)
    const swaggerPaths = swaggerData.paths || {}

    return diffResult.value.endpointDiffs.map(endpointDiff => {
      // 현재 스냅샷에서 해당 엔드포인트의 tags 추출
      const pathData = swaggerPaths[endpointDiff.path]
      if (pathData && pathData[endpointDiff.method.toLowerCase()]) {
        const operation = pathData[endpointDiff.method.toLowerCase()]
        const tags = operation?.tags && Array.isArray(operation.tags) && operation.tags.length > 0
          ? operation.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
          : undefined

        return {
          ...endpointDiff,
          tags
        }
      }

      // 이전 스냅샷에서 tags 추출 시도 (현재 스냅샷에 없는 경우)
      const previousSnapshot = store.snapshots.find(s => s.id === diffResult.value!.previousSnapshotId)
      if (previousSnapshot) {
        try {
          const prevSwaggerData = JSON.parse(previousSnapshot.data)
          const prevPathData = prevSwaggerData.paths?.[endpointDiff.path]
          if (prevPathData && prevPathData[endpointDiff.method.toLowerCase()]) {
            const prevOperation = prevPathData[endpointDiff.method.toLowerCase()]
            const tags = prevOperation?.tags && Array.isArray(prevOperation.tags) && prevOperation.tags.length > 0
              ? prevOperation.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
              : undefined

            if (tags) {
              return {
                ...endpointDiff,
                tags
              }
            }
          }
        } catch {
          // 이전 스냅샷 파싱 실패 시 무시
        }
      }

      return endpointDiff
    })
  } catch (error) {
    console.error('Failed to parse swagger data for tags:', error)
    return diffResult.value.endpointDiffs
  }
})

// 각 endpoint의 확장 상태 관리
const expandedEndpoints = ref<boolean[]>([])

// endpoint 토글 함수
function toggleEndpoint(index: number) {
  expandedEndpoints.value[index] = !expandedEndpoints.value[index]
}

// diffResult가 변경될 때 모든 endpoint를 기본적으로 접힌 상태로 설정
function initializeExpandedState() {
  expandedEndpoints.value = new Array(endpointDiffsWithTags.value.length).fill(false)
}

// 카테고리별로 그룹화 (tags 포함된 endpointDiffs 사용)
const groupedDiffs = computed(() => {
  const diffs = endpointDiffsWithTags.value
  
  if (diffs.length === 0) {
    return {
      breaking: [],
      added: [],
      removed: [],
      modified: []
    }
  }

  const breaking: EndpointDiff[] = []
  const added: EndpointDiff[] = []
  const removed: EndpointDiff[] = []
  const modified: EndpointDiff[] = []

  for (const endpointDiff of diffs) {
    // Breaking Change는 최우선
    if (endpointDiff.isBreaking) {
      breaking.push(endpointDiff)
      continue
    }

    // changes 타입 확인
    const hasRemoved = endpointDiff.changes.some(c => c.type === DIFF_TYPE.REMOVED)
    const hasAdded = endpointDiff.changes.some(c => c.type === DIFF_TYPE.ADDED)
    const hasModified = endpointDiff.changes.some(c => c.type === DIFF_TYPE.MODIFIED)

    // 우선순위: REMOVED > ADDED > MODIFIED
    if (hasRemoved) {
      removed.push(endpointDiff)
    } else if (hasAdded) {
      added.push(endpointDiff)
    } else if (hasModified) {
      modified.push(endpointDiff)
    }
  }

  return { breaking, added, removed, modified }
})

// endpointDiff의 원본 인덱스 찾기 (endpointDiffsWithTags 기준)
function getEndpointIndex(endpointDiff: EndpointDiff): number {
  return endpointDiffsWithTags.value.findIndex(
    d => d.method === endpointDiff.method && d.path === endpointDiff.path
  )
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

function getTypeScriptType(change: DiffChange, endpointDiff: EndpointDiff): string {
  if (!change.newValue || typeof change.newValue !== 'object') {
    return ''
  }

  // 디버깅: change 객체 구조 확인
  // if (import.meta.env.DEV) {
  //   console.log('getTypeScriptType:', {
  //     path: change.path,
  //     type: change.type,
  //     hasNewValue: !!change.newValue,
  //     newValueKeys: change.newValue ? Object.keys(change.newValue as object) : []
  //   })
  // }

  try {
    // Response 변경사항 처리 (path 형식: "GET /pets/responses/200")
    const responseMatch = change.path.match(/responses\/(\d+)/)
    if (responseMatch) {
      const statusCode = responseMatch[1]
      const responseValue = change.newValue as {
        content?: {
          [contentType: string]: {
            schema?: SwaggerSchema
          }
        }
        description?: string
        schema?: SwaggerSchema // 직접 schema가 있는 경우 (레거시)
      }

      // content 구조가 있는 경우 (일반적인 경우)
      if (responseValue.content) {
        const jsonContent = responseValue.content['application/json'] || 
                           responseValue.content['*/*'] ||
                           Object.values(responseValue.content)[0] // 첫 번째 content 타입 사용
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
      
      // 직접 schema가 있는 경우 (레거시 또는 간단한 구조)
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

    // Request Body 변경사항 처리
    // path 형식: "POST /pets/requestBody" 또는 전체 endpoint 추가 시 "POST /pets"
    if (change.path.includes('requestBody') || 
        (change.type === DIFF_TYPE.ADDED && (change.newValue as { requestBody?: unknown })?.requestBody)) {
      let requestBodyValue: {
        content?: {
          [contentType: string]: {
            schema?: SwaggerSchema
          }
        }
        required?: boolean
      }

      // 전체 endpoint 추가인 경우 requestBody 추출
      if (change.path.includes('requestBody')) {
        requestBodyValue = change.newValue as typeof requestBodyValue
      } else {
        // 전체 endpoint 객체에서 requestBody 추출
        const endpointValue = change.newValue as { requestBody?: typeof requestBodyValue }
        if (endpointValue.requestBody) {
          requestBodyValue = endpointValue.requestBody
        } else {
          return ''
        }
      }

      if (requestBodyValue.content) {
        const jsonContent = requestBodyValue.content['application/json'] || requestBodyValue.content['*/*']
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

    // Parameter 변경사항 처리 (path 형식: "GET /pets/parameters/limit")
    const paramMatch = change.path.match(/parameters\/([^/\s]+)/)
    if (paramMatch) {
      const paramName = paramMatch[1]
      const paramValue = change.newValue as {
        schema?: SwaggerSchema
        name?: string
        in?: string
        required?: boolean
        description?: string
      }

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
    // Fallback: 텍스트 영역 사용
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      alert('클립보드에 복사되었습니다!')
    } catch (e) {
      alert('복사에 실패했습니다.')
    }
    document.body.removeChild(textarea)
  }
}

function goHome() {
  router.push('/')
}

onMounted(async () => {
  if (!project.value) {
    router.push('/')
    return
  }

  // diffResult가 없으면 백엔드에서 로드 시도
  if (!diffResult.value && authStore.isAuthenticated) {
    // 먼저 프로젝트의 모든 diff를 로드
    await store.loadDiffsFromBackend(projectId)
    
    // 여전히 찾지 못하면 snapshotId로 직접 찾기 시도
    // (diff는 currentSnapshotId로 찾지만, 실제로는 diff ID로 조회해야 할 수도 있음)
    const found = store.diffResults.find(
      d => d.projectId === projectId && d.currentSnapshotId === snapshotId
    )
    
    if (!found) {
      // diff를 찾지 못했으므로 홈으로 리다이렉트
      console.warn('Diff를 찾을 수 없습니다:', { projectId, snapshotId })
      router.push('/')
      return
    }
  } else if (!diffResult.value) {
    // 백엔드 미사용이고 diff가 없으면 홈으로
    router.push('/')
    return
  }

  initializeExpandedState()
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

.diff-group {
  margin-bottom: $spacing-2xl;

  &:last-child {
    margin-bottom: 0;
  }
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-lg;
  margin-bottom: $spacing-lg;
  border-radius: $radius-md;
  font-weight: 600;

  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .group-count {
    font-size: 0.875rem;
    padding: $spacing-xs $spacing-md;
    border-radius: $radius-full;
    background: var(--bg-tertiary);
  }

  &.breaking-header {
    background: #fee2e2;
    color: #991b1b;
    border-left: 4px solid #dc2626;

    .group-count {
      background: #fecaca;
      color: #991b1b;
    }
  }

  &.added-header {
    background: #d1fae5;
    color: #065f46;
    border-left: 4px solid #10b981;

    .group-count {
      background: #a7f3d0;
      color: #065f46;
    }
  }

  &.removed-header {
    background: #fee2e2;
    color: #991b1b;
    border-left: 4px solid #ef4444;

    .group-count {
      background: #fecaca;
      color: #991b1b;
    }
  }

  &.modified-header {
    background: #fef3c7;
    color: #92400e;
    border-left: 4px solid #f59e0b;

    .group-count {
      background: #fde68a;
      color: #92400e;
    }
  }
}

.endpoint-diff {
  @include card;
  padding: 0;
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
  width: 100%;
  cursor: pointer;
  padding: $spacing-md;
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
    flex-wrap: wrap;
  }

  .endpoint-tags {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    flex-wrap: wrap;
  }

  .tag-badge {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    background: var(--bg-tertiary);
    padding: $spacing-xs $spacing-sm;
    border-radius: $radius-sm;
    white-space: nowrap;
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
