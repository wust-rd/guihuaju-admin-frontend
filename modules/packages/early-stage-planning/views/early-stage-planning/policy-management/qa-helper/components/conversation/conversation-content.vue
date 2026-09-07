<!-- ConversationContent —— 对话内容列容器(ai-elements-vue 移植) -->
<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue';
  import { cn } from '../cn';

  interface Props {
    class?: HTMLAttributes['class'];
  }

  const props = defineProps<Props>();
</script>

<template>
  <div :class="cn('flex flex-col gap-6 p-4', props.class)">
    <slot />
  </div>
</template>
