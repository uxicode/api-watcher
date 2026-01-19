import type { SwaggerSchema } from '@/types/swagger'

// 타입만 반환하는 헬퍼 함수 (인터페이스 정의 없이)
function getTypeString(schema: SwaggerSchema | undefined, indent: number = 0): string {
  if (!schema) {
    return 'unknown'
  }

  const indentStr = '  '.repeat(indent)
  const nextIndent = indent + 1
  const nextIndentStr = '  '.repeat(nextIndent)

  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop() || 'Unknown'
    return refName
  }

  switch (schema.type) {
    case 'object':
      if (!schema.properties || Object.keys(schema.properties).length === 0) {
        return '{ [key: string]: unknown }'
      }
      // 객체는 인라인 타입으로 변환
      const requiredFields = schema.required || []
      const properties = Object.entries(schema.properties)
        .map(([key, value]) => {
          const isRequired = requiredFields.includes(key)
          const optional = isRequired ? '' : '?'
          const type = getTypeString(value, nextIndent)
          // 중첩 객체나 배열인 경우 줄바꿈 처리
          const needsNewline = type.includes('\n') || type.includes('[]') || type.includes('{')
          if (needsNewline) {
            return `${nextIndentStr}${key}${optional}: ${type.replace(/\n/g, `\n${nextIndentStr}`)}`
          }
          return `${nextIndentStr}${key}${optional}: ${type}`
        })
        .join('\n')
      return `{\n${properties}\n${indentStr}}`
    case 'array':
      if (!schema.items) {
        return 'unknown[]'
      }
      const itemType = getTypeString(schema.items, indent)
      // 배열의 아이템이 객체인 경우 괄호로 감싸기
      if (itemType.includes('{') || itemType.includes('\n')) {
        return `(${itemType})[]`
      }
      return `${itemType}[]`
    case 'string':
      if (schema.enum) {
        const enumValues = schema.enum.map(v => `'${v}'`).join(' | ')
        return enumValues
      }
      return 'string'
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'null':
      return 'null'
    default:
      return 'unknown'
  }
}

export function swaggerSchemaToTypeScript(
  schema: SwaggerSchema | undefined,
  typeName: string = 'Response',
  indent: number = 0
): string {
  if (!schema) {
    return `export interface ${typeName} {\n  // No schema defined\n}`
  }

  const typeString = getTypeString(schema)
  
  // 타입이 객체인 경우 인터페이스로 변환
  if (typeString.startsWith('{')) {
    const properties = typeString.slice(1, -1).trim()
    return `export interface ${typeName} {\n${properties}\n}`
  }
  
  // 단순 타입인 경우 type alias 사용
  return `export type ${typeName} = ${typeString}`
}

export function generateTypeScriptType(
  schema: SwaggerSchema | undefined,
  identifier: string,
  endpointPath: string,
  method: string,
  typeKind: 'Response' | 'Request' | 'Param' = 'Response'
): string {
  if (!schema) {
    return ''
  }

  // 타입 이름 생성
  const methodUpper = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()
  const pathParts = endpointPath
    .split('/')
    .filter(p => p && !p.startsWith('{'))
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
  
  let typeName = ''
  if (typeKind === 'Response') {
    typeName = `${methodUpper}${pathParts}Response${identifier}`
  } else if (typeKind === 'Request') {
    typeName = `${methodUpper}${pathParts}Request`
  } else if (typeKind === 'Param') {
    const paramNameUpper = identifier.charAt(0).toUpperCase() + identifier.slice(1)
    typeName = `${methodUpper}${pathParts}${paramNameUpper}Param`
  }

  return swaggerSchemaToTypeScript(schema, typeName)
}

// 하위 호환성을 위한 함수
export function generateResponseType(
  schema: SwaggerSchema | undefined,
  statusCode: string,
  endpointPath: string,
  method: string
): string {
  return generateTypeScriptType(schema, statusCode, endpointPath, method, 'Response')
}
