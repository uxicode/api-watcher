import type { Project, Snapshot } from '@/types/project'
import type { DiffResult } from '@/types/diff'
import { DIFF_TYPE } from '@/types/diff'

export const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: '백엔드 API',
    swaggerUrl: 'https://petstore.swagger.io/v2/swagger.json',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastCheckedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true
  },
  {
    id: 'project-2',
    name: '인증 서비스 API',
    swaggerUrl: 'https://api.example.com/swagger.json',
    apiKey: 'test-api-key-123',
    apiKeyHeader: 'X-API-Key',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastCheckedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true
  },
  {
    id: 'project-3',
    name: '결제 서비스 API',
    swaggerUrl: 'https://api.payment.example.com/openapi.json',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    lastCheckedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isActive: true
  }
]

export const mockSnapshots: Snapshot[] = [
  {
    id: 'snapshot-1-1',
    projectId: 'project-1',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    data: JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Pet Store API', version: '1.0.0' },
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            responses: {
              '200': {
                description: 'A list of pets',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          tag: { type: 'string' }
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
    }),
    version: '1.0.0'
  },
  {
    id: 'snapshot-1-2',
    projectId: 'project-1',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    data: JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Pet Store API', version: '1.1.0' },
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            parameters: [
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer' },
                description: 'How many items to return'
              }
            ],
            responses: {
              '200': {
                description: 'A list of pets',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          tag: { type: 'string' },
                          status: { type: 'string', enum: ['available', 'pending', 'sold'] }
                        },
                        required: ['id', 'name']
                      }
                    }
                  }
                }
              }
            }
          },
          post: {
            summary: 'Create a pet',
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
                description: 'Pet created'
              }
            }
          }
        }
      }
    }),
    version: '1.1.0'
  },
  {
    id: 'snapshot-2-1',
    projectId: 'project-2',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    data: JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Auth Service API', version: '2.0.0' },
      paths: {
        '/auth/login': {
          post: {
            summary: 'User login',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    },
                    required: ['username', 'password']
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Login successful',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        token: { type: 'string' },
                        expiresIn: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }),
    version: '2.0.0'
  }
]

export const mockDiffResults: DiffResult[] = [
  {
    projectId: 'project-1',
    previousSnapshotId: 'snapshot-1-1',
    currentSnapshotId: 'snapshot-1-2',
    comparedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    endpointDiffs: [
      {
        path: '/pets',
        method: 'get',
        isBreaking: false,
        changes: [
          {
            type: DIFF_TYPE.ADDED,
            path: 'GET /pets/parameters/limit',
            newValue: {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer' }
            },
            description: '파라미터 추가: limit'
          },
          {
            type: DIFF_TYPE.MODIFIED,
            path: 'GET /pets/responses/200',
            oldValue: {
              description: 'A list of pets',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        tag: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            newValue: {
              description: 'A list of pets',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        tag: { type: 'string' },
                        status: { type: 'string', enum: ['available', 'pending', 'sold'] }
                      },
                      required: ['id', 'name']
                    }
                  }
                }
              }
            },
            description: 'Response 스키마 변경: status 필드 추가, required 필드 추가'
          }
        ]
      },
      {
        path: '/pets',
        method: 'post',
        isBreaking: false,
        changes: [
          {
            type: DIFF_TYPE.ADDED,
            path: 'POST /pets',
            newValue: {
              summary: 'Create a pet',
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
                  description: 'Pet created'
                }
              }
            },
            description: '신규 API 추가: POST /pets'
          }
        ]
      }
    ],
    summary: {
      added: 1,
      removed: 0,
      modified: 1,
      breaking: 0
    }
  },
  {
    projectId: 'project-2',
    previousSnapshotId: 'snapshot-2-1',
    currentSnapshotId: 'snapshot-2-1',
    comparedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endpointDiffs: [],
    summary: {
      added: 0,
      removed: 0,
      modified: 0,
      breaking: 0
    }
  }
]
