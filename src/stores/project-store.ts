import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, Snapshot } from '@/types/project'
import type { DiffResult } from '@/types/diff'
import { swaggerService } from '@/services/swagger-service'
import { diffService } from '@/services/diff-service'
import { mockProjects, mockSnapshots, mockDiffResults } from '@/data/mock-data'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const snapshots = ref<Snapshot[]>([])
  const diffResults = ref<DiffResult[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // LocalStorage에 데이터 저장
  function saveToStorage() {
    try {
      localStorage.setItem('api-watcher-projects', JSON.stringify(projects.value))
      localStorage.setItem('api-watcher-snapshots', JSON.stringify(snapshots.value))
      localStorage.setItem('api-watcher-diffs', JSON.stringify(diffResults.value))
    } catch (e) {
      console.error('Failed to save to storage:', e)
    }
  }

  // 목데이터 로드 (개발/테스트용)
  function loadMockData() {
    projects.value = [...mockProjects]
    snapshots.value = [...mockSnapshots]
    diffResults.value = [...mockDiffResults]
    saveToStorage()
  }

  // LocalStorage에서 데이터 로드
  function loadFromStorage() {
    try {
      const storedProjects = localStorage.getItem('api-watcher-projects')
      if (storedProjects) {
        projects.value = JSON.parse(storedProjects)
      } else {
        // 저장된 데이터가 없으면 목데이터 로드 (개발 모드에서만)
        if (import.meta.env.DEV) {
          loadMockData()
          return
        }
      }

      const storedSnapshots = localStorage.getItem('api-watcher-snapshots')
      if (storedSnapshots) {
        snapshots.value = JSON.parse(storedSnapshots)
      }

      const storedDiffs = localStorage.getItem('api-watcher-diffs')
      if (storedDiffs) {
        diffResults.value = JSON.parse(storedDiffs)
      }
    } catch (e) {
      console.error('Failed to load from storage:', e)
    }
  }

  // 프로젝트 추가
  function addProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) {
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    projects.value.push(newProject)
    saveToStorage()
    return newProject
  }

  // 프로젝트 업데이트
  function updateProject(id: string, updates: Partial<Project>) {
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) {
      projects.value[index] = {
        ...projects.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      saveToStorage()
    }
  }

  // 프로젝트 삭제
  function deleteProject(id: string) {
    projects.value = projects.value.filter(p => p.id !== id)
    snapshots.value = snapshots.value.filter(s => s.projectId !== id)
    diffResults.value = diffResults.value.filter(d => d.projectId !== id)
    saveToStorage()
  }

  // 프로젝트 조회
  const getProject = computed(() => {
    return (id: string) => projects.value.find(p => p.id === id)
  })

  // Swagger 수집 및 스냅샷 생성
  async function collectSwagger(projectId: string) {
    const project = projects.value.find(p => p.id === projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    isLoading.value = true
    error.value = null

    try {
      const swagger = await swaggerService.fetchProjectSwagger(project)
      
      if (!swaggerService.validateSwagger(swagger)) {
        throw new Error('Invalid Swagger document')
      }

      const compressed = swaggerService.compressSwagger(swagger)
      const snapshot: Snapshot = {
        id: crypto.randomUUID(),
        projectId,
        createdAt: new Date().toISOString(),
        data: compressed,
        version: swagger.info.version
      }

      snapshots.value.push(snapshot)

      // 이전 스냅샷과 비교
      const previousSnapshots = snapshots.value
        .filter(s => s.projectId === projectId && s.id !== snapshot.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      if (previousSnapshots.length > 0) {
        const previousSnapshot = previousSnapshots[0]
        const previousSwagger = swaggerService.decompressSwagger(previousSnapshot.data)
        
        const diffResult = diffService.compareSwaggerDocuments(
          previousSwagger,
          swagger,
          projectId,
          previousSnapshot.id,
          snapshot.id
        )

        diffResults.value.unshift(diffResult)
      }

      // 프로젝트 업데이트 시간 갱신
      updateProject(projectId, { lastCheckedAt: snapshot.createdAt })

      saveToStorage()
      return snapshot
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  // 프로젝트별 스냅샷 조회
  const getSnapshotsByProject = computed(() => {
    return (projectId: string) => {
      return snapshots.value
        .filter(s => s.projectId === projectId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  })

  // 프로젝트별 최신 Diff 조회
  const getLatestDiff = computed(() => {
    return (projectId: string) => {
      return diffResults.value.find(d => d.projectId === projectId)
    }
  })

  // 프로젝트별 모든 Diff 조회
  const getDiffsByProject = computed(() => {
    return (projectId: string) => {
      return diffResults.value
        .filter(d => d.projectId === projectId)
        .sort((a, b) => new Date(b.comparedAt).getTime() - new Date(a.comparedAt).getTime())
    }
  })

  // 초기화
  loadFromStorage()

  return {
    projects,
    snapshots,
    diffResults,
    isLoading,
    error,
    addProject,
    updateProject,
    deleteProject,
    getProject,
    collectSwagger,
    getSnapshotsByProject,
    getLatestDiff,
    getDiffsByProject,
    loadMockData
  }
})
