import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Project, Snapshot } from '@/types/project'
import type { DiffResult } from '@/types/diff'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const snapshots = ref<Snapshot[]>([])
  const diffResults = ref<DiffResult[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const loadingProjects = ref<Set<string>>(new Set())

  // ── 헬퍼 ──────────────────────────────────────────────────
  function authUserId(): string {
    const authStore = useAuthStore()
    if (!authStore.user?.id) throw new Error('로그인이 필요합니다')
    return authStore.user.id
  }

  function handleError(e: unknown, fallback: string): never {
    const msg = e instanceof Error ? e.message : fallback
    error.value = msg
    throw new Error(msg)
  }

  // ── 프로젝트 CRUD ─────────────────────────────────────────
  async function loadProjectsFromBackend(silent = false) {
    try {
      isLoading.value = true
      if (!silent) error.value = null

      const userId = authUserId()
      const { data, error: dbError } = await supabase
        .from('projects')
        .select('*')
        .eq('userId', userId)
        .order('updatedAt', { ascending: false })

      if (dbError) throw dbError
      projects.value = (data ?? []) as Project[]
    } catch (e) {
      if (!silent) handleError(e, '프로젝트 목록을 불러오는데 실패했습니다')
      console.error('[loadProjectsFromBackend]', e)
    } finally {
      isLoading.value = false
    }
  }

  async function addProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) {
    isLoading.value = true
    error.value = null
    try {
      const userId = authUserId()
      const now = new Date().toISOString()
      const { data, error: dbError } = await supabase
        .from('projects')
        .insert({
          id: crypto.randomUUID(),
          name: project.name,
          swaggerUrl: project.swaggerUrl,
          apiKey: project.apiKey ?? null,
          apiKeyHeader: project.apiKeyHeader ?? null,
          userId,
          isActive: project.isActive ?? true,
          createdAt: now,
          updatedAt: now
        })
        .select()
        .single()

      if (dbError) throw dbError
      const newProject = data as Project
      projects.value.push(newProject)
      return newProject
    } catch (e) {
      handleError(e, '프로젝트 추가에 실패했습니다')
    } finally {
      isLoading.value = false
    }
  }

  async function updateProject(id: string, updates: Partial<Project>) {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: dbError } = await supabase
        .from('projects')
        .update({ ...updates, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (dbError) throw dbError
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) projects.value[index] = data as Project
    } catch (e) {
      handleError(e, '프로젝트 업데이트에 실패했습니다')
    } finally {
      isLoading.value = false
    }
  }

  async function deleteProject(id: string) {
    isLoading.value = true
    error.value = null
    try {
      const { error: dbError } = await supabase.from('projects').delete().eq('id', id)
      if (dbError) throw dbError
      projects.value = projects.value.filter(p => p.id !== id)
      snapshots.value = snapshots.value.filter(s => s.projectId !== id)
      diffResults.value = diffResults.value.filter(d => d.projectId !== id)
    } catch (e) {
      handleError(e, '프로젝트 삭제에 실패했습니다')
    } finally {
      isLoading.value = false
    }
  }

  // ── 스냅샷 ────────────────────────────────────────────────
  async function loadSnapshotsFromBackend(projectId: string) {
    try {
      const { data, error: dbError } = await supabase
        .from('snapshots')
        .select('*')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false })

      if (dbError) throw dbError
      snapshots.value = [
        ...snapshots.value.filter(s => s.projectId !== projectId),
        ...(data ?? []) as Snapshot[]
      ]
    } catch (e) {
      console.error('[loadSnapshotsFromBackend]', e)
    }
  }

  // ── Diff ──────────────────────────────────────────────────
  async function loadDiffsFromBackend(projectId: string) {
    try {
      const { data, error: dbError } = await supabase
        .from('diff_results')
        .select('*')
        .eq('projectId', projectId)
        .order('comparedAt', { ascending: false })

      if (dbError) throw dbError
      diffResults.value = [
        ...diffResults.value.filter(d => d.projectId !== projectId),
        ...(data ?? []) as DiffResult[]
      ]
    } catch (e) {
      console.error('[loadDiffsFromBackend]', e)
    }
  }

  async function loadDiffById(diffId: string) {
    try {
      const { data, error: dbError } = await supabase
        .from('diff_results')
        .select('*')
        .eq('id', diffId)
        .single()

      if (dbError) throw dbError
      const diff = data as DiffResult
      const index = diffResults.value.findIndex(d => d.currentSnapshotId === diff.currentSnapshotId)
      if (index !== -1) diffResults.value[index] = diff
      else diffResults.value.push(diff)
      return diff
    } catch (e) {
      console.error('[loadDiffById]', e)
      return null
    }
  }

  // ── Swagger 수집 (Edge Function 호출) ────────────────────
  async function collectSwagger(projectId: string) {
    loadingProjects.value.add(projectId)
    error.value = null
    try {
      const { data, error: fnError } = await supabase.functions.invoke('collect-swagger', {
        body: { projectId }
      })
      if (fnError) throw fnError

      if (data.status === 'no_changes') {
        await loadProjectsFromBackend(true)
        if (data.lastSnapshot) {
          return snapshots.value.find(s => s.id === data.lastSnapshot.id) ?? null
        }
        return null
      }

      if (data.snapshot) {
        snapshots.value.push(data.snapshot as Snapshot)
        if (data.diffResult) diffResults.value.unshift(data.diffResult as DiffResult)
        await loadProjectsFromBackend(true)
        return data.snapshot as Snapshot
      }

      return null
    } catch (e) {
      handleError(e, 'Swagger 수집에 실패했습니다')
    } finally {
      loadingProjects.value.delete(projectId)
    }
  }

  // ── Computed ──────────────────────────────────────────────
  const getProject = computed(() => (id: string) => projects.value.find(p => p.id === id))
  const isProjectLoading = computed(() => (id: string) => loadingProjects.value.has(id))
  const getSnapshotsByProject = computed(() => (id: string) =>
    snapshots.value.filter(s => s.projectId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  )
  const getLatestDiff = computed(() => (id: string) => diffResults.value.find(d => d.projectId === id))
  const getDiffsByProject = computed(() => (id: string) =>
    diffResults.value.filter(d => d.projectId === id).sort((a, b) => new Date(b.comparedAt).getTime() - new Date(a.comparedAt).getTime())
  )

  // ── 초기화 ────────────────────────────────────────────────
  async function initialize() {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      await loadProjectsFromBackend(true)
    }
  }

  initialize().catch(e => console.error('[initialize]', e))

  return {
    projects, snapshots, diffResults, isLoading, error, loadingProjects,
    isProjectLoading, getProject,
    addProject, updateProject, deleteProject,
    collectSwagger,
    getSnapshotsByProject, getLatestDiff, getDiffsByProject,
    loadProjectsFromBackend, loadSnapshotsFromBackend,
    loadDiffsFromBackend, loadDiffById,
    initialize
  }
})
