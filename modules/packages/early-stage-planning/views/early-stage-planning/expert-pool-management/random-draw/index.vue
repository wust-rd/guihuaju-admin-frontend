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
              <img :src="expert.avatar" alt="" class="size-48px shrink-0 rd-full object-cover" />
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
              {{ expert.resume }}
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

  /** 专家候补池（占位数据，接入接口后替换为 loadCandidates()）；field 数组标记可抽取的类型 */
  interface Candidate {
    id: number;
    name: string;
    avatar: string;
    title: string;
    field: string;
    org: string;
    resume: string;
    phone: string;
    types: string[];
  }

  const RESUME_TEXT =
    '信息安全及项目管理 2001-2003山东正中计算机网络技术咨询有限公司任监理工程师; 2004年1月至今成都久信信息技术股份有限公司副总经理、...';

  const CANDIDATE_POOL: Candidate[] = [
    {
      id: 1,
      name: '李坤林',
      avatar: '',
      title: '正高级',
      field: '城市规划',
      org: '中国城市规划设计研究院',
      resume: RESUME_TEXT,
      phone: '18571455948',
      types: ['planner'],
    },
    {
      id: 2,
      name: '梅磊',
      avatar: '',
      title: '高级',
      field: '建筑设计',
      org: '中南建筑设计院',
      resume: RESUME_TEXT,
      phone: '18571455948',
      types: ['architect'],
    },
    {
      id: 3,
      name: '程素华',
      avatar: '',
      title: '高级',
      field: '市政工程',
      org: '武汉设计咨询集团有限公司',
      resume: RESUME_TEXT,
      phone: '18571455948',
      types: ['assessor'],
    },
    {
      id: 4,
      name: '王建国',
      avatar: '',
      title: '正高级',
      field: '城市规划',
      org: '武汉大学城市设计学院',
      resume: RESUME_TEXT,
      phone: '13971234567',
      types: ['planner', 'assessor'],
    },
    {
      id: 5,
      name: '陈晓峰',
      avatar: '',
      title: '高级',
      field: '建筑设计',
      org: '华中科技大学建筑与城市规划学院',
      resume: RESUME_TEXT,
      phone: '13876543210',
      types: ['architect'],
    },
    {
      id: 6,
      name: '刘雅婷',
      avatar: '',
      title: '高级',
      field: '园林景观',
      org: '武汉市园林建筑规划设计院',
      resume: RESUME_TEXT,
      phone: '13657112233',
      types: ['architect', 'assessor'],
    },
  ];

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
  const results = ref<Candidate[]>([]);
  /** 抽取中 loading */
  const drawing = ref(false);

  const { showMessage } = useMessage();

  /** 从候补池随机抽 count 名（按勾选类型过滤；avoidDrawn 时排除已展示者），接口就绪后替换为接口调用 */
  function drawFromPool(count: number, excludeIds: number[] = []): Candidate[] {
    const types = checkedTypes();
    let pool = CANDIDATE_POOL.filter((c) => c.types.some((t) => types.includes(t)));
    if (query.field) pool = pool.filter((c) => c.field === query.field);
    if (query.avoidDrawn) pool = pool.filter((c) => !excludeIds.includes(c.id));
    // 洗牌取前 count
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
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
  function replaceOne(expert: Candidate) {
    const excludeIds = [...results.value.map((r) => r.id), expert.id];
    const [replacement] = drawFromPool(1, excludeIds);
    if (!replacement) {
      message.warning('没有更多符合条件的专家可供更换');
      return;
    }
    results.value = results.value.map((r) => (r.id === expert.id ? replacement : r));
  }

  /** 指定人员（TODO: 打开三师库人员选择弹窗，选中后替换该卡） */
  function assignExpert(_expert: Candidate) {
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
