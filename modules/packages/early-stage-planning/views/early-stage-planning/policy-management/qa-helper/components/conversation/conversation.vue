<!--
  Conversation —— 对话滚动容器(ai-elements-vue conversation 组件移植)

  原版基于 vue-stick-to-bottom 实现粘底滚动,此处零依赖等价实现:
  内容高度变化(流式输出逐段增高)时若原本在底部则自动跟滚;
  #overlay 插槽悬浮于滚动区之上(不随内容滚动,放回底按钮)。
-->
<script lang="ts" setup>
  import { onBeforeUnmount, onMounted, provide, ref } from 'vue';
  import { cn } from '../cn';
  import { ConversationKey } from './context';

  interface Props {
    ariaLabel?: string;
    class?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    ariaLabel: 'Conversation',
  });

  const scrollRef = ref<HTMLElement>();
  const isAtBottom = ref(true);
  let observer: ResizeObserver | undefined;

  provide(ConversationKey, { isAtBottom, scrollToBottom });

  function handleScroll() {
    const el = scrollRef.value;
    if (!el) return;
    isAtBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    scrollRef.value?.scrollTo({ top: scrollRef.value.scrollHeight, behavior });
  }

  onMounted(() => {
    scrollToBottom('auto');
    observer = new ResizeObserver(() => {
      if (isAtBottom.value) {
        scrollToBottom('auto');
      }
    });
    if (scrollRef.value?.firstElementChild) {
      observer.observe(scrollRef.value.firstElementChild as HTMLElement);
    }
  });

  onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div
    :class="cn('relative min-h-0 flex-1 bg-white rd-16px border border-gray-200', props.class)"
    role="log"
    :aria-label="props.ariaLabel"
  >
    <div ref="scrollRef" class="absolute inset-0 overflow-y-auto" @scroll="handleScroll">
      <slot />
    </div>
    <slot name="overlay" />
  </div>
</template>
