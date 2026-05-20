import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { useSettingsStore } from '@/stores/settings-store'
import { useAuthStore } from '@/stores/auth-store'

export class ApiService {
  private client: AxiosInstance

  // baseURL 정규화: 끝의 슬래시 제거 및 잘못된 경로 제거
  private normalizeBaseURL(url: string | undefined): string | undefined {
    if (!url) return undefined
    
    let normalized = url.trim()
    
    // 끝의 슬래시 제거
    normalized = normalized.replace(/\/+$/, '')
    
    // Swagger 문서 경로 제거 (일반적인 패턴)
    const swaggerPaths = ['/v3/api-docs', '/swagger-ui', '/swagger', '/api-docs']
    for (const path of swaggerPaths) {
      if (normalized.endsWith(path)) {
        normalized = normalized.slice(0, -path.length)
      }
    }
    
    return normalized || undefined
  }

  constructor() {
    const settingsStore = useSettingsStore()
    const baseURL = this.normalizeBaseURL(settingsStore.apiBaseUrl)

    this.client = axios.create({
      ...(baseURL && { baseURL }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    const settingsStore = useSettingsStore()

    // 요청 인터셉터: JWT 토큰 및 API Key 추가
    this.client.interceptors.request.use(
      (config) => {
        const authStore = useAuthStore()
        if (authStore.token) {
          config.headers.set('Authorization', `Bearer ${authStore.token}`)
        }

        const settings = settingsStore.settings
        if (settings.apiKey && settings.apiKeyHeader) {
          config.headers.set(settings.apiKeyHeader, settings.apiKey)
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // 응답 인터셉터: 에러 처리 + 401 시 토큰 자동 갱신 후 재시도
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            const status = error.response.status
            const statusText = error.response.statusText
            const url = error.config?.url || '알 수 없는 URL'
            const originalRequest = error.config as any

            // 401: 리프레시 토큰으로 재시도 (한 번만, _retry 플래그로 무한루프 방지)
            if (status === 401 && !originalRequest._retry) {
              originalRequest._retry = true
              const authStore = useAuthStore()
              const refreshed = await authStore.refreshTokens()

              if (refreshed && authStore.token) {
                originalRequest.headers = {
                  ...originalRequest.headers,
                  Authorization: `Bearer ${authStore.token}`
                }
                return this.client(originalRequest)
              }

              await authStore.logout()
              throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
            }

            const backendErrorMessage =
              error.response.data?.error?.message ||
              error.response.data?.message ||
              null

            if (backendErrorMessage) throw new Error(backendErrorMessage)

            if (status === 404) {
              throw new Error(
                `API 엔드포인트를 찾을 수 없습니다: ${url}\n` +
                `서버 URL이 올바른지 확인하세요. (예: http://localhost:3001)`
              )
            }

            throw new Error(
              `API Error: ${status} - ${statusText}\n` +
              `요청 URL: ${error.config?.baseURL || ''}${url}`
            )
          } else if (error.request) {
            throw new Error(
              `API 서버에 연결할 수 없습니다.\n` +
              `서버가 실행 중인지 확인하세요. (Base URL: ${error.config?.baseURL || '설정되지 않음'})`
            )
          }
        }
        throw error
      }
    )
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  // 설정이 변경되면 클라이언트 재생성
  recreateClient() {
    const settingsStore = useSettingsStore()
    const baseURL = this.normalizeBaseURL(settingsStore.apiBaseUrl)

    console.log('[ApiService] recreateClient 호출됨:', {
      'settingsStore.apiBaseUrl': settingsStore.apiBaseUrl,
      'settingsStore.settings': settingsStore.settings,
      'normalizedBaseURL': baseURL
    })

    this.client = axios.create({
      ...(baseURL && { baseURL }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('[ApiService] Axios client 생성 완료:', {
      baseURL: baseURL || '없음 (LocalStorage 모드)',
      config: this.client.defaults
    })

    // 인터셉터 재설정
    this.setupInterceptors()
  }
}

export const apiService = new ApiService()
