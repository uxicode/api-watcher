import { describe, it, expect } from 'vitest'
import { swaggerSchemaToTypeScript, generateTypeScriptType } from '../schema-to-typescript'
import type { SwaggerSchema } from '@/types/swagger'

describe('schema-to-typescript', () => {
  describe('swaggerSchemaToTypeScript', () => {
    it('기본 타입을 올바르게 변환해야 함', () => {
      const stringSchema: SwaggerSchema = { type: 'string' }
      expect(swaggerSchemaToTypeScript(stringSchema, 'StringType')).toContain('export type StringType = string')

      const numberSchema: SwaggerSchema = { type: 'number' }
      expect(swaggerSchemaToTypeScript(numberSchema, 'NumberType')).toContain('export type NumberType = number')

      const booleanSchema: SwaggerSchema = { type: 'boolean' }
      expect(swaggerSchemaToTypeScript(booleanSchema, 'BooleanType')).toContain('export type BooleanType = boolean')
    })

    it('enum 타입을 올바르게 변환해야 함', () => {
      const enumSchema: SwaggerSchema = {
        type: 'string',
        enum: ['active', 'inactive', 'pending']
      }
      const result = swaggerSchemaToTypeScript(enumSchema, 'StatusType')
      expect(result).toContain("'active' | 'inactive' | 'pending'")
    })

    it('객체 타입을 인터페이스로 변환해야 함', () => {
      const objectSchema: SwaggerSchema = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' }
        },
        required: ['id', 'name']
      }
      const result = swaggerSchemaToTypeScript(objectSchema, 'User')
      expect(result).toContain('export interface User')
      expect(result).toContain('id: number')
      expect(result).toContain('name: string')
      expect(result).toContain('email?: string')
    })

    it('배열 타입을 올바르게 변환해야 함', () => {
      const arraySchema: SwaggerSchema = {
        type: 'array',
        items: {
          type: 'string'
        }
      }
      const result = swaggerSchemaToTypeScript(arraySchema, 'StringArray')
      expect(result).toContain('string[]')
    })

    it('중첩 객체를 올바르게 변환해야 함', () => {
      const nestedSchema: SwaggerSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' }
            },
            required: ['id']
          }
        },
        required: ['user']
      }
      const result = swaggerSchemaToTypeScript(nestedSchema, 'Response')
      expect(result).toContain('export interface Response')
      expect(result).toContain('user:')
    })

    it('빈 객체를 올바르게 처리해야 함', () => {
      const emptySchema: SwaggerSchema = {
        type: 'object',
        properties: {}
      }
      const result = swaggerSchemaToTypeScript(emptySchema, 'Empty')
      expect(result).toContain('[key: string]: unknown')
    })

    it('$ref를 올바르게 처리해야 함', () => {
      const refSchema: SwaggerSchema = {
        $ref: '#/components/schemas/User'
      }
      const result = swaggerSchemaToTypeScript(refSchema, 'UserRef')
      expect(result).toContain('User')
    })
  })

  describe('generateTypeScriptType', () => {
    it('Response 타입을 올바르게 생성해야 함', () => {
      const schema: SwaggerSchema = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' }
        },
        required: ['id']
      }
      const result = generateTypeScriptType(schema, '200', '/pets', 'get', 'Response')
      expect(result).toContain('export interface GetPetsResponse200')
      expect(result).toContain('id: number')
      expect(result).toContain('name?: string')
    })

    it('Request 타입을 올바르게 생성해야 함', () => {
      const schema: SwaggerSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tag: { type: 'string' }
        },
        required: ['name']
      }
      const result = generateTypeScriptType(schema, '', '/pets', 'post', 'Request')
      expect(result).toContain('export interface PostPetsRequest')
      expect(result).toContain('name: string')
      expect(result).toContain('tag?: string')
    })

    it('Parameter 타입을 올바르게 생성해야 함', () => {
      const schema: SwaggerSchema = { type: 'integer' }
      const result = generateTypeScriptType(schema, 'limit', '/pets', 'get', 'Param')
      expect(result).toContain('export type GetPetsLimitParam = number')
    })
  })
})
