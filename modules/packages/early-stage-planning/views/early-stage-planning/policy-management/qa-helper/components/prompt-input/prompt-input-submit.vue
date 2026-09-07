<!-- PromptInputSubmit —— 输入区提交按钮(圆形发送;ai-elements-vue 移植) -->
<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue';
  import { Icon } from '@jeesite/core/components/Icon';
  import { cn } from '../cn';
  import { usePromptInput } from './context';

  interface Props {
    class?: HTMLAttributes['class'];
  }

  const props = defineProps<Props>();
  const { text, isLoading, submitForm } = usePromptInput();
</script>

<template>
  <button
    :class="cn(
      'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center self-end rounded-full bg-blue-600 text-white transition-opacity hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40',
      props.class,
    )"
    type="submit"
    :disabled="isLoading || !text.trim()"
    aria-label="发送"
    @click="submitForm"
  >
    <Icon icon="i-ant-design:send-outlined" />
  </button>
</template>
