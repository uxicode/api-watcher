import { describe, it, expect } from 'vitest'
import { diffService } from '../diff-service'
import type { SwaggerDocument } from '@/types/swagger'
import { DIFF_TYPE } from '@/types/diff'

describe('diff-service', () => {
  const createSwaggerDoc = (paths: SwaggerDocument['paths']): SwaggerDocument => ({
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    paths
  })

  describe('compareSwaggerDocuments', () => {
    it('신규 API 추가를 감지해야 함', () => {
      const previous = createSwaggerDoc({})
      const current = createSwaggerDoc({
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
      })

      const result = diffService.compareSwaggerDocuments(
        previous,
        current,
        'project-1',
        'snapshot-1',
        'snapshot-2'
      )

      expect(result.endpointDiffs).toHaveLength(1)
      expect(result.endpointDiffs[0].path).toBe('/pets')
      expect(result.endpointDiffs[0].method).toBe('get')
      expect(result.endpointDiffs[0].changes.some(c => c.type === DIFF_TYPE.ADDED)).toBe(true)
      expect(result.summary.added).toBeGreaterThan(0)
    })

    it('API 삭제를 감지해야 함', () => {
      const previous = createSwaggerDoc({
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
      })
      const current = createSwaggerDoc({})

      const result = diffService.compareSwaggerDocuments(
        previous,
        current,
        'project-1',
        'snapshot-1',
        'snapshot-2'
      )

      expect(result.endpointDiffs).toHaveLength(1)
      expect(result.endpointDiffs[0].changes.some(c => c.type === DIFF_TYPE.REMOVED)).toBe(true)
      expect(result.endpointDiffs[0].isBreaking).toBe(true)
      expect(result.summary.removed).toBeGreaterThan(0)
    })

    it('Response 변경을 감지해야 함', () => {
      const previous = createSwaggerDoc({
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
      })
      const current = createSwaggerDoc({
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
                        name: { type: 'string' },
                        status: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })

      const result = diffService.compareSwaggerDocuments(
        previous,
        current,
        'project-1',
        'snapshot-1',
        'snapshot-2'
      )

      expect(result.endpointDiffs).toHaveLength(1)
      expect(result.endpointDiffs[0].changes.some(c => c.type === DIFF_TYPE.MODIFIED)).toBe(true)
      expect(result.summary.modified).toBeGreaterThan(0)
    })

    it('Parameter 추가를 감지해야 함', () => {
      const previous = createSwaggerDoc({
        '/pets': {
          get: {
            responses: {
              '200': {
                description: 'Success'
              }
            }
          }
        }
      })
      const current = createSwaggerDoc({
        '/pets': {
          get: {
            parameters: [
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer' }
              }
            ],
            responses: {
              '200': {
                description: 'Success'
              }
            }
          }
        }
      })

      const result = diffService.compareSwaggerDocuments(
        previous,
        current,
        'project-1',
        'snapshot-1',
        'snapshot-2'
      )

      expect(result.endpointDiffs).toHaveLength(1)
      const paramChanges = result.endpointDiffs[0].changes.filter(c => 
        c.path.includes('parameters')
      )
      expect(paramChanges.length).toBeGreaterThan(0)
      expect(paramChanges.some(c => c.type === DIFF_TYPE.ADDED)).toBe(true)
    })

    it('Request Body 변경을 감지해야 함', () => {
      const previous = createSwaggerDoc({
        '/pets': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Created'
              }
            }
          }
        }
      })
      const current = createSwaggerDoc({
        '/pets': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      tag: { type: 'string' }
                    },
                    required: ['name']
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Created'
              }
            }
          }
        }
      })

      const result = diffService.compareSwaggerDocuments(
        previous,
        current,
        'project-1',
        'snapshot-1',
        'snapshot-2'
      )

      expect(result.endpointDiffs).toHaveLength(1)
      const bodyChanges = result.endpointDiffs[0].changes.filter(c => 
        c.path.includes('requestBody')
      )
      expect(bodyChanges.length).toBeGreaterThan(0)
    })

    it('변경사항이 없으면 빈 diff를 반환해야 함', () => {
      const doc = createSwaggerDoc({
        '/pets': {
          get: {
            responses: {
              '200': {
                description: 'Success'
              }
            }
          }
        }
      })

      const result = diffService.compareSwaggerDocuments(
        doc,
        doc,
        'project-1',
        'snapshot-1',
        'snapshot-2'
      )

      expect(result.endpointDiffs).toHaveLength(0)
      expect(result.summary.added).toBe(0)
      expect(result.summary.removed).toBe(0)
      expect(result.summary.modified).toBe(0)
    })
  })
})
