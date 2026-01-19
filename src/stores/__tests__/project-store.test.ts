import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '../project-store'
import type { Project } from '@/types/project'
import { swaggerService } from '@/services/swagger-service'

vi.mock('@/services/swagger-service', () => ({
  swaggerService: {
    fetchProjectSwagger: vi.fn(),
    validateSwagger: vi.fn().mockReturnValue(true),
    compressSwagger: vi.fn((data) => JSON.stringify(data)),
    decompressSwagger: vi.fn((data) => JSON.parse(data))
  }
}))

describe('project-store', () => {
  beforeEach(() => {
    // localStorage를 먼저 클리어하고 빈 배열을 저장하여 목 데이터 로드 방지
    localStorage.clear()
    localStorage.setItem('api-watcher-projects', '[]')
    localStorage.setItem('api-watcher-snapshots', '[]')
    localStorage.setItem('api-watcher-diffs', '[]')
    // 새로운 Pinia 인스턴스 생성
    setActivePinia(createPinia())
  })

  describe('addProject', () => {
    it('프로젝트를 추가해야 함', () => {
      const store = useProjectStore()
      
      const newProject = store.addProject({
        name: 'Test Project',
        swaggerUrl: 'https://api.example.com/swagger.json',
        isActive: true
      })

      expect(newProject.id).toBeDefined()
      expect(newProject.name).toBe('Test Project')
      expect(newProject.swaggerUrl).toBe('https://api.example.com/swagger.json')
      expect(store.projects).toHaveLength(1)
    })

    it('프로젝트를 LocalStorage에 저장해야 함', () => {
      const store = useProjectStore()
      
      store.addProject({
        name: 'Test Project',
        swaggerUrl: 'https://api.example.com/swagger.json',
        isActive: true
      })

      const stored = localStorage.getItem('api-watcher-projects')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].name).toBe('Test Project')
    })
  })

  describe('updateProject', () => {
    it('프로젝트를 업데이트해야 함', async () => {
      const store = useProjectStore()
      
      const project = store.addProject({
        name: 'Test Project',
        swaggerUrl: 'https://api.example.com/swagger.json',
        isActive: true
      })

      const originalUpdatedAt = project.updatedAt
      
      // 약간의 지연을 주어 시간 차이를 보장
      await new Promise(resolve => setTimeout(resolve, 10))
      
      store.updateProject(project.id, { name: 'Updated Project' })

      const updated = store.getProject(project.id)
      expect(updated?.name).toBe('Updated Project')
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt)
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime())
    })
  })

  describe('deleteProject', () => {
    it('프로젝트를 삭제해야 함', () => {
      const store = useProjectStore()
      
      const project1 = store.addProject({
        name: 'Project 1',
        swaggerUrl: 'https://api.example.com/swagger1.json',
        isActive: true
      })
      
      const project2 = store.addProject({
        name: 'Project 2',
        swaggerUrl: 'https://api.example.com/swagger2.json',
        isActive: true
      })

      store.deleteProject(project1.id)

      expect(store.projects).toHaveLength(1)
      expect(store.projects[0].id).toBe(project2.id)
    })

    it('프로젝트 삭제 시 관련 스냅샷과 diff도 삭제해야 함', () => {
      const store = useProjectStore()
      
      const project = store.addProject({
        name: 'Test Project',
        swaggerUrl: 'https://api.example.com/swagger.json',
        isActive: true
      })

      // 스냅샷 추가
      store.snapshots.push({
        id: 'snapshot-1',
        projectId: project.id,
        createdAt: new Date().toISOString(),
        data: '{}',
        version: '1.0.0'
      })

      // Diff 추가
      store.diffResults.push({
        projectId: project.id,
        previousSnapshotId: 'snapshot-0',
        currentSnapshotId: 'snapshot-1',
        comparedAt: new Date().toISOString(),
        endpointDiffs: [],
        summary: { added: 0, removed: 0, modified: 0, breaking: 0 }
      })

      store.deleteProject(project.id)

      expect(store.snapshots).toHaveLength(0)
      expect(store.diffResults).toHaveLength(0)
    })
  })

  describe('collectSwagger', () => {
    it('Swagger를 수집하고 스냅샷을 생성해야 함', async () => {
      const store = useProjectStore()
      
      const project = store.addProject({
        name: 'Test Project',
        swaggerUrl: 'https://api.example.com/swagger.json',
        isActive: true
      })

      const mockSwagger = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0'
        },
        paths: {
          '/pets': {
            get: {
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        }
      }

      vi.mocked(swaggerService.fetchProjectSwagger).mockResolvedValue(mockSwagger as any)

      const snapshot = await store.collectSwagger(project.id)

      expect(snapshot).toBeDefined()
      expect(snapshot.projectId).toBe(project.id)
      expect(snapshot.version).toBe('1.0.0')
      expect(store.snapshots).toHaveLength(1)
    })

    it('이전 스냅샷과 비교하여 diff를 생성해야 함', async () => {
      const store = useProjectStore()
      
      const project = store.addProject({
        name: 'Test Project',
        swaggerUrl: 'https://api.example.com/swagger.json',
        isActive: true
      })

      const mockSwagger1 = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pets': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      const mockSwagger2 = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.1.0' },
        paths: {
          '/pets': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      vi.mocked(swaggerService.fetchProjectSwagger)
        .mockResolvedValueOnce(mockSwagger1 as any)
        .mockResolvedValueOnce(mockSwagger2 as any)

      await store.collectSwagger(project.id)
      await store.collectSwagger(project.id)

      expect(store.diffResults).toHaveLength(1)
      expect(store.diffResults[0].endpointDiffs.length).toBeGreaterThan(0)
    })
  })
})
