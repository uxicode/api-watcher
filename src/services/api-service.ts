import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { useSettingsStore } from '@/stores/settings-store'

export class ApiService {
  private client: AxiosInstance

  constructor() {
    const settingsStore = useSettingsStore()
    const baseURL = settingsStore.apiBaseUrl || undefined

    this.client = axios.create({
      ...(baseURL && { baseURL }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // 요청 인터셉터: API Key 추가
    this.client.interceptors.request.use(
      (config) => {
        const settings = settingsStore.settings
        if (settings.apiKey && settings.apiKeyHeader) {
          config.headers = {
            ...config.headers,
            [settings.apiKeyHeader]: settings.apiKey
          }
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 응답 인터셉터: 에러 처리
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            throw new Error(
              `API Error: ${error.response.status} - ${error.response.statusText}`
            )
          } else if (error.request) {
            throw new Error('API 서버에 연결할 수 없습니다.')
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
    const baseURL = settingsStore.apiBaseUrl || undefined

    this.client = axios.create({
      ...(baseURL && { baseURL }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // 인터셉터 재설정
    this.client.interceptors.request.use(
      (config) => {
        const settings = settingsStore.settings
        if (settings.apiKey && settings.apiKeyHeader) {
          config.headers = {
            ...config.headers,
            [settings.apiKeyHeader]: settings.apiKey
          }
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            throw new Error(
              `API Error: ${error.response.status} - ${error.response.statusText}`
            )
          } else if (error.request) {
            throw new Error('API 서버에 연결할 수 없습니다.')
          }
        }
        throw error
      }
    )
  }
}

export const apiService = new ApiService()
