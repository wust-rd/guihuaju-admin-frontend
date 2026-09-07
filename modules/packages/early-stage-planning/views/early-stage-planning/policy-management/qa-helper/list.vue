<!--
  市住更局 —— 政策问答助手(多轮对话)

  内容对齐 kd_server 知识库测试台(static/index.html)的「对话测试」能力:
  多轮对话(conversation_id 续接)、流式输出(SSE 逐段打字)、引用片段
  (编号 + 政策元数据 + 命中片段 + 打开文件)、引用条数(top_k)设置;
  测试台中的导入文档/片段检索/健康检查为开发调试工具,不属于本页。
  UI 采用项目范式:PageWrapper #sidebar 左侧「对话历史」(新对话/重命名/删除,
  本地 localStorage 持久化,kd_server 无会话列表接口,消息记录存前端)、
  右侧对话区撑满内容区高度(气泡式,引用用 antd Collapse 折叠面板);
  接口层见 @jeesite/early-stage-planning/api/early-stage-planning/policy-management/qa。
  菜单注册(菜单名称「政策问答助手」):
   - 链接地址:/early-stage-planning/policy-management/qa-helper/list
   - 组件位置:/early-stage-planning/policy-management/qa-helper/list(与链接地址一致)
   - 是否可见:显示
-->
<template>
  <PageWrapper :sidebarWidth="260">
    <!-- 左侧:对话历史 -->
    <template #sidebar>
      <Card size="small" class="flex h-full flex-col" title="对话历史" :body-style="{ flex: '1 1 0', overflow: 'auto' }">
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
            <Input
              v-model:value="editTitle"
              size="small"
              @press-enter="commitRename"
              @blur="commitRename"
            />
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
                <Icon
                  class="cursor-pointer text-gray-400 hover:text-red-500"
                  icon="i-ant-design:delete-outlined"
                />
              </Popconfirm>
            </div>
            <div class="mt-0.5 text-xs text-gray-400">{{ conv.updatedAt }}</div>
          </template>
        </div>
        <div v-if="!conversations.length" class="px-2 py-4 text-center text-xs text-gray-400">
          暂无历史对话
        </div>
      </Card>
    </template>

    <!-- 右侧:对话区(撑满内容区高度) -->
    <div class="flex h-full min-h-0 flex-1 flex-col">
      <Card
        size="small"
        class="flex min-h-0 flex-1 flex-col"
        :body-style="{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 0',
          minHeight: 0,
          overflow: 'hidden',
        }"
      >
        <template #title>
          <Icon :icon="getTitle.icon" class="m-1 pr-1" />
          <span> {{ getTitle.value }} </span>
        </template>

        <!-- 消息区 -->
        <div ref="msgsRef" class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          <!-- 空态:建议项(用户开始提问后消失) -->
          <div v-if="!messages.length" class="flex h-full flex-col items-center justify-center gap-3">
            <div class="flex flex-wrap justify-center gap-2">
              <a-button v-for="q in SUGGESTED_QUESTIONS" :key="q" size="small" @click="askExample(q)">
                {{ q }}
              </a-button>
            </div>
          </div>

          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="max-w-[86%] rounded-lg px-3 py-2 text-14px leading-6"
            :class="msg.role === 'user' ? 'self-end bg-blue-600 text-white' : 'self-start border border-gray-200 bg-gray-50 text-gray-800'"
          >
            <div class="whitespace-pre-wrap">{{ msg.text }}</div>

            <!-- 引用(仅回答消息) -->
            <Collapse
              v-if="msg.role === 'bot' && msg.citations?.length"
              size="small"
              ghost
              class="mt-2 policy-chat-citations"
            >
              <CollapsePanel
                v-for="(cite, j) in msg.citations"
                :key="j"
                :header="`[${cite.index ?? j + 1}] ${cite.policy.title || '未命名文档'}`"
              >
                <div class="mb-1 text-xs text-gray-400">
                  {{ cite.policy.sourceOrg || '/' }} ｜ 文号：{{ cite.policy.docNo || '/' }} ｜
                  {{ cite.policy.policyLevelLabel || '/' }} ｜ {{ cite.policy.policyTypeLabel || '/' }} ｜
                  {{ cite.policy.businessAreaLabel || '/' }} ｜ {{ cite.policy.timeStatusLabel || '/' }}
                </div>
                <div class="text-13px text-gray-600">{{ cite.snippet || '' }}</div>
                <a
                  v-if="cite.policy.fileId"
                  class="text-13px"
                  @click.prevent="openFile(cite.policy.fileId)"
                >
                  打开文件
                </a>
              </CollapsePanel>
            </Collapse>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="mt-3 shrink-0">
          <TextArea
            v-model:value="question"
            :rows="3"
            placeholder="请输入您的问题（Enter 发送，Shift+Enter 换行）"
            @keydown.enter.exact.prevent="send"
          />
          <div class="mt-2 flex justify-end">
            <a-button type="primary" :loading="sending" @click="send"> 发送 </a-button>
          </div>
        </div>
      </Card>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningPolicyManagementQaHelperList">
  import { computed, nextTick, ref, unref } from 'vue';
  import { Card, Collapse, CollapsePanel, Input, Popconfirm, TextArea } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import type { ChatCitation } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/qa';
  import { chatStream } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/qa';
  import { policyFileUrl } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy';

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '政策问答助手',
  };

  /** 新对话空态建议项(点击即发送;技术性说明不暴露给用户) */
  const SUGGESTED_QUESTIONS = ['总结现行政策要点', '征收补偿依据', '资金支持要点'];

  /** 对话消息(user=提问,bot=回答,回答可带引用) */
  interface ChatMessage {
    role: 'user' | 'bot';
    text: string;
    citations?: ChatCitation[];
  }

  /** 历史对话(kd_server 无会话列表接口,记录存前端本地) */
  interface Conversation {
    key: string; // 本地标识(持久化/重命名/删除用)
    id: string; // 后端 conversation_id(首轮 meta 返回前为空)
    title: string; // 标题(默认取首条提问,可重命名)
    updatedAt: string;
    messages: ChatMessage[];
  }

  const CONV_STORAGE_KEY = 'policy_qa_conversations';
  const MAX_CONVERSATIONS = 30;

  function loadConversations(): Conversation[] {
    try {
      return JSON.parse(localStorage.getItem(CONV_STORAGE_KEY) || '') || [];
    } catch {
      return [];
    }
  }

  const conversations = ref<Conversation[]>(loadConversations());
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

  const question = ref('');
  const sending = ref(false);
  const msgsRef = ref<HTMLElement>();

  /** 重命名状态 */
  const renameKey = ref<string>();
  const editTitle = ref('');

  /** 对话区滚动到底部 */
  async function scrollToEnd() {
    await nextTick();
    msgsRef.value?.scrollTo({ top: msgsRef.value.scrollHeight });
  }

  function askExample(text: string) {
    question.value = text;
    send();
  }

  /** 新对话:清空激活态,发送时再创建历史记录 */
  function newConversation() {
    activeKey.value = undefined;
    question.value = '';
  }

  function switchConversation(key: string) {
    activeKey.value = key;
    scrollToEnd();
  }

  function startRename(conv: Conversation) {
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

  async function send() {
    const message = question.value.trim();
    if (!message || sending.value) return;
    question.value = '';

    // 无激活对话时先落一条历史记录(标题默认取首条提问)
    if (!activeConv.value) {
      const conv: Conversation = {
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
    const conv = activeConv.value as Conversation;
    conv.messages.push({ role: 'user', text: message });
    conv.messages.push({ role: 'bot', text: '', citations: [] });
    const reply = conv.messages[conv.messages.length - 1];
    sending.value = true;
    await scrollToEnd();
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
            scrollToEnd();
          },
          onDelta: (text) => {
            reply.text += text;
            scrollToEnd();
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
      await scrollToEnd();
    }
  }

  /** 打开引用文件(新标签页预览) */
  function openFile(fileId: string) {
    window.open(policyFileUrl(fileId, true), '_blank');
  }
</script>
<style scoped>
  /* 引用折叠面板在气泡内的紧凑样式 */
  .policy-chat-citations :deep(.ant-collapse-header) {
    padding: 4px 0 !important;
    font-size: 13px;
    color: #2563eb;
  }
  .policy-chat-citations :deep(.ant-collapse-content-box) {
    padding: 4px 0 8px !important;
  }
</style>
