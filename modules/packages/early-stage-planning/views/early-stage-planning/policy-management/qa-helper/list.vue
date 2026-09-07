<!--
  市住更局 —— 政策问答助手(多轮对话)

  对话区按 ai-elements-vue 的组件分解与写法实现(源码级移植至本模块
  qa-helper/components/,UnoCSS 原子类 + antd 底座替代 shadcn/reka-ui,无新增依赖):
   - Conversation/ConversationContent/ConversationEmptyState/ConversationScrollButton:
     粘底滚动容器(内容增高自动跟滚 + 回到底部悬浮按钮);
   - Message/MessageAvatar/MessageContent:消息行(用户蓝底气泡靠右/助手正文靠左);
   - PromptInput/PromptInputTextarea/PromptInputSubmit:表单化输入区
     (自增高文本域,Enter 发送/Shift+Enter 换行,圆形发送按钮);
   - Suggestion/Suggestions:新对话空态建议项(提问后消失);
   - InlineCitation* + Loader:回答引用角标(点击弹出政策来源卡)与加载指示。
  左侧「对话历史」侧栏(新对话/重命名/删除,localStorage 持久化——kd_server 无
  会话列表接口,消息记录存前端)。接口层见
  @jeesite/early-stage-planning/api/early-stage-planning/policy-management/qa。
  菜单注册(菜单名称「政策问答助手」):
   - 链接地址:/early-stage-planning/policy-management/qa-helper/list
   - 组件位置:/early-stage-planning/policy-management/qa-helper/list(与链接地址一致)
   - 是否可见:显示
-->
<template>
  <PageWrapper :sidebarWidth="260">
    <!-- 左侧:对话历史 -->
    <template #sidebar>
      <Card
        size="small"
        class="flex h-full flex-col"
        title="对话历史"
        :body-style="{ flex: '1 1 0', overflow: 'auto' }"
      >
        <template #extra>
          <a-button size="small" type="primary" @click="newConversation">
            <Icon icon="i-fluent:add-12-filled" /> 新对话
          </a-button>
        </template>
        <div
          v-for="conv in conversations"
          :key="conv.key"
          class="mb-1.5 rounded-md px-2 py-1.5"
          :class="conv.key === activeKey ? 'bg-blue-50' : 'hover:bg-gray-50'"
        >
          <template v-if="renameKey === conv.key">
            <Input v-model:value="editTitle" size="small" @press-enter="commitRename" @blur="commitRename" />
          </template>
          <template v-else>
            <div class="flex items-center gap-1">
              <div
                class="min-w-0 flex-1 cursor-pointer truncate text-13px"
                :class="conv.key === activeKey ? 'font-medium text-blue-600' : 'text-gray-700'"
                :title="conv.title"
                @click="switchConversation(conv.key)"
              >
                {{ conv.title }}
              </div>
              <Icon
                class="cursor-pointer text-gray-400 hover:text-blue-600"
                icon="i-ant-design:edit-outlined"
                @click="startRename(conv)"
              />
              <Popconfirm title="确认删除该对话？" @confirm="removeConversation(conv.key)">
                <Icon class="cursor-pointer text-gray-400 hover:text-red-500" icon="i-ant-design:delete-outlined" />
              </Popconfirm>
            </div>
            <div class="mt-0.5 text-xs text-gray-400">{{ conv.updatedAt }}</div>
          </template>
        </div>
        <div v-if="!conversations.length" class="px-2 py-4 text-center text-xs text-gray-400"> 暂无历史对话 </div>
      </Card>
    </template>

    <!-- 右侧:对话区(ai-elements 组合) -->
    <div class="flex h-full min-h-0 flex-1 flex-col gap-3">
      <Conversation>
        <ConversationContent class="min-h-full">
          <!-- 空态:建议项居中展示(用户开始提问后消失) -->
          <ConversationEmptyState v-if="!messages.length">
            <Suggestions class="justify-center">
              <Suggestion v-for="q in SUGGESTED_QUESTIONS" :key="q" :suggestion="q" @click="send" />
            </Suggestions>
          </ConversationEmptyState>

          <Message v-for="(msg, i) in messages" :key="i" :from="msg.role === 'user' ? 'user' : 'assistant'">
            <MessageContent :from="msg.role === 'user' ? 'user' : 'assistant'">
              <div class="whitespace-pre-wrap">{{ msg.text }}</div>
              <Loader v-if="msg.role === 'bot' && !msg.text && i === messages.length - 1 && sending" />

              <!-- 引用卡片(显示部分文档信息),卡片间以 Divider 分隔 -->
              <div
                v-if="msg.role === 'bot' && msg.citations?.length"
                class="flex w-full flex-col mt-4 border border-gray-200 bg-white rd-2 p-2"
              >
                <template v-for="(cite, j) in msg.citations" :key="j">
                  <div
                    class="w-full rounded-lg px-4 py-2 cursor-pointer hover:bg-blue-50 transition-all"
                    @click.prevent="openFile(cite.policy.fileId as string)"
                  >
                    <div class="flex items-start gap-2">
                      <span
                        class="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 px-1.5 text-xs font-semibold text-blue-600"
                      >
                        {{ cite.index ?? j + 1 }}
                      </span>
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-sm font-medium text-gray-800" :title="cite.policy.title">
                          {{ cite.policy.title || '未命名文档' }}
                        </div>
                        <div class="mt-0.5 truncate text-xs text-gray-400" :title="citationMeta(cite.policy)">
                          {{ citationMeta(cite.policy) }}
                        </div>
                      </div>
                      <a v-if="cite.policy.fileId" class="shrink-0 text-xs text-blue-600"> 打开文件 </a>
                    </div>
                    <div class="line-clamp-2 text-xs leading-5 text-gray-500" :title="cite.snippet">
                      {{ cite.snippet }}
                    </div>
                  </div>
                  <Divider v-if="j < (msg.citations?.length || 0) - 1" class="my-1" />
                </template>
              </div>
            </MessageContent>
          </Message>
        </ConversationContent>

        <template #overlay>
          <ConversationScrollButton />
        </template>
      </Conversation>

      <!-- 输入区 -->
      <PromptInput class="shrink-0" :loading="sending" @submit="send">
        <PromptInputTextarea placeholder="请输入您的问题（Enter 发送，Shift+Enter 换行）" />
        <div class="flex items-center justify-end">
          <PromptInputSubmit />
        </div>
      </PromptInput>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningPolicyManagementQaHelperList">
  import { computed, ref, unref } from 'vue';
  import { Card, Input, Popconfirm } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import type { ChatCitation } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/qa';
  import { chatStream } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/qa';
  import { policyFileUrl } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy';
  import type { Policy } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy';
  import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
  } from './components/conversation';
  import { Message, MessageContent } from './components/message';
  import { Loader } from './components/loader';
  import { Suggestion, Suggestions } from './components/suggestion';
  import { PromptInput, PromptInputSubmit, PromptInputTextarea } from './components/prompt-input';
  import { Divider } from 'antdv-next';

  const { meta } = unref(router.currentRoute);
  void meta;

  /** 新对话空态建议项(点击即发送) */
  const SUGGESTED_QUESTIONS = ['总结现行政策要点', '征收补偿依据', '资金支持要点'];

  /** 对话消息(user=提问,bot=回答,回答可带引用) */
  interface ChatMessage {
    role: 'user' | 'bot';
    text: string;
    citations?: ChatCitation[];
  }

  /** 历史对话(kd_server 无会话列表接口,记录存前端本地) */
  interface Conversation2 {
    key: string; // 本地标识(持久化/重命名/删除用)
    id: string; // 后端 conversation_id(首轮 meta 返回前为空)
    title: string; // 标题(默认取首条提问,可重命名)
    updatedAt: string;
    messages: ChatMessage[];
  }

  const CONV_STORAGE_KEY = 'policy_qa_conversations';
  const MAX_CONVERSATIONS = 30;

  function loadConversations(): Conversation2[] {
    try {
      return JSON.parse(localStorage.getItem(CONV_STORAGE_KEY) || '') || [];
    } catch {
      return [];
    }
  }

  const conversations = ref<Conversation2[]>(loadConversations());
  /** 当前激活对话(空 = 新对话草稿,发送时才落列表) */
  const activeKey = ref<string>();
  const activeConv = computed(() => conversations.value.find((conv) => conv.key === activeKey.value));
  const messages = computed(() => activeConv.value?.messages || []);

  function saveConversations() {
    try {
      localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(conversations.value.slice(0, MAX_CONVERSATIONS)));
    } catch {
      // 忽略本地存储异常(隐私模式等)
    }
  }

  const sending = ref(false);

  /** 重命名状态 */
  const renameKey = ref<string>();
  const editTitle = ref('');

  /** 新对话:清空激活态,发送时再创建历史记录 */
  function newConversation() {
    activeKey.value = undefined;
  }

  function switchConversation(key: string) {
    activeKey.value = key;
  }

  function startRename(conv: Conversation2) {
    renameKey.value = conv.key;
    editTitle.value = conv.title;
  }

  function commitRename() {
    const conv = conversations.value.find((item) => item.key === renameKey.value);
    if (conv && editTitle.value.trim()) {
      conv.title = editTitle.value.trim();
      saveConversations();
    }
    renameKey.value = undefined;
  }

  function removeConversation(key: string) {
    conversations.value = conversations.value.filter((item) => item.key !== key);
    saveConversations();
    if (activeKey.value === key) {
      activeKey.value = undefined;
    }
  }

  /** 发送提问(Suggestion 点击与 PromptInput 提交共用) */
  async function send(text: string) {
    const message = (text || '').trim();
    if (!message || sending.value) return;

    // 无激活对话时先落一条历史记录(标题默认取首条提问)
    if (!activeConv.value) {
      const conv: Conversation2 = {
        key: `${dateUtil().valueOf().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        id: '',
        title: message.length > 20 ? `${message.slice(0, 20)}…` : message,
        updatedAt: dateUtil().format('YYYY-MM-DD HH:mm'),
        messages: [],
      };
      conversations.value.unshift(conv);
      activeKey.value = conv.key;
    }
    // 取响应式代理引用(流式增量须触发更新,打字机才生效)
    const conv = activeConv.value as Conversation2;
    conv.messages.push({ role: 'user', text: message });
    conv.messages.push({ role: 'bot', text: '', citations: [] });
    const reply = conv.messages[conv.messages.length - 1];
    sending.value = true;
    try {
      const result = await chatStream(
        { message, conversationId: conv.id || undefined },
        {
          onMeta: (id) => {
            conv.id = id;
            saveConversations();
          },
          onCitations: (citations) => {
            reply.citations = citations;
          },
          onDelta: (delta) => {
            reply.text += delta;
          },
        },
      );
      conv.id = result.conversationId || conv.id;
      reply.text = result.answer || reply.text;
    } catch (error: any) {
      reply.text = `请求失败：${error?.message || error}`;
    } finally {
      conv.updatedAt = dateUtil().format('YYYY-MM-DD HH:mm');
      saveConversations();
      sending.value = false;
    }
  }

  /** 引用来源元信息行 */
  function citationMeta(policy: Policy) {
    return [
      policy.sourceOrg,
      policy.docNo ? `文号：${policy.docNo}` : '',
      policy.policyLevelLabel,
      policy.policyTypeLabel,
      policy.businessAreaLabel,
      policy.timeStatusLabel,
    ]
      .filter(Boolean)
      .join(' ｜ ');
  }

  /** 打开引用文件(新标签页预览) */
  function openFile(fileId: string) {
    window.open(policyFileUrl(fileId, true), '_blank');
  }
</script>
