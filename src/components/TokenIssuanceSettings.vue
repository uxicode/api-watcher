<template>
  <div class="token-issuance-settings">
    <label class="pin-label">
      <input v-model="draft.pinData" type="checkbox" class="toggle-input" />
      <span>데이터 고정하기</span>
    </label>

    <div class="settings-header">
      <h3>토큰 발급 API</h3>
    </div>

    <p class="help-text">
      로그인·토큰 발급 API를 설정하고 저장하면 우측 하단 FAB로 Bearer token을 한 번에 받을 수 있습니다.
      proxy는 <strong>공개 URL만</strong> 요청할 수 있으며,
      <template v-if="draft.pinData">
        <strong>데이터 고정</strong> 시 입력값이 쿠키에 저장되어 브라우저를 다시 열어도 유지됩니다.
      </template>
      <template v-else>
        설정은 <strong>탭을 닫으면 삭제</strong>됩니다.
      </template>
    </p>

    <div class="form-row">
      <div class="form-group form-group-sm">
        <label for="issuance-method">Method</label>
        <select id="issuance-method" v-model="draft.method" class="form-select">
          <option v-for="method in ISSUANCE_METHODS" :key="method" :value="method">
            {{ method.toUpperCase() }}
          </option>
        </select>
      </div>

      <div class="form-group form-group-grow">
        <label for="issuance-url">URL</label>
        <input
          id="issuance-url"
          v-model="draft.url"
          type="url"
          placeholder="https://api.example.com/auth/login"
          class="form-input"
        />
      </div>
    </div>

    <div v-if="showBodyField" class="form-group">
      <label for="issuance-body">Body (JSON)</label>
      <textarea
        id="issuance-body"
        v-model="draft.body"
        rows="5"
        placeholder='{"email":"user@example.com","password":"..."}'
        class="form-textarea"
      />
    </div>

    <ul v-if="errors.length > 0" class="error-list">
      <li v-for="error in errors" :key="error">{{ error }}</li>
    </ul>

    <div class="settings-actions">
      <button type="button" class="btn btn-primary btn-sm" @click="handleSave">
        저장
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ISSUANCE_METHODS, type TokenIssuanceConfig } from '@/types/token-issuance'

const draft = defineModel<TokenIssuanceConfig>('draft', { required: true })

defineProps<{
  errors: string[]
}>()

const emit = defineEmits<{
  save: [anchorEl: HTMLElement]
}>()

const showBodyField = computed(() => ['post', 'put', 'patch'].includes(draft.value.method))

function handleSave(event: MouseEvent) {
  const anchor = event.currentTarget
  if (anchor instanceof HTMLElement) {
    emit('save', anchor)
  }
}
</script>

<style lang="scss" scoped>
.token-issuance-settings {
  margin-top: $spacing-xl;
  padding-top: $spacing-lg;
  border-top: 1px solid var(--color-border-light);
}

.pin-label {
  display: flex;
  justify-content: end;
  align-items: center;
  gap: $spacing-xs;
  margin-bottom: $spacing-sm;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  user-select: none;
}

.toggle-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
  margin-bottom: $spacing-sm;

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }
}

.help-text {
  margin: 0 0 $spacing-lg;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.form-row {
  display: flex;
  gap: $spacing-md;
  align-items: flex-start;
}

.form-group {
  margin-bottom: $spacing-md;

  label {
    display: block;
    margin-bottom: $spacing-xs;
    font-weight: 500;
    color: var(--color-text-primary);
    font-size: 0.875rem;
  }
}

.form-group-sm {
  flex: 0 0 120px;
}

.form-group-grow {
  flex: 1;
  min-width: 0;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: $spacing-sm $spacing-md;
  border: 1px solid var(--color-border);
  border-radius: $radius-md;
  font-size: 0.875rem;
  background: var(--bg-primary);
  color: var(--color-text-primary);
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
}

.form-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  resize: vertical;
  min-height: 120px;
}

.error-list {
  margin: 0 0 $spacing-md;
  padding-left: $spacing-lg;
  color: #dc2626;
  font-size: 0.8125rem;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
}

@include mobile {
  .form-row {
    flex-direction: column;
  }

  .form-group-sm {
    flex: 1 1 auto;
    width: 100%;
  }
}
</style>
