export const ISSUANCE_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

export type IssuanceMethod = (typeof ISSUANCE_METHODS)[number]

export interface TokenIssuanceConfig {
  enabled: boolean
  method: IssuanceMethod
  url: string
  body: string
}

export function createDefaultTokenIssuanceConfig(): TokenIssuanceConfig {
  return {
    enabled: false,
    method: 'post',
    url: '',
    body: ''
  }
}
