<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ isEditMode ? '프로젝트 수정' : '프로젝트 추가' }}</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <form class="modal-body" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="name">프로젝트 이름</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            placeholder="예: 백엔드 API"
          />
        </div>

        <div class="form-group">
          <label for="swaggerUrl">모니터링할 Swagger 문서 URL (JSON)</label>
          <input
            id="swaggerUrl"
            v-model="form.swaggerUrl"
            type="url"
            required
            placeholder="http://staging-api-admin.doctorvice.co.kr/v3/api-docs"
          />
          <p class="help-text">
            <strong>⚠️ 중요:</strong> Swagger UI 페이지(<code>/swagger-ui/index.html</code>) URL이 아닌 <strong>JSON 문서 URL</strong>을 입력하세요!<br>
            <br>
            <strong>일반적인 JSON 문서 경로:</strong><br>
            • <code>/v3/api-docs</code> (OpenAPI 3.x 표준)<br>
            • <code>/v2/api-docs</code> (Swagger 2.0)<br>
            • <code>/swagger.json</code> 또는 <code>/openapi.json</code><br>
            • <code>/api-docs</code><br>
            <br>
            <strong>예시:</strong> Swagger UI가 <code>http://example.com/swagger-ui/index.html</code>이면,<br>
            JSON은 <code>http://example.com/v3/api-docs</code> 또는 <code>http://example.com/swagger-ui/api-docs</code>일 수 있습니다.
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
              placeholder="your-api-key"
            />
          </div>
        </template>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            취소
          </button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? (isEditMode ? '저장 중...' : '추가 중...') : (isEditMode ? '저장' : '추가') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { Project } from '@/types/project'

interface Props {
  project?: Project  // 수정 모드일 때 전달
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  submit: [project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>]
  update: [id: string, updates: Partial<Project>]
}>()

// 수정 모드인지 확인
const isEditMode = computed(() => !!props.project)

const hasApiKey = ref(false)
const isSubmitting = ref(false)

const form = reactive({
  name: '',
  swaggerUrl: '',
  apiKey: '',
  apiKeyHeader: ''
})

// 수정 모드일 때 초기값 설정
onMounted(() => {
  if (props.project) {
    form.name = props.project.name
    form.swaggerUrl = props.project.swaggerUrl
    form.apiKey = props.project.apiKey || ''
    form.apiKeyHeader = props.project.apiKeyHeader || ''
    hasApiKey.value = !!(props.project.apiKey || props.project.apiKeyHeader)
  }
})

function handleSubmit() {
  isSubmitting.value = true

  if (isEditMode.value && props.project) {
    // 수정 모드
    const updates: Partial<Project> = {
      name: form.name,
      swaggerUrl: form.swaggerUrl,
      apiKey: hasApiKey.value ? form.apiKey : undefined,
      apiKeyHeader: hasApiKey.value ? form.apiKeyHeader : undefined
    }
    emit('update', props.project.id, updates)
  } else {
    // 추가 모드
    const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
      name: form.name,
      swaggerUrl: form.swaggerUrl,
      apiKey: hasApiKey.value ? form.apiKey : undefined,
      apiKeyHeader: hasApiKey.value ? form.apiKeyHeader : undefined,
      isActive: true
    }
    emit('submit', project)
  }
  
  isSubmitting.value = false
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
    font-size: 0.8125rem;
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
