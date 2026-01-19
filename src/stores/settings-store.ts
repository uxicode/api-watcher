import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppSettings } from '@/types/settings'

const STORAGE_KEY = 'api-watcher-settings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({
    apiBaseUrl: '',
    apiKey: '',
    apiKeyHeader: 'X-API-Key'
  })

  const apiBaseUrl = computed(() => settings.value.apiBaseUrl || '')
  const hasApiConfigured = computed(() => !!settings.value.apiBaseUrl)

  // LocalStorage에서 설정 로드
  function loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AppSettings
        settings.value = { ...settings.value, ...parsed }
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  // 설정 저장
  function saveSettings(newSettings: Partial<AppSettings>) {
    // 기존 설정에 새 설정 병합
    const updatedSettings: AppSettings = { ...settings.value }
    
    // 각 설정 항목 업데이트 (undefined가 아닌 경우만)
    if (newSettings.apiBaseUrl !== undefined) {
      updatedSettings.apiBaseUrl = newSettings.apiBaseUrl || undefined
    }
    if (newSettings.apiKey !== undefined) {
      updatedSettings.apiKey = newSettings.apiKey || undefined
    }
    if (newSettings.apiKeyHeader !== undefined) {
      updatedSettings.apiKeyHeader = newSettings.apiKeyHeader || undefined
    }
    
    settings.value = updatedSettings
    
    try {
      // LocalStorage에 저장 (빈 문자열은 undefined로 변환되어 저장되지 않음)
      const toSave: Partial<AppSettings> = {}
      if (updatedSettings.apiBaseUrl) {
        toSave.apiBaseUrl = updatedSettings.apiBaseUrl
      }
      if (updatedSettings.apiKey) {
        toSave.apiKey = updatedSettings.apiKey
      }
      if (updatedSettings.apiKeyHeader) {
        toSave.apiKeyHeader = updatedSettings.apiKeyHeader
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }

  // 설정 업데이트
  function updateSettings(updates: Partial<AppSettings>) {
    saveSettings(updates)
  }

  // 설정 초기화
  loadSettings()

  return {
    settings,
    apiBaseUrl,
    hasApiConfigured,
    updateSettings,
    loadSettings
  }
})
