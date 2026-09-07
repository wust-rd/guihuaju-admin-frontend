<!--
  市住更局 —— 随机抽取（三师库管理）

  三师库管理 · 子模块二：按条件从三师库随机抽取专家。
  布局对齐设计稿：上方抽取器（片区/专业领域下拉 + 抽取类型复选 + 回避规则 + 重置/抽取按钮），
  下方抽取结果（专家卡片：头像/姓名/职称 + 专业标签 + 单位 + 履历摘要 + 电话，
  支持整批「随机更换」「确认选用」与单卡「随机更换」「指定人员」）。
  当前后端尚未介入：结果为本地占位数据，抽取/更换在前端随机模拟，接口就绪后替换 loadCandidates 与抽取逻辑。

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址：/early-stage-planning/expert-pool-management/random-draw/index
   - 组件位置：/early-stage-planning/expert-pool-management/random-draw/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px p-16px">
    <!-- 抽取器：筛选条件 + 操作按钮 -->
    <div class="rd-10px p-16px h-88px" style="background-color: rgba(15, 23, 42, 0.02)">
      <div
        class="flex rd-12px flex-wrap items-center gap-x-24px gap-y-12px size-full bg-white p-8px"
        style="box-shadow: 0 16px 36px -20px rgba(76, 132, 192, 0.12)"
      >
        <div class="flex items-center gap-8px bg-black/2 h-40px rd-8px b-1 b-solid b-black/4">
          <span class="w-52px shrink-0 text-right text-14px text-gray-500">片区</span>

          <Select
            v-model:value="query.district"
            :options="DISTRICT_OPTIONS"
            placeholder="请输入或选择"
            class="w-180px rd-8px"
            allowClear
            showSearch
            :bordered="false"
          />
        </div>

        <div class="flex items-center gap-8px bg-black/2 h-40px b-1 b-solid b-black/4 rd-8px px-12px">
          <span class="w-60px shrink-0 text-right text-14px text-gray-500">专业领域</span>
          <Select
            v-model:value="query.field"
            :options="FIELD_OPTIONS"
            placeholder="请选择"
            class="w-220px rd-8px"
            allowClear
            showSearch
            :bordered="false"
          />
        </div>

        <div class="flex items-center gap-12px">
          <span class="text-14px text-gray-500">抽取类型</span>
          <Checkbox v-for="opt in TYPE_OPTIONS" :key="opt.value" v-model:checked="typeChecked[opt.value]">
            {{ opt.label }}
          </Checkbox>
        </div>

        <div class="flex items-center gap-8px">
          <span class="text-14px text-gray-700">回避规则</span>
          <Checkbox v-model:checked="query.avoidDrawn">排除已入三师专家</Checkbox>
        </div>

        <div class="ml-auto flex items-center gap-12px">
          <a-button @click="handleReset" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:redo-outlined"></span> 重置
            </span>
          </a-button>
          <a-button type="primary" :loading="drawing" @click="handleDraw" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px"> <span class="i-ri:search-2-line"></span> 抽取 </span>
          </a-button>
        </div>
      </div>
    </div>

    <!-- 抽取结果 -->
    <div class="rd-24px bg-white shadow-sm b-2px b-solid b-[#6975860A]">
      <!-- 结果头：标题 + 整批操作 -->
      <div class="flex items-center gap-8px h-60px bg-white/60 px-32px">
        <span class="i-ant-design:team-outlined text-18px text-gray-600"></span>
        <span class="text-18px font-500 text-gray-800">抽取结果</span>

        <div class="ml-auto flex items-center gap-12px">
          <a-button type="link" :disabled="results.length === 0" @click="handleDraw" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:redo-outlined"></span> 随机更换
            </span>
          </a-button>
          <a-button type="primary" :disabled="results.length === 0" @click="handleConfirm" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:check-outlined"></span> 确认选用
            </span>
          </a-button>
        </div>
      </div>

      <!-- 专家卡片：flex 横排，超出容器宽度横向滚动；无结果时显示占位 -->
      <div
        class="mt-16px flex h-300px items-stretch gap-16px overflow-x-auto bg-[#519bd40a] rd-8px p-12px scrollbar-none"
      >
        <template v-if="results.length > 0">
          <div
            v-for="expert in results"
            :key="expert.id"
            class="rd-12px border border-gray-100 p-16px shadow-sm transition-shadow hover:shadow-md w-400px h-218px shrink-0 bg-white self-center"
          >
            <!-- 头部：头像 + 姓名 + 职称徽标 -->
            <div class="flex items-start gap-12px">
              <div class="size-48px shrink-0 rd-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-18px font-500">
                {{ expert.name.slice(0, 1) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between">
                  <span class="truncate text-16px font-500 text-gray-800">{{ expert.name }}</span>
                  <span class="inline-flex shrink-0 items-center gap-2px text-13px text-amber-500">
                    <span class="i-ant-design:check-circle-filled"></span>
                    {{ expert.title }}
                  </span>
                </div>
                <div class="mt-6px flex items-center gap-8px">
                  <span class="rd-4px bg-cyan-50 px-6px py-1px text-12px text-cyan-600">{{ expert.field }}</span>
                  <span class="truncate text-13px text-gray-600">{{ expert.org }}</span>
                </div>
              </div>
            </div>

            <!-- 履历摘要 -->
            <p class="mt-12px line-clamp-2 text-13px leading-22px text-gray-500">
              {{ expert.career }}
              <a class="whitespace-nowrap text-cyan-600">... 更多信息 ></a>
            </p>

            <!-- 底部：电话 + 单卡操作 -->
            <div class="mt-12px flex items-center justify-between border-t border-gray-50 pt-10px">
              <span class="flex items-center gap-6px text-13px text-gray-700">
                <span class="i-ant-design:phone-outlined"></span>
                {{ expert.phone }}
              </span>
              <div class="flex items-center gap-8px">
                <a-button @click="replaceOne(expert)" class="h-36px rd-8px">
                  <span class="inline-flex items-center gap-4px">
                    <span class="i-ant-design:redo-outlined"></span> 随机更换
                  </span>
                </a-button>
                <a-button type="primary" @click="assignExpert(expert)" class="h-36px rd-8px">
                  <span class="inline-flex items-center gap-4px">
                    <span class="i-ant-design:user-add-outlined"></span> 指定人员
                  </span>
                </a-button>
              </div>
            </div>
          </div>
        </template>

        <!-- 空态占位：无抽取结果时整块占位提示 -->
        <div v-else class="flex w-full items-center justify-center text-14px text-gray-400">
          请设置抽取条件后点击「抽取」
        </div>
      </div>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolRandomDrawIndex">
  import { reactive, ref } from 'vue';
  import { message } from 'antdv-next';
  import { Checkbox, Select } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import type { Expert } from '../expert-store';
  import { useExpertPoolStore } from '../expert-store';

  /** 抽取类型选项（对应三师角色，默认勾选规划师+评估师，对齐设计稿） */
  const TYPE_OPTIONS = [
    { label: '责任规划师', value: 'planner' },
    { label: '责任建筑师', value: 'architect' },
    { label: '责任评估师', value: 'assessor' },
  ];

  /** 片区下拉选项（占位，接入接口后替换） */
  const DISTRICT_OPTIONS = ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区', '洪山区'].map((d) => ({
    label: d,
    value: d,
  }));

  /** 专业领域下拉选项（占位，接入接口后替换） */
  const FIELD_OPTIONS = ['城市规划', '建筑设计', '市政工程', '交通工程', '园林景观', '工程造价'].map((f) => ({
    label: f,
    value: f,
  }));

  /** 抽取类型勾选状态（key → 是否勾选；默认勾选规划师+评估师，对齐设计稿） */
  const typeChecked = reactive<Record<string, boolean>>({ planner: true, architect: false, assessor: true });

  /** 抽取条件 */
  const query = reactive({
    district: undefined as string | undefined,
    field: undefined as string | undefined,
    avoidDrawn: true,
  });

  /** 勾选的类型 key 列表（由 typeChecked 派生） */
  const checkedTypes = () => TYPE_OPTIONS.filter((o) => typeChecked[o.value]).map((o) => o.value);

  /** 抽取结果（当前展示的专家卡片） */
  const results = ref<Expert[]>([]);
  /** 抽取中 loading */
  const drawing = ref(false);

  const { showMessage } = useMessage();

  /** 三师库共享 store（Pinia） */
  const expertStore = useExpertPoolStore();

  /** 三师角色 → 专业领域映射（占位：规划师=城市规划，建筑师=建筑学/园林景观，评估师=市政工程等） */
  const TYPE_FIELD_MAP: Record<string, string[]> = {
    planner: ['城市规划'],
    architect: ['建筑学', '园林景观'],
    assessor: ['市政工程', '交通规划', '环境科学'],
  };

  /** 从共享专家库随机抽 count 名（走 store action；专业领域 = 勾选类型映射 ∩ 所选领域，avoidDrawn 时排除已展示者） */
  function drawFromPool(count: number, excludeIds: number[] = []): Expert[] {
    const types = checkedTypes();
    const fields = types.flatMap((t) => TYPE_FIELD_MAP[t] ?? []);
    const effectiveFields = query.field ? fields.filter((f) => f === query.field) : fields;
    return expertStore.drawExperts(count, effectiveFields, query.avoidDrawn ? excludeIds : []);
  }

  /** 抽取 / 整批随机更换：抽 3 名展示 */
  function handleDraw() {
    if (checkedTypes().length === 0) {
      message.warning('请至少勾选一种抽取类型');
      return;
    }
    drawing.value = true;
    // 模拟接口耗时
    setTimeout(() => {
      const picked = drawFromPool(3);
      if (picked.length < 3) {
        message.warning(`符合条件的专家不足 3 名（当前 ${picked.length} 名），已展示全部`);
      }
      results.value = picked;
      drawing.value = false;
    }, 400);
  }

  /** 单卡随机更换：保持其余两张不动，只换这一张 */
  function replaceOne(expert: Expert) {
    const excludeIds = [...results.value.map((r) => r.id), expert.id];
    const [replacement] = drawFromPool(1, excludeIds);
    if (!replacement) {
      message.warning('没有更多符合条件的专家可供更换');
      return;
    }
    results.value = results.value.map((r) => (r.id === expert.id ? replacement : r));
  }

  /** 指定人员（TODO: 打开三师库人员选择弹窗，选中后替换该卡） */
  function assignExpert(_expert: Expert) {
    showMessage('指定人员：待接入三师库人员选择');
  }

  /** 确认选用（TODO: 接入接口后提交确认的专家名单） */
  function handleConfirm() {
    showMessage(`已确认选用 ${results.value.length} 名专家（本地演示，未持久化）`);
  }

  /** 重置：恢复默认条件并清空结果 */
  function handleReset() {
    query.district = undefined;
    query.field = undefined;
    query.avoidDrawn = true;
    typeChecked.planner = true;
    typeChecked.architect = false;
    typeChecked.assessor = true;
    results.value = [];
  }
</script>

<style>
  /* antdv Button 的 border-radius 由 antdv 自身样式设置（主题 token，默认 6px），
     与 UnoCSS 生成的 .rd-8px 同特异性、但 antdv 样式更靠后，会把 8px 覆盖回 6px。
     这里用更高特异性 + !important 兜底，确保按钮圆角按 rd-8px（8px）生效。 */
  .ant-btn.rd-8px {
    border-radius: 8px !important;
  }
</style>
