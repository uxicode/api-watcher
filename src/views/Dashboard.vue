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
          :disabled="isLoading"
          @click="checkAllProjects"
        >
          {{ isLoading ? '체크 중...' : '전체 체크하기' }}
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
import { computed, onMounted, ref } from 'vue'
import { useProjectStore } from '@/stores/project-store'
import ProjectTableRow from '@/components/ProjectTableRow.vue'
import SettingsModal from '@/components/SettingsModal.vue'

const store = useProjectStore()
const projects = computed(() => store.projects.filter(p => p.isActive))
const isLoading = computed(() => store.isLoading)
const showSettings = ref(false)
const isDev = import.meta.env.DEV

async function checkAllProjects() {
  for (const project of projects.value) {
    try {
      await store.collectSwagger(project.id)
    } catch (error) {
      console.error(`Failed to check project ${project.name}:`, error)
    }
  }
}

function handleCheck(projectId: string) {
  store.collectSwagger(projectId)
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

onMounted(() => {
  // 초기 데이터 로드는 store에서 자동으로 처리됨
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

</style>
