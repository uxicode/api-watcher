<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>관리자 API 설정</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <form class="modal-body" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="apiBaseUrl">API 기본 주소</label>
          <input
            id="apiBaseUrl"
            v-model="form.apiBaseUrl"
            type="url"
            placeholder="https://api.example.com"
          />
          <p class="help-text">
            백엔드 API의 기본 주소를 입력하세요. 비워두면 LocalStorage를 사용합니다.
          </p>
        </div>

        <div class="form-group">
          <label>
            <input
              v-model="hasApiKey"
              type="checkbox"
            />
            API Key 인증 사용
          </label>
        </div>

        <template v-if="hasApiKey">
          <div class="form-group">
            <label for="apiKeyHeader">API Key Header 이름</label>
            <input
              id="apiKeyHeader"
              v-model="form.apiKeyHeader"
              type="text"
              placeholder="X-API-Key"
            />
          </div>

          <div class="form-group">
            <label for="apiKey">API Key 값</label>
            <input
              id="apiKey"
              v-model="form.apiKey"
              type="password"
              :placeholder="form.apiKey ? '••••••••' : 'your-api-key'"
            />
            <p v-if="form.apiKey" class="help-text">
              API Key가 입력되어 있습니다.
            </p>
          </div>
        </template>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="handleReset">
            초기화
          </button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? '저장 중...' : '저장' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings-store'
import { apiService } from '@/services/api-service'
import type { AppSettings } from '@/types/settings'

interface Props {
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: true
})

const emit = defineEmits<{
  close: []
}>()

const settingsStore = useSettingsStore()
const hasApiKey = ref(false)
const isSubmitting = ref(false)

const form = reactive<AppSettings>({
  apiBaseUrl: '',
  apiKey: '',
  apiKeyHeader: 'X-API-Key'
})

// 설정 로드 함수
function loadSettings() {
  // 설정 스토어에서 최신 설정 다시 로드
  settingsStore.loadSettings()
  const currentSettings = settingsStore.settings
  
  form.apiBaseUrl = currentSettings.apiBaseUrl || ''
  form.apiKey = currentSettings.apiKey || ''
  form.apiKeyHeader = currentSettings.apiKeyHeader || 'X-API-Key'
  hasApiKey.value = !!currentSettings.apiKey
}

// 모달이 열릴 때마다 설정 로드
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    loadSettings()
  }
}, { immediate: true })

onMounted(() => {
  loadSettings()
})

function handleSubmit() {
  isSubmitting.value = true

  const updates: Partial<AppSettings> = {
    apiBaseUrl: form.apiBaseUrl?.trim() || undefined
  }

  // API Key 관련 설정
  if (hasApiKey.value) {
    updates.apiKey = form.apiKey?.trim() || undefined
    updates.apiKeyHeader = form.apiKeyHeader?.trim() || 'X-API-Key'
  } else {
    // 체크박스가 해제되면 API Key 제거
    updates.apiKey = undefined
    updates.apiKeyHeader = undefined
  }

  settingsStore.updateSettings(updates)
  
  // API 서비스 재생성
  apiService.recreateClient()
  
  isSubmitting.value = false
  emit('close')
}

function handleReset() {
  // 폼만 초기화 (저장하지 않음)
  form.apiBaseUrl = ''
  form.apiKey = ''
  form.apiKeyHeader = 'X-API-Key'
  hasApiKey.value = false
}
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: $spacing-md;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: $radius-lg;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: $shadow-lg;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-lg;
  border-bottom: 1px solid var(--color-border-light);

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--color-text-primary);
  }
}

.modal-body {
  padding: $spacing-lg;
}

.form-group {
  margin-bottom: $spacing-lg;

  label {
    display: block;
    margin-bottom: $spacing-sm;
    font-weight: 500;
    color: var(--color-text-primary);
    font-size: 0.875rem;
  }

  input[type="text"],
  input[type="url"],
  input[type="password"] {
    width: 100%;
    padding: $spacing-sm $spacing-md;
    border: 1px solid var(--color-border);
    border-radius: $radius-md;
    font-size: 0.875rem;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  input[type="checkbox"] {
    margin-right: $spacing-sm;
  }

  .help-text {
    margin-top: $spacing-xs;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }
}

.modal-footer {
  display: flex;
  gap: $spacing-md;
  justify-content: flex-end;
  padding-top: $spacing-lg;
  border-top: 1px solid var(--color-border-light);
  margin-top: $spacing-lg;
}
</style>
