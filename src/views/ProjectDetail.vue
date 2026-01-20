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
            class="btn btn-danger"
            @click="showDeleteDialog = true"
          >
            삭제
          </button>
        </div>
      </header>

      <Teleport to="body">
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
import { computed, onMounted, ref } from 'vue'
import { Teleport } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import { useProjectStore } from '@/stores/project-store'
import { useSettingsStore } from '@/stores/settings-store'
import DiffCard from '@/components/DiffCard.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { DiffResult } from '@/types/diff'

const route = useRoute()
const router = useRouter()
const store = useProjectStore()
const showDeleteDialog = ref(false)

const projectId = route.params.id as string
const project = computed(() => store.getProject(projectId))
const isLoading = computed(() => store.isLoading)
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

function handleCheck() {
  if (projectId) {
    store.collectSwagger(projectId)
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
</style>
