<template>
  <tr class="project-row">
    <td class="project-name">
      <div class="name-cell">
        <h3>{{ project.name }}</h3>
        <span v-if="latestDiff && latestDiff.summary.breaking > 0" class="breaking-badge">
          ⚠️ Breaking
        </span>
      </div>
    </td>
    <td class="last-checked">
      {{ lastCheckedText }}
    </td>
    <td class="version">
      {{ latestVersion || '-' }}
    </td>
    <td class="changes">
      <span v-if="latestDiff" class="badge" :class="badgeClass">
        {{ changeCount }}건
      </span>
      <span v-else class="text-muted">-</span>
    </td>
    <td class="status">
      <span v-if="latestDiff && latestDiff.summary.breaking > 0" class="status-badge status-danger">
        Breaking
      </span>
      <span v-else-if="changeCount > 0" class="status-badge status-warning">
        변경됨
      </span>
      <span v-else class="status-badge status-success">
        정상
      </span>
    </td>
    <td class="actions">
      <div class="action-buttons">
        <button
          class="btn btn-sm btn-primary"
          :disabled="isChecking"
          @click="handleCheck"
          title="지금 체크하기"
        >
          {{ isChecking ? '체크 중...' : '체크' }}
        </button>
        <button
          class="btn btn-sm btn-secondary"
          @click="handleEditClick"
          title="프로젝트 수정"
        >
          수정
        </button>
        <router-link
          :to="`/projects/${project.id}`"
          class="btn btn-sm btn-secondary"
          title="상세보기"
        >
          상세
        </router-link>
        <button
          class="btn btn-sm btn-danger"
          title="프로젝트 삭제"
          @click="handleDeleteClick"
        >
          삭제
        </button>
      </div>
    </td>

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
  </tr>
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
.project-row {
  font-size: 0.875rem;
  td {
    padding: $spacing-sm $spacing-md;
    vertical-align: middle;

    &:first-child {
      padding-left: $spacing-lg;
    }

    &:last-child {
      padding-right: $spacing-lg;
    }
  }
}

.project-name {
  .name-cell {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    h3 {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }
  }

  .breaking-badge {
    padding: $spacing-xs $spacing-sm;
    background: #fee2e2;
    color: #991b1b;
    border-radius: $radius-sm;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }
}

.last-checked,
.version {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.changes {
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

  .text-muted {
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }
}

.status {
  .status-badge {
    padding: $spacing-xs $spacing-sm;
    border-radius: $radius-sm;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;

    &.status-success {
      background: #d1fae5;
      color: #065f46;
    }

    &.status-warning {
      background: #fef3c7;
      color: #92400e;
    }

    &.status-danger {
      background: #fee2e2;
      color: #991b1b;
    }
  }
}

.actions {
  text-align: right;

  .action-buttons {
    display: flex;
    gap: $spacing-xs;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
  }
}


@include mobile {
  .project-row {
    td {
      padding: $spacing-sm $spacing-md;
      font-size: 0.875rem;
    }
  }

  .actions .action-buttons {
    flex-direction: column;
    gap: $spacing-xs;

    .btn {
      width: 100%;
    }
  }
}
</style>
