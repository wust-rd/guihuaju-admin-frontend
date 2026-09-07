<!-- MessageContent —— 消息气泡(用户=蓝底气泡,助手=无底色正文;ai-elements-vue 移植) -->
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
    :class="
      cn(
        'flex w-fit flex-col gap-2 rounded-2xl px-4 py-2.5 text-sm leading-6',
        props.from === 'user' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-gray-800',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
