import { describe, it, expect } from 'vitest'
import { buildExampleFromSchema } from '@/utils/build-example-from-schema'

describe('build-example-from-schema', () => {
  it('중첩 array/object 스키마를 example 형식 JSON으로 조립해야 함', () => {
    const schema = {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: '응답 데이터 (성공 시). 엔드포인트마다 타입이 다릅니다.',
          items: {
            type: 'object',
            description: '기관별 진료과 1건',
            properties: {
              id: {
                type: 'string',
                description: '진료과 UUID (DIACON 내부)',
                example: '770e8400-e29b-41d4-a716-446655440002'
              },
              code: {
                type: 'string',
                description: '진료과 코드',
                example: 'ENDO'
              },
              nameKo: {
                type: 'string',
                description: '진료과명 (한글)',
                example: '내분비내과'
              },
              category: {
                type: 'string',
                description: '분류 enum',
                example: 'INTERNAL_MEDICINE'
              },
              categoryName: {
                type: 'string',
                description: '분류 한글명',
                example: '내과계'
              }
            },
            required: ['category', 'categoryName', 'code', 'id', 'nameKo'],
            _schemaName: 'OrganizationSpecialtyItem'
          }
        }
      }
    }

    expect(buildExampleFromSchema(schema)).toEqual({
      data: [
        {
          id: '770e8400-e29b-41d4-a716-446655440002',
          code: 'ENDO',
          nameKo: '내분비내과',
          category: 'INTERNAL_MEDICINE',
          categoryName: '내과계'
        }
      ]
    })
  })

  it('최상위 example이 있으면 우선 사용해야 함', () => {
    const schema = {
      type: 'object',
      example: { ok: true },
      properties: {
        ok: { type: 'boolean' }
      }
    }

    expect(buildExampleFromSchema(schema)).toEqual({ ok: true })
  })
})
