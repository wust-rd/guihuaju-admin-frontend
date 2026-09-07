<!--
  PromptInputTextarea —— 自增高输入框(ai-elements-vue 移植)
  Enter 提交(Shift+Enter 换行),兼容中文输入法组合态不误触发;
  field-sizing-content 为渐进增强,不支持的浏览器回退为固定高度内滚动。
-->
<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue';
  import { ref } from 'vue';
  import { cn } from '../cn';
  import { usePromptInput } from './context';

  interface Props {
    class?: HTMLAttributes['class'];
    placeholder?: string;
    disabled?: boolean;
  }

  const props = defineProps<Props>();
  const { text, submitForm } = usePromptInput();
  const isComposing = ref(false);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (isComposing.value || e.isComposing || e.shiftKey) return;
      e.preventDefault();
      submitForm();
    }
  }
</script>

<template>
  <textarea
    v-model="text"
    :class="cn('field-sizing-content max-h-48 min-h-16 w-full resize-none border-0 bg-transparent p-2 text-sm leading-6 text-gray-800 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60', props.class)"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    rows="1"
    @keydown="handleKeyDown"
    @compositionstart="isComposing = true"
    @compositionend="isComposing = false"
  />
</template>
