/** conversation 组件族共享上下文(粘底状态与滚动控制) */
import { inject, type InjectionKey, type Ref } from 'vue';

export interface ConversationContext {
  isAtBottom: Ref<boolean>;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export const ConversationKey: InjectionKey<ConversationContext> = Symbol('conversation');

export function useConversation(): ConversationContext {
  const ctx = inject(ConversationKey);
  if (!ctx) {
    throw new Error('useConversation() must be used within <Conversation>');
  }
  return ctx;
}
