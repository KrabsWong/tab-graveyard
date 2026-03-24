<template>
  <div v-if="visible" class="modal-overlay" @click.self="onCancel">
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">{{ getMessage('blacklistTitle') }}</h3>
        <button class="modal-close" @click="onCancel">×</button>
      </div>
      <div class="modal-body">
        <p class="modal-description">{{ getMessage('blacklistDescription') }}</p>
        <textarea
          v-model="textareaContent"
          class="blacklist-textarea"
          :placeholder="getMessage('blacklistPlaceholder')"
        ></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="onCancel">
          {{ getMessage('blacklistCancel') || 'Cancel' }}
        </button>
        <button class="btn-confirm" @click="onConfirm">
          {{ getMessage('blacklistConfirm') || 'Confirm' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'
import { storage } from '../../utils/storage.js'

export default {
  name: 'BlacklistConfig',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update', 'close'],
  setup(props, { emit }) {
    const textareaContent = ref('')

    const loadPatterns = async () => {
      const patterns = await storage.getDomainBlacklist()
      textareaContent.value = patterns.join('\n')
    }

    watch(() => props.visible, (isVisible) => {
      if (isVisible) {
        loadPatterns()
      }
    })

    const onConfirm = async () => {
      const lines = textareaContent.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      await storage.setDomainBlacklist(lines)
      emit('update', lines)
      emit('close')
    }

    const onCancel = () => {
      emit('close')
    }

    const getMessage = (key, substitutions = []) => {
      const subs = Array.isArray(substitutions)
        ? substitutions.map(String)
        : [String(substitutions)]
      return chrome.i18n.getMessage(key, subs) || key
    }

    return {
      textareaContent,
      onConfirm,
      onCancel,
      getMessage
    }
  }
}
</script>