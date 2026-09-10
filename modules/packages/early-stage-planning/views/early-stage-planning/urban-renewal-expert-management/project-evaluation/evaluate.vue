<!--
  市住更局 —— 城市更新专家管理 · 项目评估页（独立路由页）

  项目评估列表「评估中（待评估）→ 评估」进入：先展示项目全部信息（同详情页），下方为评估块
  （评估结果单选 通过/不通过 + 评估意见 + 评估附件上传）。
  规划路由（RESTful，后端隐藏菜单，待注册）：
   - 链接地址：/early-stage-planning/urban-renewal-expert-management/project-evaluation/evaluate?id={code}
   - 组件位置：early-stage-planning/urban-renewal-expert-management/project-evaluation/evaluate
   - 是否可见：隐藏；上级菜单挂「项目评估」以点亮侧边栏
  提交评估：通过 → 状态「已完成」；不通过 → 状态回「待提交」（供修改后重新提交）。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <template v-if="project">
      <!-- 头部卡 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="flex items-center gap-16px">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-12px">
              <span class="text-22px font-600 text-gray-900">{{ project.name }}</span>
              <Tag :color="STATUS_COLOR[project.status] || 'default'">{{ project.status }}</Tag>
            </div>
            <div class="mt-6px flex items-center gap-16px text-13px text-gray-500">
              <span>{{ project.adminDistrict }} · {{ project.district }}</span>
              <span>项目编号：{{ project.code }}</span>
              <span>开始时间：{{ project.startDate }}</span>
            </div>
          </div>
          <a-button @click="goBack">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:arrow-left-outlined"></span> 返回列表
            </span>
          </a-button>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">项目信息</div>
        <div class="mt-16px grid grid-cols-3 gap-x-16px gap-y-12px text-14px">
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">行政区</div
            ><div class="mt-4px text-gray-700">{{ project.adminDistrict }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">片区名称</div
            ><div class="mt-4px text-gray-700">{{ project.district }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">评估模式</div
            ><div class="mt-4px text-gray-700">{{ project.reviewMode }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">统筹主体</div
            ><div class="mt-4px text-gray-700">{{ project.coordinator }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">实施主体</div
            ><div class="mt-4px text-gray-700">{{ project.implementOrg }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">责任部门</div
            ><div class="mt-4px text-gray-700">{{ project.dept }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">资金来源</div
            ><div class="mt-4px text-gray-700">{{ project.fundSource || '—' }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">项目投资估算（亿元）</div
            ><div class="mt-4px text-gray-700">{{ project.investment || '—' }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">组长</div
            ><div class="mt-4px text-gray-700">{{ project.leader || '—' }}</div></div
          >
        </div>
      </div>

      <!-- 主要项目内容 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">主要项目内容</div>
        <p class="mt-12px whitespace-pre-wrap text-14px leading-26px text-gray-700">{{ project.content || '—' }}</p>
      </div>

      <!-- 评估材料 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">评估材料（{{ project.materials.length }}）</div>
        <div class="mt-12px space-y-10px">
          <div
            v-for="(m, i) in project.materials"
            :key="i"
            class="flex items-center gap-12px rd-8px bg-[#F7F9FC] px-16px py-12px"
          >
            <span class="i-ant-design:file-text-outlined text-18px text-[#3A8EF6]"></span>
            <span class="flex-1 truncate text-14px text-gray-700" :title="m">{{ m }}</span>
          </div>
          <div v-if="project.materials.length === 0" class="text-13px text-gray-400">无评估材料</div>
        </div>
      </div>

      <!-- 参与专家 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">参与专家（{{ project.experts.length }} 名）</div>
        <div class="mt-12px flex flex-wrap gap-16px">
          <div
            v-for="name in project.experts"
            :key="name"
            class="rd-8px b-1 b-solid b-gray-100 px-16px py-12px"
            :class="name === project.leader ? 'border-[#3A8EF6] bg-[#F0F6FF]' : ''"
          >
            <div class="flex items-center gap-8px">
              <span class="text-15px font-500 text-gray-800">{{ name }}</span>
              <span
                v-if="name === project.leader"
                class="rd-4px px-6px py-2px text-12px text-white"
                style="background: #3a8ef6"
                >组长</span
              >
            </div>
            <div class="mt-2px text-13px text-gray-500"
              >{{ expertOf(name)?.org || '—' }} · {{ expertOf(name)?.phone || '—' }}</div
            >
          </div>
        </div>
      </div>

      <!-- 评估块 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">评估</div>

        <div class="mt-16px flex items-center gap-16px">
          <span class="text-14px text-gray-600">评估结果 <span class="text-red-500">*</span></span>
          <RadioGroup v-model:value="form.evalResult">
            <Radio value="通过">通过</Radio>
            <Radio value="不通过">不通过</Radio>
          </RadioGroup>
        </div>

        <div class="mt-16px flex flex-col gap-8px">
          <span class="text-14px text-gray-600">评估意见 <span class="text-red-500">*</span></span>
          <Input.TextArea
            v-model:value="form.evalOpinion"
            :rows="4"
            :maxlength="1000"
            placeholder="请输入评估意见"
            show-count
          />
        </div>

        <div class="mt-16px flex flex-col gap-8px">
          <span class="text-14px text-gray-600">评估附件</span>
          <Upload :show-upload-list="false" :before-upload="handleBeforeUpload" multiple accept=".pdf,.doc,.docx">
            <div class="upload-zone">
              <span class="i-ant-design:cloud-upload-outlined text-28px text-[#3A8EF6]"></span>
              <div class="mt-8px text-14px text-gray-600">点击或拖拽文件到此处上传</div>
              <div class="mt-4px text-12px text-gray-400">支持 PDF、doc/docx 格式，可多选</div>
            </div>
          </Upload>
          <div v-if="form.attachments.length" class="mt-12px space-y-10px">
            <div
              v-for="(m, i) in form.attachments"
              :key="i"
              class="flex items-center gap-12px rd-8px bg-[#F7F9FC] px-16px py-10px"
            >
              <span class="i-ant-design:file-text-outlined text-18px text-[#3A8EF6]"></span>
              <span class="flex-1 truncate text-14px text-gray-700">{{ m }}</span>
              <span
                class="flex h-22px w-22px shrink-0 items-center justify-center rd-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                @click="removeAttachment(i)"
              >
                <span class="i-ant-design:close-outlined"></span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="flex justify-end gap-12px">
        <a-button @click="goBack">取消</a-button>
        <Popconfirm title="是否确认提交该评估？" ok-text="确定" cancel-text="取消" @confirm="submitEvaluation">
          <a-button type="primary">提交评估</a-button>
        </Popconfirm>
      </div>
    </template>

    <div v-else class="flex h-300px items-center justify-center text-14px text-gray-400">未找到该项目</div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProjectEvaluate">
  import { computed, reactive, ref, unref, watch } from 'vue';
  import { Input, Popconfirm, Radio, RadioGroup, Tag, Upload } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useUrbanExpertStore } from '../expert-store';

  const { showMessage } = useMessage();
  const go = useGo();
  const store = useUrbanExpertStore();

  const LIST_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation/index';

  /** 状态颜色 */
  const STATUS_COLOR: Record<string, string> = {
    评估中: 'processing',
    待提交: 'warning',
    已完成: 'success',
  };

  // {id} 为项目编码 code（兼容 query 与 params 两种写法；响应式监听，页签复用时也能取到最新参数）
  const projectCode = ref('');
  watch(
    () => {
      const r = unref(router.currentRoute);
      return String(r.query.id ?? r.params.id ?? r.params.code ?? '');
    },
    (v) => {
      projectCode.value = v;
    },
    { immediate: true },
  );

  const project = computed(() => store.projects.find((p) => p.code === projectCode.value));

  /** 按姓名反查专家（展示单位/电话） */
  function expertOf(name: string) {
    return store.experts.find((e) => e.name === name);
  }

  /** 评估表单 */
  const form = reactive({
    evalResult: '' as '通过' | '不通过' | '',
    evalOpinion: '',
    attachments: [] as string[],
  });

  function handleBeforeUpload(file: File) {
    form.attachments.push(file.name);
    return false;
  }
  function removeAttachment(index: number) {
    form.attachments.splice(index, 1);
  }

  /** 提交评估：通过 → 待评价（后续对本项目专家评价后才已完成）；不通过 → 回待提交 */
  function submitEvaluation() {
    const p = project.value;
    if (!p) return;
    if (!form.evalResult) {
      showMessage('请选择评估结果');
      return;
    }
    if (!form.evalOpinion.trim()) {
      showMessage('请填写评估意见');
      return;
    }
    const status = form.evalResult === '通过' ? '待评价' : '待提交';
    store.updateProject(p.id, {
      evalResult: form.evalResult,
      evalOpinion: form.evalOpinion.trim(),
      evalAttachments: [...form.attachments],
      status,
    });
    showMessage(form.evalResult === '通过' ? '评估已提交（通过），进入待评价' : '评估已提交（不通过），项目回到待提交');
    go(LIST_ROUTE);
  }

  function goBack() {
    go(LIST_ROUTE);
  }
</script>

<style scoped>
  :deep(.ant-upload) {
    display: block;
    width: 100%;
  }
  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 24px 16px;
    border: 1px dashed #c9d4e3;
    border-radius: 8px;
    background: #fafcff;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s;
  }
  .upload-zone:hover {
    border-color: #3a8ef6;
    background: #f0f6ff;
  }
</style>
