<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>API Watcher</h1>
      <p class="subtitle">API 변경 사항 추적 시스템</p>
    </header>

    <div class="dashboard-content">
      <div class="actions-bar">
        <button
          class="btn btn-icon"
          title="설정"
          @click="showSettings = true"
        >
          ⚙️
        </button>
        <button
          v-if="isDev"
          class="btn btn-secondary"
          title="목데이터 로드 (개발용)"
          @click="loadMockData"
        >
          🧪 목데이터
        </button>
        <router-link to="/projects" class="btn btn-primary">
          프로젝트 추가
        </router-link>
        <button
          v-if="projects.length > 0"
          class="btn btn-secondary"
          :disabled="isCheckingAll"
          @click="checkAllProjects"
        >
          {{ isCheckingAll ? '전체 체크 중...' : '전체 체크하기' }}
        </button>
      </div>

      <SettingsModal
        v-if="showSettings"
        :is-open="showSettings"
        @close="handleSettingsClose"
      />

      <div v-if="projects.length === 0" class="empty-state">
        <p>등록된 프로젝트가 없습니다.</p>
        <router-link to="/projects" class="btn btn-primary">
          첫 프로젝트 추가하기
        </router-link>
      </div>

      <div v-else class="project-table-container">
        <table class="project-table">
          <thead>
            <tr>
              <th>프로젝트명</th>
              <th>마지막 체크</th>
              <th>버전</th>
              <th>변경 건수</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            <ProjectTableRow
              v-for="project in projects"
              :key="project.id"
              :project="project"
              @check="handleCheck"
              @deleted="handleDeleted"
            />
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useProjectStore } from '@/stores/project-store'
import { useSettingsStore } from '@/stores/settings-store'
import ProjectTableRow from '@/components/ProjectTableRow.vue'
import SettingsModal from '@/components/SettingsModal.vue'

const store = useProjectStore()
const settingsStore = useSettingsStore()
const projects = computed(() => store.projects.filter(p => p.isActive))
const isCheckingAll = ref(false)
const showSettings = ref(false)
const isDev = import.meta.env.DEV

// 설정 변경 감지하여 프로젝트 자동 로드
async function loadProjectsIfNeeded() {
  // console.log('[Dashboard loadProjectsIfNeeded] ==> 호출됨 <==')
  // console.log('[Dashboard] settingsStore:', settingsStore)
  // console.log('[Dashboard] settingsStore.settings:', settingsStore.settings)
  // console.log('[Dashboard] settingsStore.settings.apiBaseUrl:', settingsStore.settings.apiBaseUrl)
  // console.log('[Dashboard] typeof settingsStore.settings.apiBaseUrl:', typeof settingsStore.settings.apiBaseUrl)
  // console.log('[Dashboard] settingsStore.apiBaseUrl (computed):', settingsStore.apiBaseUrl)
  // console.log('[Dashboard] settingsStore.hasApiConfigured (computed):', settingsStore.hasApiConfigured)
  
  const hasApiBaseUrl = settingsStore.hasApiConfigured || !!settingsStore.settings.apiBaseUrl

  // LocalStorage 직접 확인
  const storedSettings = localStorage.getItem('api-watcher-settings')
  if (storedSettings) {
    try {
      const parsed = JSON.parse(storedSettings)
      console.log('[Dashboard] 파싱된 설정:', parsed)
      console.log('[Dashboard] 파싱된 apiBaseUrl:', parsed.apiBaseUrl)
    } catch (e) {
      console.error('[Dashboard] LocalStorage 파싱 실패:', e)
    }
  }
  
  if (hasApiBaseUrl && store.projects.length === 0) {
    console.log('[Dashboard] ✅ 조건 만족 - loadProjectsFromBackend 호출')
    try {
      await store.loadProjectsFromBackend()
      console.log('[Dashboard] ✅ loadProjectsFromBackend 완료')
    } catch (error) {
      console.error('[Dashboard] ❌ 프로젝트 로드 실패:', error)
    }
  } else {
    console.log('[Dashboard] ❌ 조건 불만족 - loadProjectsFromBackend 호출 안 함')
  }
}

// 설정 변경 감지
watch(
  () => settingsStore.hasApiConfigured,
  async (hasApiConfigured, oldValue) => {
    console.log('[Dashboard watch] hasApiConfigured 변경:', {
      oldValue,
      newValue: hasApiConfigured,
      'settingsStore.settings': settingsStore.settings,
      'settingsStore.settings.apiBaseUrl': settingsStore.settings.apiBaseUrl
    })
    await loadProjectsIfNeeded()
  }
)

// apiBaseUrl 변경 감지
watch(
  () => settingsStore.settings.apiBaseUrl,
  async (newUrl, oldUrl) => {
    console.log('[Dashboard watch] apiBaseUrl 변경:', {
      oldUrl,
      newUrl,
      typeof_newUrl: typeof newUrl,
      typeof_oldUrl: typeof oldUrl,
      'settingsStore.settings': settingsStore.settings,
      'settingsStore.hasApiConfigured': settingsStore.hasApiConfigured
    })
    if (newUrl && newUrl !== oldUrl) {
      console.log('[Dashboard watch] 새 URL로 프로젝트 로드 시도')
      await loadProjectsIfNeeded()
    } else {
      console.log('[Dashboard watch] URL 변경 없거나 비어있음 - 로드 안 함')
    }
  }
)

// settings 객체 전체 감시 (깊은 감시)
watch(
  () => settingsStore.settings,
  async (newValue, oldValue) => {
    console.log('[Dashboard watch] settings 전체 변경됨:', {
      oldValue,
      newValue,
      'apiBaseUrl 변경': oldValue?.apiBaseUrl !== newValue?.apiBaseUrl
    })
  },
  { deep: true }
)

async function checkAllProjects() {
  isCheckingAll.value = true
  try {
    for (const project of projects.value) {
      try {
        await store.collectSwagger(project.id)
      } catch (error) {
        console.error(`Failed to check project ${project.name}:`, error)
      }
    }
  } finally {
    isCheckingAll.value = false
  }
}

async function handleCheck(projectId: string) {
  try {
    await store.collectSwagger(projectId)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[handleCheck] 프로젝트 체크 실패:`, error)
    
    // 사용자에게 친절한 에러 메시지 표시
    alert(`❌ Swagger 문서 체크 실패\n\n${errorMessage}`)
  }
}

function handleDeleted(_projectId: string) {
  // 프로젝트가 삭제되면 자동으로 리스트에서 제거됨 (reactive)
  // 필요시 추가 처리 가능
}

function loadMockData() {
  if (confirm('목데이터를 로드하시겠습니까? 기존 데이터는 덮어씌워집니다.')) {
    store.loadMockData()
    alert('목데이터가 로드되었습니다!')
  }
}

function handleSettingsClose() {
  showSettings.value = false
}

onMounted(async () => {
  console.log('[Dashboard onMounted] ==> 시작 <==')
  
  // 즉시 확인
  console.log('[Dashboard onMounted] 초기 상태:')
  console.log('  - settingsStore.settings:', settingsStore.settings)
  console.log('  - settingsStore.settings.apiBaseUrl:', settingsStore.settings.apiBaseUrl)
  console.log('  - settingsStore.hasApiConfigured:', settingsStore.hasApiConfigured)
  
  // 설정이 로드될 때까지 잠시 대기 (LocalStorage에서 로드하는 시간)
  console.log('[Dashboard onMounted] 100ms 대기 중...')
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // 대기 후 재확인
  console.log('[Dashboard onMounted] 100ms 대기 후:')
  console.log('  - settingsStore.settings:', settingsStore.settings)
  console.log('  - settingsStore.settings.apiBaseUrl:', settingsStore.settings.apiBaseUrl)
  console.log('  - settingsStore.hasApiConfigured:', settingsStore.hasApiConfigured)
  
  // LocalStorage 직접 확인
  const storedSettings = localStorage.getItem('api-watcher-settings')
  console.log('[Dashboard onMounted] LocalStorage:', storedSettings)
  
  // 초기 로드 시도
  console.log('[Dashboard onMounted] loadProjectsIfNeeded() 호출')
  await loadProjectsIfNeeded()
  
  console.log('[Dashboard onMounted] ==> 완료 <==')
})
</script>

<style lang="scss" scoped>
.dashboard {
  min-height: 100vh;
  background: var(--bg-secondary);
  padding: $spacing-xl;
}

.dashboard-header {
  margin-bottom: $spacing-2xl;
  text-align: center;

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: $spacing-sm;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 1.125rem;
  }
}

.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
}

.actions-bar {
  display: flex;
  gap: $spacing-md;
  margin-bottom: $spacing-xl;
  justify-content: flex-end;

  @include mobile {
    flex-direction: column;
  }
}

.empty-state {
  @include card;
  text-align: center;
  padding: $spacing-2xl;

  p {
    color: var(--color-text-secondary);
    margin-bottom: $spacing-lg;
    font-size: 1.125rem;
  }
}

.project-table-container {
  background: $color-bg-primary;
  // border-radius: $radius-lg;
  // box-shadow: $shadow-md;
  padding-bottom: 10px;
  overflow-x: auto;
}

.project-table {
  width: 100%;
  border-collapse: collapse;

  thead {
    background: var(--bg-tertiary);
    border-top: 2px solid var(--color-border-orange);
    border-bottom: 1px solid var(--color-border);

    th {
      padding: $spacing-sm $spacing-md;
      text-align: left;
      font-weight: 600;
      font-size: 0.875rem;
      color: black;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &:first-child {
        padding-left: $spacing-lg;
      }

      &:last-child {
        padding-right: $spacing-lg;
        text-align: right;
      }
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid var(--color-border-light);
      transition: background-color 0.2s;

      &:hover {
        background: var(--bg-secondary);
      }

      &:last-child {
        border-bottom: none;
      }
    }
  }

  @include mobile {
    font-size: 0.875rem;

    thead th {
      padding: $spacing-sm $spacing-md;
      font-size: 0.75rem;
    }
  }
}
@media (max-width: 767px) {
  .project-table{
    width: 470px;
  }
}

</style>
