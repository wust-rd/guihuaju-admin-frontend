<!-- ConversationScrollButton —— 回到底部悬浮按钮(ai-elements-vue 移植) -->
<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue';
  import { computed } from 'vue';
  import { Icon } from '@jeesite/core/components/Icon';
  import { cn } from '../cn';
  import { useConversation } from './context';

  interface Props {
    class?: HTMLAttributes['class'];
  }

  const props = defineProps<Props>();
  const { isAtBottom, scrollToBottom } = useConversation();
  const show = computed(() => !isAtBottom.value);
</script>

<template>
  <button
    v-if="show"
    :class="
      cn(
        'absolute bottom-4 right-4 z-10 flex size-12 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-xl hover:text-blue-600',
        props.class,
      )
    "
    type="button"
    aria-label="回到底部"
    @click="scrollToBottom()"
  >
    <Icon icon="i-ant-design:arrow-down" size="20" />
  </button>
</template>
