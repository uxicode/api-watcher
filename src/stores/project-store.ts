import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, Snapshot } from '@/types/project'
import type { DiffResult } from '@/types/diff'
import { swaggerService } from '@/services/swagger-service'
import { diffService } from '@/services/diff-service'
import { apiService } from '@/services/api-service'
import { useSettingsStore } from './settings-store'
import { mockProjects, mockSnapshots, mockDiffResults } from '@/data/mock-data'

// 백엔드 API 응답 타입 (Prisma에서 반환하는 형식)
interface ApiProject {
  id: string
  name: string
  swaggerUrl: string
  apiKey: string | null
  apiKeyHeader: string | null
  createdAt: string
  updatedAt: string
  lastCheckedAt: string | null
  isActive: boolean
}

interface ApiSnapshot {
  id: string
  projectId: string
  createdAt: string
  data: string
  version: string
}

interface ApiDiffResult {
  id: string
  projectId: string
  previousSnapshotId: string
  currentSnapshotId: string
  comparedAt: string
  endpointDiffs: unknown
  summary: unknown
}

// API 응답을 프론트엔드 타입으로 변환
function convertApiProject(apiProject: ApiProject): Project {
  return {
    id: apiProject.id,
    name: apiProject.name,
    swaggerUrl: apiProject.swaggerUrl,
    apiKey: apiProject.apiKey || undefined,
    apiKeyHeader: apiProject.apiKeyHeader || undefined,
    createdAt: apiProject.createdAt,
    updatedAt: apiProject.updatedAt,
    lastCheckedAt: apiProject.lastCheckedAt || undefined,
    isActive: apiProject.isActive
  }
}

function convertApiSnapshot(apiSnapshot: ApiSnapshot): Snapshot {
  return {
    id: apiSnapshot.id,
    projectId: apiSnapshot.projectId,
    createdAt: apiSnapshot.createdAt,
    data: apiSnapshot.data,
    version: apiSnapshot.version
  }
}

function convertApiDiffResult(apiDiff: ApiDiffResult): DiffResult {
  return {
    projectId: apiDiff.projectId,
    previousSnapshotId: apiDiff.previousSnapshotId,
    currentSnapshotId: apiDiff.currentSnapshotId,
    comparedAt: apiDiff.comparedAt,
    endpointDiffs: apiDiff.endpointDiffs as DiffResult['endpointDiffs'],
    summary: apiDiff.summary as DiffResult['summary']
  }
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const snapshots = ref<Snapshot[]>([])
  const diffResults = ref<DiffResult[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const settingsStore = useSettingsStore()
  // apiBaseUrl이 설정되어 있는지 확인 (빈 문자열이 아닌 실제 값이 있는지)
  const useBackend = computed(() => {
    const url = settingsStore.settings.apiBaseUrl
    const result = !!url && url.trim() !== ''
    console.log('[ProjectStore] useBackend computed:', {
      url,
      result,
      settingsStoreApiBaseUrl: settingsStore.apiBaseUrl,
      settingsValue: settingsStore.settings
    })
    return result
  })

  // LocalStorage에 데이터 저장 (fallback용)
  function saveToStorage() {
    if (useBackend.value) return // 백엔드 사용 시 LocalStorage 저장 안 함
    
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

  // LocalStorage에서 데이터 로드 (fallback용)
  function loadFromStorage() {
    if (useBackend.value) return // 백엔드 사용 시 LocalStorage 로드 안 함
    
    try {
      const storedProjects = localStorage.getItem('api-watcher-projects')
      if (storedProjects) {
        projects.value = JSON.parse(storedProjects)
      }
      // 저장된 데이터가 없으면 빈 배열로 유지 (자동으로 목데이터 로드하지 않음)

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

  // 백엔드에서 프로젝트 목록 로드
  async function loadProjectsFromBackend(silent = false) {
    console.log('[loadProjectsFromBackend] 호출됨', { 
      useBackend: useBackend.value, 
      silent,
      apiBaseUrl: settingsStore.apiBaseUrl 
    })
    
    if (!useBackend.value) {
      console.log('[loadProjectsFromBackend] 백엔드 미사용으로 중단')
      return
    }

    try {
      isLoading.value = true
      if (!silent) {
        error.value = null
      }

      console.log('[loadProjectsFromBackend] API 요청 시작')
      const apiProjects = await apiService.get<ApiProject[]>('/api/projects')
      console.log('[loadProjectsFromBackend] API 응답 받음', apiProjects)
      
      projects.value = apiProjects.map(convertApiProject)
      console.log('[loadProjectsFromBackend] 프로젝트 변환 완료', projects.value.length, '개')

      // 스냅샷과 diff는 별도로 로드하지 않음 (필요시 개별 로드)
    } catch (e) {
      if (!silent) {
        error.value = e instanceof Error ? e.message : '프로젝트 목록을 불러오는데 실패했습니다.'
      }
      console.error('Failed to load projects:', e)
      // silent 모드가 아닐 때만 에러를 던짐
      if (!silent) {
        throw e
      }
    } finally {
      isLoading.value = false
    }
  }

  // 백엔드에서 프로젝트별 스냅샷 로드
  async function loadSnapshotsFromBackend(projectId: string) {
    if (!useBackend.value) return

    try {
      const apiSnapshots = await apiService.get<ApiSnapshot[]>(`/api/snapshots/project/${projectId}`)
      const convertedSnapshots = apiSnapshots.map(convertApiSnapshot)
      
      // 기존 스냅샷과 병합 (같은 프로젝트의 스냅샷만)
      snapshots.value = [
        ...snapshots.value.filter(s => s.projectId !== projectId),
        ...convertedSnapshots
      ]
    } catch (e) {
      console.error('Failed to load snapshots:', e)
    }
  }

  // 백엔드에서 프로젝트별 diff 로드
  async function loadDiffsFromBackend(projectId: string) {
    if (!useBackend.value) return

    try {
      const apiDiffs = await apiService.get<ApiDiffResult[]>(`/api/diffs/project/${projectId}`)
      const convertedDiffs = apiDiffs.map(convertApiDiffResult)
      
      // 기존 diff와 병합 (같은 프로젝트의 diff만)
      diffResults.value = [
        ...diffResults.value.filter(d => d.projectId !== projectId),
        ...convertedDiffs
      ]
    } catch (e) {
      console.error('Failed to load diffs:', e)
    }
  }

  // 백엔드에서 특정 diff 로드
  async function loadDiffById(diffId: string) {
    if (!useBackend.value) return null

    try {
      const apiDiff = await apiService.get<ApiDiffResult>(`/api/diffs/${diffId}`)
      const convertedDiff = convertApiDiffResult(apiDiff)
      
      // 기존 diff와 병합 (같은 id가 있으면 교체, 없으면 추가)
      const index = diffResults.value.findIndex(d => 
        d.projectId === convertedDiff.projectId && 
        d.currentSnapshotId === convertedDiff.currentSnapshotId
      )
      
      if (index !== -1) {
        diffResults.value[index] = convertedDiff
      } else {
        diffResults.value.push(convertedDiff)
      }
      
      return convertedDiff
    } catch (e) {
      console.error('Failed to load diff:', e)
      return null
    }
  }

  // 프로젝트 추가
  async function addProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) {
    if (useBackend.value) {
      try {
        isLoading.value = true
        error.value = null

        const apiProject = await apiService.post<ApiProject>('/api/projects', {
          name: project.name,
          swaggerUrl: project.swaggerUrl,
          apiKey: project.apiKey,
          apiKeyHeader: project.apiKeyHeader,
          isActive: project.isActive
        })

        const newProject = convertApiProject(apiProject)
        projects.value.push(newProject)
        return newProject
      } catch (e) {
        error.value = e instanceof Error ? e.message : '프로젝트 추가에 실패했습니다.'
        throw e
      } finally {
        isLoading.value = false
      }
    } else {
      // LocalStorage 사용
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
  }

  // 프로젝트 업데이트
  async function updateProject(id: string, updates: Partial<Project>) {
    if (useBackend.value) {
      try {
        isLoading.value = true
        error.value = null

        const apiProject = await apiService.put<ApiProject>(`/api/projects/${id}`, updates)
        const updatedProject = convertApiProject(apiProject)

        const index = projects.value.findIndex(p => p.id === id)
        if (index !== -1) {
          projects.value[index] = updatedProject
        }
      } catch (e) {
        error.value = e instanceof Error ? e.message : '프로젝트 업데이트에 실패했습니다.'
        throw e
      } finally {
        isLoading.value = false
      }
    } else {
      // LocalStorage 사용
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
  }

  // 프로젝트 삭제
  async function deleteProject(id: string) {
    if (useBackend.value) {
      try {
        isLoading.value = true
        error.value = null

        await apiService.delete(`/api/projects/${id}`)
        
        projects.value = projects.value.filter(p => p.id !== id)
        snapshots.value = snapshots.value.filter(s => s.projectId !== id)
        diffResults.value = diffResults.value.filter(d => d.projectId !== id)
      } catch (e) {
        error.value = e instanceof Error ? e.message : '프로젝트 삭제에 실패했습니다.'
        throw e
      } finally {
        isLoading.value = false
      }
    } else {
      // LocalStorage 사용
      projects.value = projects.value.filter(p => p.id !== id)
      snapshots.value = snapshots.value.filter(s => s.projectId !== id)
      diffResults.value = diffResults.value.filter(d => d.projectId !== id)
      saveToStorage()
    }
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
      if (useBackend.value) {
        // 백엔드 API 사용
        const response = await apiService.post<{
          snapshot: ApiSnapshot
          diffResult: ApiDiffResult | null
        }>(`/api/projects/${projectId}/collect`)

        const snapshot = convertApiSnapshot(response.snapshot)
        snapshots.value.push(snapshot)

        if (response.diffResult) {
          const diffResult = convertApiDiffResult(response.diffResult)
          diffResults.value.unshift(diffResult)
        }

        // 프로젝트 정보 갱신
        await loadProjectsFromBackend()

        return snapshot
      } else {
        // LocalStorage 사용 (기존 로직)
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
        await updateProject(projectId, { lastCheckedAt: snapshot.createdAt })

        saveToStorage()
        return snapshot
      }
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

  // 초기화 (에러 발생 시 조용히 처리)
  async function initialize() {
    console.log('[initialize] 시작', { useBackend: useBackend.value })
    if (useBackend.value) {
      // 백엔드 사용 시 조용히 로드 시도 (에러 발생해도 던지지 않음)
      console.log('[initialize] 백엔드 모드 - loadProjectsFromBackend 호출')
      await loadProjectsFromBackend(true)
    } else {
      console.log('[initialize] LocalStorage 모드 - loadFromStorage 호출')
      loadFromStorage()
    }
    console.log('[initialize] 완료')
  }

  // 초기화 실행 (에러가 발생해도 앱이 중단되지 않도록)
  initialize().catch((error) => {
    // 초기화 실패 시 조용히 처리 (이미 loadProjectsFromBackend에서 처리됨)
    console.error('[initialize] 초기화 실패:', error)
  })

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
    loadMockData,
    loadProjectsFromBackend,
    loadSnapshotsFromBackend,
    loadDiffsFromBackend,
    loadDiffById,
    initialize
  }
})
