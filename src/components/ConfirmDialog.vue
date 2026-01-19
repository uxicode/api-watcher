<template>
  <div class="dialog-overlay" @click.self="$emit('cancel')">
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>확인</h3>
      </div>

      <div class="dialog-body">
        <p class="message">{{ message }}</p>
        <p v-if="description" class="description">{{ description }}</p>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="$emit('cancel')">
          {{ cancelText }}
        </button>
        <button class="btn btn-danger" @click="$emit('confirm')">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message: string
  description?: string
  confirmText?: string
  cancelText?: string
}

withDefaults(defineProps<Props>(), {
  confirmText: '확인',
  cancelText: '취소'
})

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<style lang="scss" scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: $spacing-md;
  margin: 0;
  transform: none !important;
  will-change: auto;
}

.dialog-content {
  background: var(--bg-primary);
  border-radius: $radius-lg;
  width: 100%;
  max-width: 400px;
  box-shadow: $shadow-lg;
  overflow: hidden;
}

.dialog-header {
  padding: $spacing-lg;
  border-bottom: 1px solid var(--color-border-light);

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }
}

.dialog-body {
  padding: $spacing-lg;

  .message {
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-text-primary);
    margin: 0 0 $spacing-sm;
  }

  .description {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.5;
  }
}

.dialog-footer {
  display: flex;
  gap: $spacing-md;
  justify-content: flex-end;
  padding: $spacing-lg;
  border-top: 1px solid var(--color-border-light);
}

</style>
