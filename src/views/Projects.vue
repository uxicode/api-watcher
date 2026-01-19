<template>
  <div class="projects-page">
    <header class="page-header">
      <h1>프로젝트 관리</h1>
      <button class="btn btn-primary" @click="showAddModal = true">
        프로젝트 추가
      </button>
    </header>

    <div class="projects-list">
      <ProjectFormModal
        v-if="showAddModal"
        @close="handleClose"
        @submit="handleAddProject"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project-store'
import ProjectFormModal from '@/components/ProjectFormModal.vue'
import type { Project } from '@/types/project'

const router = useRouter()
const store = useProjectStore()
const showAddModal = ref(true)

function handleClose() {
  showAddModal.value = false
  router.push('/')
}

function handleAddProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) {
  const newProject = store.addProject(project)
  showAddModal.value = false
  router.push(`/projects/${newProject.id}`)
}
</script>

<style lang="scss" scoped>
.projects-page {
  min-height: 100vh;
  background: var(--bg-secondary);
  padding: $spacing-xl;
}

.page-header {
  max-width: 1200px;
  margin: 0 auto $spacing-xl;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }
}
</style>
