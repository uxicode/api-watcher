<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>관리자 API 설정</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <form class="modal-body" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="apiBaseUrl">백엔드 서버 주소 (선택사항)</label>
          <input
            id="apiBaseUrl"
            v-model="form.apiBaseUrl"
            type="url"
            placeholder="비워두면 LocalStorage 사용 (예: http://localhost:3001)"
          />
          <p class="help-text">
            <strong>💡 팁:</strong> 이 필드를 <strong>비워두면</strong> 브라우저의 LocalStorage를 사용합니다. (추천)<br>
            <strong>백엔드 사용 시:</strong> API Watcher 백엔드 서버 주소 입력 (예: http://localhost:3001)<br>
            <strong>현재 상태:</strong> <code>{{ form.apiBaseUrl || '비어있음 (LocalStorage 사용 중)' }}</code>
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
import { useProjectStore } from '@/stores/project-store'
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

async function handleSubmit() {
  console.log('[SettingsModal] handleSubmit 시작', { form: form })
  
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

  console.log('[SettingsModal] 저장할 업데이트:', updates)
  
  settingsStore.updateSettings(updates)
  
  console.log('[SettingsModal] updateSettings 완료')
  console.log('[SettingsModal] 현재 settingsStore.settings:', settingsStore.settings)
  console.log('[SettingsModal] 현재 settingsStore.apiBaseUrl:', settingsStore.apiBaseUrl)
  
  // API 서비스 재생성
  apiService.recreateClient()
  
  console.log('[SettingsModal] API 서비스 재생성 완료')
  
  // 프로젝트 스토어 재초기화 (백엔드 연결 상태 변경 시)
  const projectStore = useProjectStore()
  
  // 설정이 변경되었으므로 프로젝트 목록 초기화 후 다시 로드
  if (updates.apiBaseUrl) {
    console.log('[SettingsModal] 백엔드 모드로 전환 - 기존 프로젝트 초기화')
    // 백엔드 모드로 전환 시 기존 프로젝트 초기화
    projectStore.projects = []
    projectStore.snapshots = []
    projectStore.diffResults = []
  }
  
  console.log('[SettingsModal] projectStore.initialize() 호출')
  await projectStore.initialize()
  
  // 백엔드가 설정되었고 프로젝트가 없으면 명시적으로 로드
  if (updates.apiBaseUrl && projectStore.projects.length === 0) {
    console.log('[SettingsModal] 백엔드에서 프로젝트 로드 시도')
    try {
      await projectStore.loadProjectsFromBackend()
      console.log('[SettingsModal] 프로젝트 로드 성공')
    } catch (error) {
      console.error('[SettingsModal] 설정 저장 후 프로젝트 로드 실패:', error)
    }
  }
  
  console.log('[SettingsModal] handleSubmit 완료')
  
  isSubmitting.value = false
  emit('close')
}

function handleReset() {
  // 설정 완전히 초기화 (즉시 저장)
  const confirmReset = confirm('모든 설정을 초기화하고 LocalStorage 모드로 전환하시겠습니까?\n\n기존 프로젝트 데이터는 유지됩니다.')
  
  if (confirmReset) {
    form.apiBaseUrl = ''
    form.apiKey = ''
    form.apiKeyHeader = 'X-API-Key'
    hasApiKey.value = false
    
    // 즉시 저장
    settingsStore.updateSettings({
      apiBaseUrl: undefined,
      apiKey: undefined,
      apiKeyHeader: undefined
    })
    
    // API 서비스 재생성
    apiService.recreateClient()
    
    // 프로젝트 스토어 재초기화
    const projectStore = useProjectStore()
    projectStore.initialize()
    
    alert('✅ 설정이 초기화되었습니다.\nLocalStorage 모드로 전환되었습니다.')
  }
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

    code {
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.7rem;
      color: var(--color-primary);
    }
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
