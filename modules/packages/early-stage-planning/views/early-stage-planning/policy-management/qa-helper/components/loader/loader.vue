<!-- Loader —— 旋转加载指示(ai-elements-vue 移植) -->
<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue';
  import { cn } from '../cn';
  import LoaderIcon from './loader-icon.vue';

  interface Props {
    size?: number;
    class?: HTMLAttributes['class'];
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 16,
  });
</script>

<template>
  <div
    :class="cn('inline-flex animate-spin items-center justify-center text-gray-400', props.class)"
    aria-label="加载中"
    aria-live="polite"
    role="status"
  >
    <LoaderIcon :size="props.size" />
  </div>
</template>
