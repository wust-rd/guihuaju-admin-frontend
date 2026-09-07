<!-- ConversationEmptyState —— 对话空态(ai-elements-vue 移植,主题色以项目灰阶替代) -->
<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue';
  import { cn } from '../cn';

  interface Props {
    class?: HTMLAttributes['class'];
    title?: string;
    description?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    title: '暂无消息',
    description: '开始对话后，消息将显示在这里',
  });
</script>

<template>
  <div :class="cn('flex-1 flex size-full flex-col items-center justify-center gap-3 p-8 text-center', props.class)">
    <slot>
      <div v-if="$slots.icon" class="text-gray-400">
        <slot name="icon" />
      </div>
      <div class="space-y-1">
        <h3 class="text-sm font-medium">
          {{ props.title }}
        </h3>
        <p v-if="props.description" class="text-sm text-gray-400">
          {{ props.description }}
        </p>
      </div>
    </slot>
  </div>
</template>
