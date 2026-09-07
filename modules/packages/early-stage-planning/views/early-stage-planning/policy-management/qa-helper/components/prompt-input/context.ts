/**
 * prompt-input 组件族共享上下文(ai-elements-vue 写法移植,精简为纯文本输入:
 * 原版的附件/语音/命令菜单等能力后端暂不需要,不搬)
 */
import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue';

export interface PromptInputContext {
  text: Ref<string>;
  isLoading: Ref<boolean>;
  submitForm: () => void;
}

export const PromptInputKey: InjectionKey<PromptInputContext> = Symbol('prompt-input');

export function usePromptInput(): PromptInputContext {
  const ctx = inject(PromptInputKey);
  if (!ctx) {
    throw new Error('usePromptInput() must be used within <PromptInput>');
  }
  return ctx;
}

export function usePromptInputProvider(options: {
  loading?: ComputedRef<boolean>;
  onSubmit: (text: string) => void;
}): PromptInputContext {
  const text = ref('');
  const isLoading = options.loading || ref(false);
  const context: PromptInputContext = {
    text,
    isLoading,
    submitForm() {
      const value = text.value.trim();
      if (!value || isLoading.value) return;
      options.onSubmit(value);
      text.value = '';
    },
  };
  provide(PromptInputKey, context);
  return context;
}
