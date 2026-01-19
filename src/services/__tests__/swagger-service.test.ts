import { describe, it, expect, vi, beforeEach } from 'vitest'
import { swaggerService } from '../swagger-service'
import type { Project } from '@/types/project'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('swagger-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchProjectSwagger', () => {
    it('Swagger 문서를 성공적으로 가져와야 함', async () => {
      const mockSwagger = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0'
        },
        paths: {
          '/pets': {
            get: {
              summary: 'List pets',
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        }
      }

      mockedAxios.mockResolvedValue({ data: mockSwagger } as any)

      const project: Project = {
        id: 'test-1',
        name: 'Test Project',
        swaggerUrl: 'https://api.example.com/swagger.json',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      }

      const result = await swaggerService.fetchProjectSwagger(project)

      expect(result).toEqual(mockSwagger)
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/swagger.json',
          method: 'GET'
        })
      )
    })

    it('API Key가 있으면 헤더에 추가해야 함', async () => {
      const mockSwagger = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      }

      mockedAxios.mockResolvedValue({ data: mockSwagger } as any)

      const project: Project = {
        id: 'test-1',
        name: 'Test Project',
        swaggerUrl: 'https://api.example.com/swagger.json',
        apiKey: 'test-key-123',
        apiKeyHeader: 'X-API-Key',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      }

      await swaggerService.fetchProjectSwagger(project)

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-key-123'
          })
        })
      )
    })

    it('에러 발생 시 적절한 에러를 던져야 함', async () => {
      const project: Project = {
        id: 'test-1',
        name: 'Test Project',
        swaggerUrl: 'https://api.example.com/swagger.json',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      }

      const axiosError = new Error('Network error')
      mockedAxios.mockRejectedValue(axiosError)
      vi.mocked(axios.isAxiosError).mockReturnValue(false)

      await expect(swaggerService.fetchProjectSwagger(project)).rejects.toThrow()
    })
  })

  describe('validateSwagger', () => {
    it('유효한 Swagger 문서를 검증해야 함', () => {
      const validSwagger = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0'
        },
        paths: {
          '/pets': {}
        }
      }

      expect(swaggerService.validateSwagger(validSwagger)).toBe(true)
    })

    it('유효하지 않은 Swagger 문서를 거부해야 함', () => {
      expect(swaggerService.validateSwagger(null)).toBe(false)
      expect(swaggerService.validateSwagger({})).toBe(false)
      expect(swaggerService.validateSwagger({ openapi: '3.0.0' })).toBe(false)
      expect(swaggerService.validateSwagger({ info: {}, paths: {} })).toBe(false)
    })
  })

  describe('compressSwagger / decompressSwagger', () => {
    it('Swagger 문서를 압축하고 압축 해제해야 함', () => {
      const swagger = {
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

      const compressed = swaggerService.compressSwagger(swagger)
      expect(typeof compressed).toBe('string')

      const decompressed = swaggerService.decompressSwagger(compressed)
      expect(decompressed).toEqual(swagger)
    })
  })
})
