export const ISSUANCE_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

export type IssuanceMethod = (typeof ISSUANCE_METHODS)[number]

export interface TokenIssuanceConfig {
  method: IssuanceMethod
  url: string
  body: string
  pinData: boolean
}

export function createDefaultTokenIssuanceConfig(): TokenIssuanceConfig {
  return {
    method: 'post',
    url: '',
    body: '',
    pinData: false
  }
}
