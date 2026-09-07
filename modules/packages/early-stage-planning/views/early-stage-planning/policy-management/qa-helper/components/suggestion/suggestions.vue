<!-- Suggestions —— 建议问题容器(横向换行排布;ai-elements-vue 移植) -->
<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue';
  import { cn } from '../cn';

  interface Props {
    class?: HTMLAttributes['class'];
  }

  const props = defineProps<Props>();
</script>

<template>
  <div :class="cn('flex flex-col w-full flex-wrap items-center gap-2', props.class)">
    <slot />
  </div>
</template>
