<!-- Suggestion —— 建议问题胶囊按钮(ai-elements-vue 移植,shadcn Button 以 antd Button 替代) -->
<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue';
  import { cn } from '../cn';

  interface Props {
    suggestion: string;
    class?: HTMLAttributes['class'];
  }

  const props = defineProps<Props>();
  const emit = defineEmits<{ (e: 'click', suggestion: string): void }>();
</script>

<template>
  <a-button
    :class="cn('cursor-pointer', props.class)"
    shape="round"
    color="default"
    variant="outlined"
    type="button"
    @click="emit('click', props.suggestion)"
  >
    <slot>{{ props.suggestion }}</slot>
  </a-button>
</template>
