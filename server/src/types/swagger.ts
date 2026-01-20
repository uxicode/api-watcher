export interface SwaggerDocument {
  openapi?: string
  swagger?: string
  info: {
    title: string
    version: string
    description?: string
  }
  paths: SwaggerPath
  components?: unknown
  servers?: unknown[]
}

export interface SwaggerPath {
  [path: string]: {
    [method: string]: SwaggerOperation
  }
}

export interface SwaggerOperation {
  summary?: string
  description?: string
  parameters?: SwaggerParameter[]
  requestBody?: unknown
  responses?: Record<string, unknown>
  tags?: string[]
}

export interface SwaggerParameter {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  required?: boolean
  schema?: unknown
  description?: string
}
