<!--
  PromptInput —— 输入区表单容器(ai-elements-vue 移植)
  圆角聚焦框(原版 bg-background/焦点 token 以项目色替代);Enter/按钮触发 submit,提交后清空。
-->
<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue';
  import { computed } from 'vue';
  import { cn } from '../cn';
  import { usePromptInputProvider } from './context';

  interface Props {
    class?: HTMLAttributes['class'];
    placeholder?: string;
    loading?: boolean;
  }

  const props = defineProps<Props>();

  const emit = defineEmits<{ (e: 'submit', text: string): void }>();

  const isLoading = computed(() => !!props.loading);
  const context = usePromptInputProvider({
    loading: isLoading,
    onSubmit: (text) => emit('submit', text),
  });
</script>

<template>
  <form
    :class="cn(
      'flex w-full flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm transition-colors focus-within:border-blue-400',
      props.class,
    )"
    @submit.prevent="context.submitForm()"
  >
    <slot />
  </form>
</template>
