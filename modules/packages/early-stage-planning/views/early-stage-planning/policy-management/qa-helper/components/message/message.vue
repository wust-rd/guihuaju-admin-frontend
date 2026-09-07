<!-- Message —— 消息行(头像 + 内容,用户靠右/助手靠左;ai-elements-vue 移植) -->
<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue';
  import { cn } from '../cn';

  interface Props {
    from: 'user' | 'assistant';
    class?: HTMLAttributes['class'];
  }

  const props = defineProps<Props>();
</script>

<template>
  <div
    :class="cn(
      'group flex w-full max-w-[80%] items-start gap-2',
      props.from === 'user' ? 'is-user ml-auto flex-row-reverse' : 'is-assistant',
      props.class,
    )"
  >
    <slot />
  </div>
</template>
