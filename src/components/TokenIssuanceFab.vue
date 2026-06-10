<template>
  <Teleport to="body">
    <button
      type="button"
      class="token-issuance-fab"
      :class="{ loading }"
      :disabled="loading || disabled"
      :title="loading ? '토큰 발급 중...' : '토큰 발급'"
      @click="handleClick"
    >
      <svg
        v-if="!loading"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span v-else class="fab-spinner" aria-hidden="true" />
      <span class="fab-label">{{ loading ? '발급 중...' : '토큰 발급' }}</span>
    </button>
  </Teleport>
</template>

<script setup lang="ts">
import { Teleport } from 'vue'

defineProps<{
  loading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  issue: [anchorEl: HTMLElement]
}>()

function handleClick(event: MouseEvent) {
  const anchor = event.currentTarget
  if (anchor instanceof HTMLElement) {
    emit('issue', anchor)
  }
}
</script>

<style lang="scss" scoped>
.token-issuance-fab {
  position: fixed;
  right: $spacing-xl;
  bottom: $spacing-xl;
  z-index: 900;
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-lg;
  border: none;
  border-radius: 999px;
  background: var(--color-primary);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.24);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.fab-label {
  white-space: nowrap;
}

.fab-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: fab-spin 0.8s linear infinite;
}

@keyframes fab-spin {
  to {
    transform: rotate(360deg);
  }
}

@include mobile {
  .token-issuance-fab {
    right: $spacing-md;
    bottom: $spacing-md;
    padding: $spacing-sm $spacing-md;
  }

  .fab-label {
    font-size: 0.8125rem;
  }
}
</style>
