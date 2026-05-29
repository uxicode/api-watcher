<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>API Watcher</h1>
      <p class="subtitle">API 변경 사항 추적 시스템</p>
    </header>

    <div class="dashboard-content">
      <div class="actions-bar">
        <div class="user-info" v-if="authStore.isAuthenticated">
          <span class="user-name">{{ authStore.user?.name || authStore.user?.email }}</span>
        </div>
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
        <button
          v-if="authStore.isAuthenticated"
          class="btn btn-secondary"
          @click="handleLogout"
        >
          로그아웃
        </button>
        <router-link
          v-else
          to="/login"
          class="btn btn-secondary"
        >
          로그인
        </router-link>
      </div>


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
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project-store'
import { useAuthStore } from '@/stores/auth-store'
import ProjectTableRow from '@/components/ProjectTableRow.vue'

const router = useRouter()
const store = useProjectStore()
const authStore = useAuthStore()
const projects = computed(() => store.projects.filter(p => p.isActive))
const isCheckingAll = ref(false)
async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

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



onMounted(async () => {
  if (authStore.isAuthenticated) {
    await store.loadProjectsFromBackend(true)
  }
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
  align-items: center;

  .user-info {
    margin-right: auto;
    color: var(--color-text-secondary);
    font-size: 0.875rem;

    .user-name {
      font-weight: 500;
    }
  }

  @include mobile {
    flex-direction: column;
    align-items: stretch;

    .user-info {
      margin-right: 0;
      margin-bottom: $spacing-sm;
    }
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
