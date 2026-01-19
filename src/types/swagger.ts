export interface SwaggerPath {
  [method: string]: {
    summary?: string
    description?: string
    parameters?: SwaggerParameter[]
    requestBody?: SwaggerRequestBody
    responses?: SwaggerResponses
    tags?: string[]
  }
}

export interface SwaggerParameter {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  required?: boolean
  schema?: SwaggerSchema
  description?: string
}

export interface SwaggerRequestBody {
  content?: {
    [contentType: string]: {
      schema?: SwaggerSchema
    }
  }
  required?: boolean
}

export interface SwaggerResponses {
  [statusCode: string]: {
    description?: string
    content?: {
      [contentType: string]: {
        schema?: SwaggerSchema
      }
    }
  }
}

export interface SwaggerSchema {
  type?: string
  properties?: Record<string, SwaggerSchema>
  required?: string[]
  items?: SwaggerSchema
  $ref?: string
  enum?: unknown[]
  format?: string
  description?: string
}

export interface SwaggerDocument {
  openapi?: string
  swagger?: string
  info: {
    title: string
    version: string
    description?: string
  }
  paths: Record<string, SwaggerPath>
  components?: {
    schemas?: Record<string, SwaggerSchema>
  }
}
