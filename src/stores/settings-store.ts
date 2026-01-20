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
      console.log('[SettingsStore] loadSettings - 저장된 데이터:', stored)
      
      if (stored) {
        const parsed = JSON.parse(stored) as AppSettings
        console.log('[SettingsStore] loadSettings - 파싱된 데이터:', parsed)
        
        settings.value = { ...settings.value, ...parsed }
        console.log('[SettingsStore] loadSettings - 최종 설정:', settings.value)
        console.log('[SettingsStore] loadSettings - apiBaseUrl computed:', apiBaseUrl.value)
      } else {
        console.log('[SettingsStore] loadSettings - 저장된 데이터 없음 (기본값 사용)')
      }
    } catch (e) {
      console.error('[SettingsStore] Failed to load settings:', e)
    }
  }

  // 설정 저장
  function saveSettings(newSettings: Partial<AppSettings>) {
    console.log('[SettingsStore] saveSettings 호출됨:', newSettings)
    
    // 기존 설정에 새 설정 병합
    const updatedSettings: AppSettings = { ...settings.value }
    
    // 각 설정 항목 업데이트
    if (newSettings.apiBaseUrl !== undefined) {
      // 빈 문자열도 명시적으로 처리
      const trimmed = newSettings.apiBaseUrl?.trim()
      updatedSettings.apiBaseUrl = trimmed || undefined
    }
    if (newSettings.apiKey !== undefined) {
      const trimmed = newSettings.apiKey?.trim()
      updatedSettings.apiKey = trimmed || undefined
    }
    if (newSettings.apiKeyHeader !== undefined) {
      const trimmed = newSettings.apiKeyHeader?.trim()
      updatedSettings.apiKeyHeader = trimmed || 'X-API-Key'
    }
    
    console.log('[SettingsStore] 업데이트된 설정:', updatedSettings)
    
    // settings.value 업데이트
    settings.value = updatedSettings
    
    console.log('[SettingsStore] settings.value 업데이트 완료:', settings.value)
    console.log('[SettingsStore] apiBaseUrl computed:', apiBaseUrl.value)
    
    try {
      // LocalStorage에 저장 (빈 문자열은 저장하지 않음)
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
      
      console.log('[SettingsStore] LocalStorage에 저장할 데이터:', toSave)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
      console.log('[SettingsStore] LocalStorage 저장 완료')
      
      // 저장 후 확인
      const saved = localStorage.getItem(STORAGE_KEY)
      console.log('[SettingsStore] 저장된 데이터 확인:', saved)
    } catch (e) {
      console.error('[SettingsStore] Failed to save settings:', e)
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
