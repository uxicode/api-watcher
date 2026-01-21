<template>
  <div class="project-card">
    <div class="card-header">
      <h3>{{ project.name }}</h3>
      <div class="header-actions">
        <span v-if="latestDiff" class="badge" :class="badgeClass">
          {{ changeCount }}건 변경
        </span>
        <button
          class="btn-delete"
          title="프로젝트 삭제"
          @click="handleDeleteClick"
        >
          🗑️
        </button>
      </div>
    </div>

    <div class="card-body">
      <div class="info-item">
        <span class="label">마지막 체크:</span>
        <span class="value">
          {{ lastCheckedText }}
        </span>
      </div>

      <div class="info-item">
        <span class="label">버전:</span>
        <span class="value">{{ latestVersion || '-' }}</span>
      </div>

      <div v-if="latestDiff && latestDiff.summary.breaking > 0" class="breaking-warning">
        ⚠️ Breaking Change {{ latestDiff.summary.breaking }}건 감지
      </div>
    </div>

    <div class="card-footer">
      <button
        class="btn btn-sm btn-primary"
        :disabled="isChecking"
        @click="handleCheck"
      >
        {{ isChecking ? '체크 중...' : '지금 체크하기' }}
      </button>
      <button
        class="btn btn-sm btn-secondary"
        @click="handleEditClick"
      >
        수정
      </button>
      <router-link
        :to="`/projects/${project.id}`"
        class="btn btn-sm btn-secondary"
      >
        상세보기
      </router-link>
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Teleport } from 'vue'
import { useRouter } from 'vue-router'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import type { Project } from '@/types/project'
import { useProjectStore } from '@/stores/project-store'
import ConfirmDialog from './ConfirmDialog.vue'
import ProjectFormModal from './ProjectFormModal.vue'

interface Props {
  project: Project
}

const props = defineProps<Props>()

const emit = defineEmits<{
  check: [projectId: string]
  deleted: [projectId: string]
}>()

const router = useRouter()
const store = useProjectStore()
const isChecking = computed(() => store.isProjectLoading(props.project.id))
const showDeleteDialog = ref(false)
const showEditModal = ref(false)

const latestDiff = computed(() => store.getLatestDiff(props.project.id))
const latestSnapshot = computed(() => {
  const snapshots = store.getSnapshotsByProject(props.project.id)
  return snapshots[0]
})

const latestVersion = computed(() => latestSnapshot.value?.version)

const changeCount = computed(() => {
  if (!latestDiff.value) return 0
  const { summary } = latestDiff.value
  return summary.added + summary.removed + summary.modified
})

const badgeClass = computed(() => {
  if (!latestDiff.value) return 'badge-neutral'
  if (latestDiff.value.summary.breaking > 0) return 'badge-danger'
  if (latestDiff.value.summary.added > 0 || latestDiff.value.summary.modified > 0) {
    return 'badge-warning'
  }
  return 'badge-neutral'
})

const lastCheckedText = computed(() => {
  if (!props.project.lastCheckedAt) return '체크 기록 없음'
  try {
    return formatDistanceToNow(new Date(props.project.lastCheckedAt), {
      addSuffix: true,
      locale: ko
    })
  } catch {
    return props.project.lastCheckedAt
  }
})

function handleCheck() {
  emit('check', props.project.id)
}

function handleEditClick() {
  showEditModal.value = true
}

async function handleUpdate(id: string, updates: Partial<Project>) {
  try {
    await store.updateProject(id, updates)
    showEditModal.value = false
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    alert(`❌ 프로젝트 수정 실패\n\n${errorMessage}`)
  }
}

function handleDeleteClick() {
  showDeleteDialog.value = true
}

function handleDeleteConfirm() {
  store.deleteProject(props.project.id)
  showDeleteDialog.value = false
  emit('deleted', props.project.id)
  
  // 현재 프로젝트 상세 페이지에 있다면 대시보드로 이동
  if (router.currentRoute.value.params.id === props.project.id) {
    router.push('/')
  }
}
</script>

<style lang="scss" scoped>
.project-card {
  @include card;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;

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

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-primary);
    flex: 1;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.btn-delete {
  background: none;
  border: none;
  font-size: 1.125rem;
  cursor: pointer;
  padding: $spacing-xs;
  opacity: 0.6;
  transition: opacity 0.2s;
  line-height: 1;

  &:hover {
    opacity: 1;
  }
}

.badge {
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;

  &.badge-neutral {
    background: var(--bg-tertiary);
    color: var(--color-text-secondary);
  }

  &.badge-warning {
    background: #fef3c7;
    color: #92400e;
  }

  &.badge-danger {
    background: #fee2e2;
    color: #991b1b;
  }
}

.card-body {
  flex: 1;
  margin-bottom: $spacing-md;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: $spacing-sm;
  font-size: 0.875rem;

  .label {
    color: var(--color-text-secondary);
  }

  .value {
    color: var(--color-text-primary);
    font-weight: 500;
  }
}

.breaking-warning {
  margin-top: $spacing-md;
  padding: $spacing-sm;
  background: #fee2e2;
  color: #991b1b;
  border-radius: $radius-sm;
  font-size: 0.875rem;
  font-weight: 500;
}

.card-footer {
  display: flex;
  gap: $spacing-sm;
  padding-top: $spacing-md;
  border-top: 1px solid var(--color-border-light);
}

.btn-sm {
  padding: $spacing-xs $spacing-md;
  font-size: 0.875rem;
  flex: 1;
}
</style>
