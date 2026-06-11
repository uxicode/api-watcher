function buildExampleFromFieldSchema(fieldSchema: unknown): unknown {
  if (!fieldSchema || typeof fieldSchema !== 'object') return null

  const schema = fieldSchema as Record<string, unknown>

  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default

  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0]
  }

  if (schema.type === 'array' || schema.items) {
    const item = schema.items ? buildExampleFromSchema(schema.items) : null
    return item !== null ? [item] : []
  }

  if (schema.type === 'object' || schema.properties) {
    return buildExampleFromSchema(schema) ?? {}
  }

  if (schema.type === 'string') {
    return typeof schema.description === 'string' && schema.description
      ? `(${schema.description})`
      : 'string'
  }

  if (schema.type === 'integer' || schema.type === 'number') return 0
  if (schema.type === 'boolean') return false

  return null
}

export function buildExampleFromSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return null

  const record = schema as Record<string, unknown>

  if (record.example !== undefined) return record.example

  if (record.type === 'array' || record.items) {
    const itemsSchema = record.items
    if (itemsSchema) {
      const item = buildExampleFromSchema(itemsSchema)
      return item !== null ? [item] : []
    }
    return []
  }

  if ((record.type === 'object' || record.properties) && record.properties) {
    const result: Record<string, unknown> = {}

    for (const [key, prop] of Object.entries(record.properties as Record<string, unknown>)) {
      const value = buildExampleFromFieldSchema(prop)
      if (value !== null) {
        result[key] = value
      }
    }

    return result
  }

  return buildExampleFromFieldSchema(schema)
}
