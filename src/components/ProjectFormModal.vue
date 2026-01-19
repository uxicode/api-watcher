<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>프로젝트 추가</h2>
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
          <label for="swaggerUrl">Swagger URL</label>
          <input
            id="swaggerUrl"
            v-model="form.swaggerUrl"
            type="url"
            required
            placeholder="https://api.example.com/swagger.json"
          />
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
            {{ isSubmitting ? '추가 중...' : '추가' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { Project } from '@/types/project'

const emit = defineEmits<{
  close: []
  submit: [project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>]
}>()

const hasApiKey = ref(false)
const isSubmitting = ref(false)

const form = reactive({
  name: '',
  swaggerUrl: '',
  apiKey: '',
  apiKeyHeader: ''
})

function handleSubmit() {
  isSubmitting.value = true

  const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
    name: form.name,
    swaggerUrl: form.swaggerUrl,
    apiKey: hasApiKey.value ? form.apiKey : undefined,
    apiKeyHeader: hasApiKey.value ? form.apiKeyHeader : undefined,
    isActive: true
  }

  emit('submit', project)
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
