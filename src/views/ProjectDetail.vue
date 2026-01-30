<template>
  <div class="project-detail">
    <div v-if="!project" class="loading">로딩 중...</div>

    <template v-else>
      <header class="page-header">
        <div class="header-left">
          <button class="btn-back" @click="goHome" title="홈으로">
            ← 홈
          </button>
          <div>
            <h1>{{ project.name }}</h1>
            <p class="subtitle">{{ project.swaggerUrl }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button
            class="btn btn-primary"
            :disabled="isLoading"
            @click="handleCheck"
          >
            {{ isLoading ? '체크 중...' : '지금 체크하기' }}
          </button>
          <button
            class="btn btn-secondary"
            @click="showEditModal = true"
          >
            수정
          </button>
          <button
            class="btn btn-danger"
            @click="showDeleteDialog = true"
          >
            삭제
          </button>
        </div>
      </header>

      <Teleport to="body">
        <ProjectFormModal
          v-if="showEditModal"
          :project="project"
          @close="showEditModal = false"
          @update="handleUpdate"
        />
        
        <ConfirmDialog
          v-if="showDeleteDialog"
          :message="`'${project.name}' 프로젝트를 삭제하시겠습니까?`"
          :description="'이 작업은 되돌릴 수 없으며, 모든 스냅샷과 변경 내역이 함께 삭제됩니다.'"
          confirm-text="삭제"
          cancel-text="취소"
          @confirm="handleDeleteConfirm"
          @cancel="showDeleteDialog = false"
        />
      </Teleport>

      <div class="content">
        <div class="info-section">
          <h2>프로젝트 정보</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">마지막 체크</span>
              <span class="value">{{ lastCheckedText }}</span>
            </div>
            <div class="info-item">
              <span class="label">스냅샷 수</span>
              <span class="value">{{ snapshots.length }}개</span>
            </div>
            <div class="info-item">
              <span class="label">최신 버전</span>
              <span class="value">{{ latestVersion || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">총 API 개수</span>
              <span class="value">{{ apiEndpoints.length }}개</span>
            </div>
          </div>
        </div>

        <div class="api-list-section">
          <div class="section-header" @click="toggleApiList">
            <div class="header-title">
              <h2>API 목록</h2>
              <span v-if="apiEndpoints.length > 0" class="api-count">
                총 {{ apiEndpoints.length }}개 엔드포인트
              </span>
            </div>
            <button class="toggle-btn" :class="{ expanded: showApiList }">
              {{ showApiList ? '▼' : '▶' }}
            </button>
          </div>
          
          <div v-if="apiEndpoints.length === 0" class="empty-state">
            아직 스냅샷이 없습니다. "지금 체크하기"를 눌러 API 정보를 가져오세요.
          </div>
          
          <div v-else-if="showApiList" class="api-list">
            <!-- 태그별로 그룹화된 API 목록 -->
            <div
              v-for="(group, tagName) in groupedApiEndpoints"
              :key="tagName"
              class="tag-group"
            >
              <div class="tag-header" @click.stop="toggleTagGroup(tagName)">
                <div class="tag-info">
                  <h3>{{ tagName }}</h3>
                  <span class="tag-count">{{ group.length }}개</span>
                </div>
                <div class="tag-expand-icon">
                  {{ expandedTags.has(tagName) ? '▼' : '▶' }}
                </div>
              </div>
              
              <div v-if="expandedTags.has(tagName)" class="tag-apis">
                <div
                  v-for="(endpoint, index) in group"
                  :key="`${tagName}-${index}`"
                  class="api-item"
                  :class="{ expanded: expandedApiIndex === `${tagName}-${index}` }"
                  @click.stop="toggleApiDetail(`${tagName}-${index}`)"
                >
                  <div class="api-main">
                    <div class="api-method" :class="`method-${endpoint.method.toLowerCase()}`">
                      {{ endpoint.method.toUpperCase() }}
                    </div>
                    <div class="api-info">
                      <div class="api-path">{{ endpoint.path }}</div>
                      <div v-if="endpoint.summary" class="api-summary">
                        {{ endpoint.summary }}
                      </div>
                    </div>
                    <div class="api-expand-icon">
                      {{ expandedApiIndex === `${tagName}-${index}` ? '▼' : '▶' }}
                    </div>
                  </div>
                  
                  <div v-if="expandedApiIndex === `${tagName}-${index}`" class="api-details">
                    <!-- Parameters -->
                    <div v-if="endpoint.parameters && endpoint.parameters.length > 0" class="detail-section">
                      <h4>Parameters</h4>
                      <div class="parameter-list">
                        <div
                          v-for="(param, pIndex) in endpoint.parameters"
                          :key="pIndex"
                          class="parameter-item"
                        >
                          <span class="param-name">{{ param.name }}</span>
                          <span class="param-in">({{ param.in }})</span>
                          <span v-if="param.required" class="param-required">required</span>
                          <span v-if="param.description" class="param-desc">{{ param.description }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Request Body -->
                    <div v-if="endpoint.requestBody" class="detail-section">
                      <h4>Request Body</h4>
                      <pre class="code-block">{{ formatJson(endpoint.requestBody) }}</pre>
                    </div>

                    <!-- Responses -->
                    <div v-if="endpoint.responses" class="detail-section">
                      <h4>Responses</h4>
                      <div class="response-list">
                        <div
                          v-for="(response, statusCode) in endpoint.responses"
                          :key="statusCode"
                          class="response-item"
                        >
                          <div class="response-status" :class="getStatusClass(statusCode)">
                            {{ statusCode }}
                          </div>
                          <div class="response-content">
                            <div v-if="response.description" class="response-desc">
                              {{ response.description }}
                            </div>
                            <pre v-if="response.content" class="code-block">{{ formatJson(response.content) }}</pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="diffs-section">
          <h2>변경 내역</h2>
          <div v-if="diffs.length === 0" class="empty-state">
            아직 변경 내역이 없습니다.
          </div>
          <div v-else class="diffs-list">
            <DiffCard
              v-for="diff in diffs"
              :key="diff.comparedAt"
              :diff="diff"
              @view="handleViewDiff"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Teleport } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import { useProjectStore } from '@/stores/project-store'
import { useSettingsStore } from '@/stores/settings-store'
import DiffCard from '@/components/DiffCard.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ProjectFormModal from '@/components/ProjectFormModal.vue'
import type { DiffResult } from '@/types/diff'
import type { Project } from '@/types/project'

const route = useRoute()
const router = useRouter()
const store = useProjectStore()
const showDeleteDialog = ref(false)
const showEditModal = ref(false)
const showApiList = ref(true) // API 목록 토글 상태
const expandedApiIndex = ref<string | null>(null) // 확장된 API 인덱스 (태그-인덱스 형식)
const expandedTags = ref<Set<string>>(new Set()) // 확장된 태그들

const projectId = route.params.id as string
const project = computed(() => store.getProject(projectId))
const isLoading = computed(() => store.isProjectLoading(projectId))
const snapshots = computed(() => store.getSnapshotsByProject(projectId))
const diffs = computed(() => store.getDiffsByProject(projectId))

const latestVersion = computed(() => {
  const latest = snapshots.value[0]
  return latest?.version
})

const lastCheckedText = computed(() => {
  if (!project.value?.lastCheckedAt) return '체크 기록 없음'
  try {
    return formatDistanceToNow(new Date(project.value.lastCheckedAt), {
      addSuffix: true,
      locale: ko
    })
  } catch {
    return project.value.lastCheckedAt
  }
})

// API 엔드포인트 목록 생성
interface ApiEndpoint {
  method: string
  path: string
  summary?: string
  requestBody?: any
  responses?: Record<string, any>
  parameters?: any[]
  tags?: string[]
}

// $ref를 resolve하는 헬퍼 함수
function resolveRef(ref: string, swaggerData: any): any {
  // $ref 형식: "#/components/schemas/SchemaName"
  if (!ref || !ref.startsWith('#/')) return null
  
  const parts = ref.substring(2).split('/')
  let result = swaggerData
  
  for (const part of parts) {
    if (!result || typeof result !== 'object') return null
    result = result[part]
  }
  
  return result
}

// 재귀적으로 모든 $ref를 resolve하는 함수
function resolveAllRefs(obj: any, swaggerData: any, visited = new Set<string>()): any {
  if (!obj || typeof obj !== 'object') return obj
  
  // 배열 처리
  if (Array.isArray(obj)) {
    return obj.map(item => resolveAllRefs(item, swaggerData, visited))
  }
  
  // $ref가 있는 경우
  if (obj.$ref) {
    const ref = obj.$ref
    
    // 순환 참조 방지
    if (visited.has(ref)) {
      return { $ref: ref, _note: 'Circular reference detected' }
    }
    
    visited.add(ref)
    
    const resolved = resolveRef(ref, swaggerData)
    if (resolved) {
      // 해결된 스키마도 재귀적으로 처리
      return resolveAllRefs(resolved, swaggerData, new Set(visited))
    }
    
    return obj
  }
  
  // 객체의 모든 속성을 재귀적으로 처리
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveAllRefs(value, swaggerData, visited)
  }
  
  return result
}

// content의 $ref를 실제 스키마로 대체하는 공통 함수
function resolveContentSchema(content: any, swaggerData: any): any {
  if (!content || typeof content !== 'object') return content
  
  return resolveAllRefs(content, swaggerData)
}

// response의 $ref를 실제 스키마로 대체하는 함수
function resolveResponseSchema(responses: any, swaggerData: any): any {
  if (!responses || typeof responses !== 'object') return responses
  
  const resolvedResponses: Record<string, any> = {}
  
  for (const [statusCode, response] of Object.entries(responses)) {
    const resolvedResponse = { ...response as any }
    
    // content가 있는 경우
    if (resolvedResponse.content && typeof resolvedResponse.content === 'object') {
      resolvedResponse.content = resolveContentSchema(resolvedResponse.content, swaggerData)
    }
    
    resolvedResponses[statusCode] = resolvedResponse
  }
  
  return resolvedResponses
}

// requestBody의 $ref를 실제 스키마로 대체하는 함수
function resolveRequestBodySchema(requestBody: any, swaggerData: any): any {
  if (!requestBody || typeof requestBody !== 'object') return requestBody
  
  const resolvedRequestBody = { ...requestBody }
  
  // content가 있는 경우
  if (resolvedRequestBody.content && typeof resolvedRequestBody.content === 'object') {
    resolvedRequestBody.content = resolveContentSchema(resolvedRequestBody.content, swaggerData)
  }
  
  return resolvedRequestBody
}

const apiEndpoints = computed<ApiEndpoint[]>(() => {
  const latestSnapshot = snapshots.value[0]
  if (!latestSnapshot) return []

  try {
    const swaggerData = JSON.parse(latestSnapshot.data)
    const endpoints: ApiEndpoint[] = []

    if (swaggerData.paths) {
      for (const [path, methods] of Object.entries(swaggerData.paths)) {
        for (const [method, details] of Object.entries(methods as Record<string, any>)) {
          // HTTP 메서드만 추출 (get, post, put, delete, patch 등)
          if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
            // responses와 requestBody의 $ref를 resolve
            const resolvedResponses = resolveResponseSchema(details?.responses, swaggerData)
            const resolvedRequestBody = resolveRequestBodySchema(details?.requestBody, swaggerData)
            
            endpoints.push({
              method,
              path,
              summary: details?.summary || details?.description || '',
              requestBody: resolvedRequestBody,
              responses: resolvedResponses,
              parameters: details?.parameters,
              tags: details?.tags || []
            })
          }
        }
      }
    }

    // 메서드 순서: GET, POST, PUT, PATCH, DELETE
    const methodOrder = { get: 1, post: 2, put: 3, patch: 4, delete: 5, options: 6, head: 7 }
    return endpoints.sort((a, b) => {
      // 먼저 경로로 정렬
      if (a.path !== b.path) {
        return a.path.localeCompare(b.path)
      }
      // 같은 경로면 메서드 순서로 정렬
      const orderA = methodOrder[a.method.toLowerCase() as keyof typeof methodOrder] || 99
      const orderB = methodOrder[b.method.toLowerCase() as keyof typeof methodOrder] || 99
      return orderA - orderB
    })
  } catch (error) {
    console.error('Failed to parse swagger data:', error)
    return []
  }
})

// 태그별로 그룹화된 API 엔드포인트
const groupedApiEndpoints = computed(() => {
  const groups: Record<string, ApiEndpoint[]> = {}
  
  for (const endpoint of apiEndpoints.value) {
    // 태그가 없거나 빈 배열이면 'Untagged'로 분류
    const tags = endpoint.tags && endpoint.tags.length > 0 ? endpoint.tags : ['Untagged']
    
    // 하나의 엔드포인트가 여러 태그를 가질 수 있음
    for (const tag of tags) {
      if (!groups[tag]) {
        groups[tag] = []
      }
      groups[tag].push(endpoint)
    }
  }
  
  // 태그 이름순으로 정렬 (Untagged는 마지막에)
  const sortedGroups: Record<string, ApiEndpoint[]> = {}
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Untagged') return 1
    if (b === 'Untagged') return -1
    return a.localeCompare(b)
  })
  
  for (const key of sortedKeys) {
    sortedGroups[key] = groups[key]
  }
  
  return sortedGroups
})

// 첫 번째 태그를 자동으로 확장 (한 번만 실행)
watch(groupedApiEndpoints, (groups) => {
  const keys = Object.keys(groups)
  if (keys.length > 0 && expandedTags.value.size === 0) {
    expandedTags.value.add(keys[0])
  }
}, { immediate: true })

function handleCheck() {
  if (projectId) {
    store.collectSwagger(projectId)
  }
}

function toggleApiList() {
  showApiList.value = !showApiList.value
}

function toggleTagGroup(tagName: string) {
  if (expandedTags.value.has(tagName)) {
    expandedTags.value.delete(tagName)
  } else {
    expandedTags.value.add(tagName)
  }
  // 반응성을 위해 새로운 Set 생성
  expandedTags.value = new Set(expandedTags.value)
}

function toggleApiDetail(key: string) {
  if (expandedApiIndex.value === key) {
    expandedApiIndex.value = null
  } else {
    expandedApiIndex.value = key
  }
}

function formatJson(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

function getStatusClass(statusCode: string): string {
  const code = parseInt(statusCode)
  if (code >= 200 && code < 300) return 'status-success'
  if (code >= 300 && code < 400) return 'status-redirect'
  if (code >= 400 && code < 500) return 'status-client-error'
  if (code >= 500) return 'status-server-error'
  return ''
}

async function handleUpdate(id: string, updates: Partial<Project>) {
  try {
    await store.updateProject(id, updates)
    showEditModal.value = false
    alert('✅ 프로젝트가 성공적으로 수정되었습니다.')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    alert(`❌ 프로젝트 수정 실패\n\n${errorMessage}`)
  }
}

function handleViewDiff(diff: DiffResult) {
  router.push(`/diff/${projectId}/${diff.currentSnapshotId}`)
}

function handleDeleteConfirm() {
  if (projectId) {
    store.deleteProject(projectId)
    router.push('/')
  }
}

function goHome() {
  router.push('/')
}

onMounted(async () => {
  // 프로젝트가 없으면 백엔드에서 로드 시도
  if (!project.value) {
    const settingsStore = useSettingsStore()
    if (settingsStore.hasApiConfigured) {
      // 프로젝트 목록을 다시 로드
      await store.loadProjectsFromBackend()
      
      // 여전히 프로젝트가 없으면 홈으로
      if (!store.getProject(projectId)) {
        router.push('/')
        return
      }
    } else {
      router.push('/')
      return
    }
  }

  // 백엔드 사용 시 스냅샷과 diff 로드
  const settingsStore = useSettingsStore()
  if (settingsStore.hasApiConfigured) {
    await store.loadSnapshotsFromBackend(projectId)
    await store.loadDiffsFromBackend(projectId)
  }
})
</script>

<style lang="scss" scoped>
.project-detail {
  min-height: 100vh;
  background: var(--bg-secondary);
  padding: $spacing-xl;
}

.page-header {
  max-width: 1200px;
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

.header-actions {
  display: flex;
  gap: $spacing-md;
  align-items: center;
}


.content {
  max-width: 1200px;
  margin: 0 auto;
}

.info-section,
.api-list-section,
.diffs-section {
  @include card;
  margin-bottom: $spacing-xl;

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: $spacing-lg;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: $spacing-lg;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;

  .label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .value {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
}

.empty-state {
  text-align: center;
  padding: $spacing-2xl;
  color: var(--color-text-secondary);
}

.diffs-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

// API 목록 섹션
.api-list-section {
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-lg;
    cursor: pointer;
    user-select: none;
    padding: $spacing-sm;
    margin: -$spacing-sm;
    border-radius: $radius-md;
    transition: background 0.2s;

    &:hover {
      background: var(--bg-tertiary);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: $spacing-md;
      flex: 1;

      h2 {
        margin-bottom: 0;
      }

      .api-count {
        font-size: 0.875rem;
        color: var(--color-text-secondary);
        background: var(--bg-tertiary);
        padding: $spacing-xs $spacing-md;
        border-radius: $radius-full;
      }
    }

    .toggle-btn {
      background: none;
      border: none;
      font-size: 1rem;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: $spacing-xs;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;

      &:hover {
        color: var(--color-text-primary);
        transform: scale(1.1);
      }

      &.expanded {
        color: var(--color-primary);
      }
    }
  }
}

.api-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  max-height: 600px;
  overflow-y: auto;
  margin-top: 10px;
  padding: $spacing-xs;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--bg-tertiary);
    border-radius: $radius-sm;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: $radius-sm;
    
    &:hover {
      background: var(--color-text-secondary);
    }
  }
}

// 태그 그룹 스타일
.tag-group {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border-light);
  border-radius: $radius-md;
  background: var(--bg-primary);
}

.tag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm $spacing-lg;
  background: var(--bg-secondary);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;

  &:hover {
    background: var(--bg-tertiary);
  }

  .tag-info {
    display: flex;
    align-items: center;
    gap: $spacing-md;

    h3 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .tag-count {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      background: var(--bg-primary);
      padding: $spacing-xs $spacing-md;
      border-radius: $radius-full;
    }
  }

  .tag-expand-icon {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    transition: transform 0.2s;
  }
}

.tag-apis {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-md;
  background: var(--bg-primary);
}

.api-item {
  display: flex;
  flex-direction: column;
  background: rgba(97, 175, 254, .1); /// var(--bg-tertiary);
  border-radius: $radius-md;
  transition: all 0.2s;
  cursor: pointer;
  // overflow: hidden;
  border: 1px solid #dedede;

  &:hover {
    background: var(--bg-secondary);
  }

  &.expanded {
    background: var(--bg-secondary);
    box-shadow: $shadow-md;
  }
}

.api-main {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-xs $spacing-md;
}

.api-expand-icon {
  margin-left: auto;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  transition: transform 0.2s;
}

.api-method {
  flex-shrink: 0;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
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

  &.method-patch {
    background: #e0e7ff;
    color: #3730a3;
  }

  &.method-delete {
    background: #fee2e2;
    color: #991b1b;
  }

  &.method-options,
  &.method-head {
    background: #f3f4f6;
    color: #4b5563;
  }
}

.api-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  // gap: $spacing-xs;
}

.api-path {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  word-break: break-all;
}

.api-summary {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  // overflow: hidden;
  // text-overflow: ellipsis;
  // white-space: nowrap;
}

// API 상세 정보
.api-details {
  padding: $spacing-md;
  border-top: 1px solid var(--color-border);
  background: var(--bg-primary);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 500px;
  }
}

.detail-section {
  margin-bottom: $spacing-md;

  &:last-child {
    margin-bottom: 0;
  }

  h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: $spacing-sm;
    padding-bottom: $spacing-xs;
    border-bottom: 1px solid var(--color-border);
  }
}

.parameter-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.parameter-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xs $spacing-sm;
  background: var(--bg-tertiary);
  border-radius: $radius-sm;
  font-size: 0.75rem;

  .param-name {
    font-weight: 600;
    color: var(--color-text-primary);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  .param-in {
    color: var(--color-text-secondary);
    font-size: 0.7rem;
  }

  .param-required {
    color: $color-danger;
    font-weight: 600;
    font-size: 0.7rem;
  }

  .param-desc {
    color: var(--color-text-secondary);
    margin-left: auto;
  }
}

.code-block {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: $spacing-sm;
  border-radius: $radius-sm;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.7rem;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #2d2d2d;
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;

    &:hover {
      background: #777;
    }
  }
}

.response-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.response-item {
  display: flex;
  gap: $spacing-sm;
  align-items: flex-start;
}

.response-status {
  flex-shrink: 0;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 50px;
  text-align: center;

  &.status-success {
    background: #d1fae5;
    color: #065f46;
  }

  &.status-redirect {
    background: #e0e7ff;
    color: #3730a3;
  }

  &.status-client-error {
    background: #fef3c7;
    color: #92400e;
  }

  &.status-server-error {
    background: #fee2e2;
    color: #991b1b;
  }
}

.response-content {
  flex: 1;
  min-width: 0;
}

.response-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: $spacing-xs;
}

@include mobile {
  .api-list {
    max-height: 400px;
  }

  .api-main {
    flex-wrap: wrap;
  }

  .api-method {
    min-width: 50px;
  }

  .code-block {
    font-size: 0.65rem;
  }

  .response-item {
    flex-direction: column;
  }
}
</style>
