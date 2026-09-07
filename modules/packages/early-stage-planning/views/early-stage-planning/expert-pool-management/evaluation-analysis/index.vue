<!--
  市住更局 —— 考评分析（三师库管理）

  三师库管理 · 子模块三：对入库专家打分考评。布局对齐原型：
  - 顶部三张排名卡（活跃度/专业覆盖度/评审效率 Top5，绿色渐变条 + 序号 + 姓名 + 得分）；
  - 下方专家列表（姓名/性别/年龄/联系电话/身份证号/评价次数/三维度得分/操作）；
  - 操作列「评价」弹出打分 Modal（Rate 半星步进，一颗星 2 分、半颗星 1 分，三维度各 10 分），
    提交生成一条评价记录并实时刷新平均分；「历史记录」跳评价历史页（history.vue）。
  当前后端尚未介入：数据来自本地 evaluation-mock.ts（模块单例，两页共享，刷新页面恢复）。

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址：/early-stage-planning/expert-pool-management/evaluation-analysis/index
   - 组件位置：/early-stage-planning/expert-pool-management/evaluation-analysis/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 三张排名卡：活跃度 / 专业覆盖度 / 评审效率 Top5 -->
    <div class="grid grid-cols-3 gap-16px">
      <div v-for="card in rankCards" :key="card.title" class="bg-white rd-12px b-1 b-solid b-gray-100 p-16px shadow-sm">
        <div class="text-15px font-600 text-gray-800">{{ card.title }}</div>

        <div v-if="card.rows.length === 0" class="flex h-150px items-center justify-center text-13px text-gray-400">
          暂无评价数据
        </div>
        <div v-else class="mt-10px space-y-10px">
          <div v-for="(row, i) in card.rows" :key="`${card.title}-${row.name}`" class="flex items-center gap-8px">
            <span class="w-14px shrink-0 text-right text-13px text-gray-500">{{ i + 1 }}</span>
            <span class="w-44px shrink-0 truncate text-14px text-gray-800" :title="row.name">{{ row.name }}</span>
            <div class="h-12px flex-1 rd-2px bg-transparent">
              <div
                class="h-full rd-2px"
                :style="{
                  width: `${(row.score / 10) * 100}%`,
                  background: 'linear-gradient(90deg, #A3D977 0%, #8CC863 100%)',
                }"
              ></div>
            </div>
            <span class="w-32px shrink-0 text-right text-13px text-gray-600">{{ row.score.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 专家列表 -->
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <span>专家列表</span>
      </template>
      <!-- 每列独立具名插槽（列定义 slot: 'xxx'）：不能用 #bodyCell，会覆盖操作列渲染 -->
      <template #selected="{ record }">
        <Tag :color="record.selected ? 'success' : 'default'">{{ record.selected ? '是' : '否' }}</Tag>
      </template>
    </BasicTable>

    <!-- 打分 Modal：三维度星形评分（半星步进）+ 实时显示得分（Modal 显式导入——全局仅注册了 Input/Button） -->
    <Modal
      v-model:open="rateModal.open"
      :title="`评价专家 - ${rateModal.expert?.name ?? ''}`"
      :confirm-loading="rateModal.loading"
      ok-text="确定"
      centered
      cancel-text="取消"
      @ok="submitRate"
    >
      <div class="flex flex-col gap-18px py-16px">
        <div v-for="dim in RATE_DIMENSIONS" :key="dim.key" class="flex items-center gap-12px">
          <span class="shrink-0 text-right text-14px text-gray-700 w-200px">{{ dim.label }}（10分）:</span>
          <Rate v-model:value="rateModal[dim.key]" allow-half />
          <span class="text-14px text-gray-500">{{ (rateModal[dim.key] * 2).toFixed(1) }} 分</span>
        </div>

        <div class="flex items-start gap-12px">
          <span class="w-110px shrink-0 text-right text-14px leading-32px text-gray-700">评价说明:</span>
          <a-textarea v-model:value="rateModal.comment" :rows="4" placeholder="请输入内容" class="flex-1" />
        </div>
      </div>
    </Modal>

    <!-- 历史评价 Modal（内嵌，不单独开路由） -->
    <Modal v-model:open="historyModal.open" width="1400px" centered :footer="null">
      <template #title>
        <span>历史评价</span>
        <span v-if="historyModal.expertName" class="ml-8px text-14px font-400 text-gray-500">{{
          historyModal.expertName
        }}</span>
      </template>

      <div class="max-h-[60vh] overflow-y-auto pr-4px">
        <div
          v-if="historyRecords.length === 0"
          class="flex h-200px items-center justify-center text-14px text-gray-400"
        >
          该专家暂无评价记录
        </div>
        <div v-else class="space-y-16px">
          <div v-for="rec in historyRecords" :key="rec.id" class="rd-8px bg-[#EBF3FB] p-16px">
            <!-- 首行：评价单位 / 评价人 / 评价时间 + 删除 -->
            <div class="flex items-center gap-24px text-13px text-gray-700">
              <span>评价单位: {{ rec.org || 'xxx公司' }}</span>
              <span>评价人: {{ rec.evaluator }}</span>
              <span>评价时间: {{ rec.time }}</span>
              <a-button type="link" danger size="small" class="ml-auto" @click="handleHistoryDelete(rec)"
                >删除</a-button
              >
            </div>

            <!-- 三维度星级行 -->
            <div class="mt-10px flex flex-wrap items-center gap-x-32px gap-y-6px text-13px text-gray-700">
              <span class="flex items-center gap-8px">
                活跃度（10分）:
                <Rate :value="rec.activityStars" allow-half disabled class="text-16px" />
              </span>
              <span class="flex items-center gap-8px">
                专业覆盖度（10分）:
                <Rate :value="rec.coverageStars" allow-half disabled class="text-16px" />
              </span>
              <span class="flex items-center gap-8px">
                评审效率（10分）:
                <Rate :value="rec.efficiencyStars" allow-half disabled class="text-16px" />
              </span>
            </div>

            <!-- 评价说明 -->
            <div class="mt-10px flex items-start gap-8px text-13px">
              <span class="shrink-0 text-gray-700">评价说明:</span>
              <span class="leading-22px text-gray-600">{{ rec.comment || '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolEvaluationAnalysisIndex">
  import { computed, onActivated, reactive } from 'vue';
  import { Input, Modal, Rate, Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import { useUserStore } from '@jeesite/core/store/modules/user';
  import type { Expert } from '../expert-store';
  import { useExpertPoolStore } from '../expert-store';

  const { showMessage } = useMessage();

  /** 三师库共享 store（Pinia） */
  const expertStore = useExpertPoolStore();

  /** 当前登录用户（评价人姓名取自这里） */
  const userStore = useUserStore();

  /** 打分维度定义（Modal 行 + 得分换算共用） */
  const RATE_DIMENSIONS = [
    { key: 'activity', label: '活跃度' },
    { key: 'coverage', label: '专业覆盖度' },
    { key: 'efficiency', label: '评审效率' },
  ] as const;
  type RateDimensionKey = (typeof RATE_DIMENSIONS)[number]['key'];

  /** 专家列表行 = 基础信息 + 三维度平均分 + 评价次数（评价/删除记录后自动重算） */
  const expertRows = computed(() =>
    expertStore.experts.map((e) => {
      const avg = expertStore.avgScoreOf(e.id);
      return {
        ...e,
        activityScore: avg.activity,
        coverageScore: avg.coverage,
        efficiencyScore: avg.efficiency,
        evalCount: avg.count,
      };
    }),
  );

  /** 三张排名卡（Top5，无数据显示空态） */
  const rankCards = computed(() => [
    {
      title: '活跃度排名',
      rows: [...expertRows.value]
        .filter((e) => e.activityScore > 0)
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, 5)
        .map((e) => ({ name: e.name, score: e.activityScore })),
    },
    {
      title: '专业覆盖度排名',
      rows: [...expertRows.value]
        .filter((e) => e.coverageScore > 0)
        .sort((a, b) => b.coverageScore - a.coverageScore)
        .slice(0, 5)
        .map((e) => ({ name: e.name, score: e.coverageScore })),
    },
    {
      title: '评审效率排名',
      rows: [...expertRows.value]
        .filter((e) => e.efficiencyScore > 0)
        .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
        .slice(0, 5)
        .map((e) => ({ name: e.name, score: e.efficiencyScore })),
    },
  ]);

  /** 表格列（对齐原型：姓名/性别/年龄/电话/身份证/评价次数/三维度得分/操作） */
  const columns: BasicColumn[] = [
    { title: '专家姓名', dataIndex: 'name', width: 100 },
    { title: '性别', dataIndex: 'gender', width: 70 },
    { title: '年龄', dataIndex: 'age', width: 70 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '身份证号', dataIndex: 'idCard', width: 170 },
    { title: '评价次数', dataIndex: 'evalCount', width: 90, align: 'center' },
    { title: '活跃度得分（10）', dataIndex: 'activityScore', width: 140, align: 'center' },
    { title: '专业覆盖度得分（10）', dataIndex: 'coverageScore', width: 160, align: 'center' },
    { title: '评审效率得分（10）', dataIndex: 'efficiencyScore', width: 140, align: 'center' },
  ];

  /** 操作列：评价（弹打分 Modal）/ 历史记录（跳历史页，携带专家 id 与姓名） */
  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      { label: '评价', onClick: () => openRateModal(record as unknown as Expert) },
      {
        label: '历史记录',
        onClick: () => openHistory(record as unknown as Expert),
      },
    ],
  };

  const [registerTable, { setTableData }] = useTable({
    dataSource: expertRows.value,
    columns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: { pageSize: 10 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 6, lg: 5 },
      labelWidth: 100,
      // TODO: 分数区间过滤接入接口后由后端执行；本地先仅支持姓名过滤
      schemas: [{ label: '专家姓名', field: 'name', component: 'Input', componentProps: { placeholder: '请输入' } }],
    },
    handleSearchInfoFn: (params: Recordable) => {
      const name = String(params.name ?? '').trim();
      setTableData(expertRows.value.filter((e) => !name || e.name.includes(name)));
      return params;
    },
  });

  /** 打分 Modal 状态（三维度星级 0.5 步进 + 评价说明） */
  const rateModal = reactive({
    open: false,
    loading: false,
    activity: 0,
    coverage: 0,
    efficiency: 0,
    comment: '',
    expert: null as Expert | null,
  });

  /** 打开打分 Modal（星级与说明每次重置） */
  function openRateModal(expert: Expert) {
    rateModal.expert = expert;
    rateModal.activity = 0;
    rateModal.coverage = 0;
    rateModal.efficiency = 0;
    rateModal.comment = '';
    rateModal.open = true;
  }

  /** 提交评价：生成一条记录 + 三维度平均分实时联动（TODO: 后端就绪后改为接口提交） */
  function submitRate() {
    const expert = rateModal.expert;
    if (!expert) return;
    if (!rateModal.activity || !rateModal.coverage || !rateModal.efficiency) {
      showMessage('请为三个维度都打分');
      return;
    }
    rateModal.loading = true;
    // 模拟接口耗时
    setTimeout(() => {
      expertStore.addEvaluation({
        expertId: expert.id,
        activityStars: rateModal.activity,
        coverageStars: rateModal.coverage,
        efficiencyStars: rateModal.efficiency,
        time: dateUtil().format('YYYY-MM-DD'),
        // 评价单位取当前登录用户所在机构/单位（officeName → company 兜底）
        org: userStore.getUserInfo.officeName || userStore.getUserInfo.company || '—',
        comment: rateModal.comment,
        // 评价人取当前登录用户姓名，未取到回退登录账号 / 管理员
        evaluator: userStore.getUserInfo.userName || userStore.getUserInfo.loginCode || '管理员',
      });
      rateModal.loading = false;
      rateModal.open = false;
      // 评价记录变化后刷新表格：让「评价次数 / 三维度平均分」即时联动
      refreshTable();
      showMessage('评价成功（本地演示，未持久化）');
    }, 300);
  }

  /** 重算平均分并同步表格（记录变化后调用；expertRows 为 computed，刷新数据源即可） */
  function refreshTable() {
    setTableData(expertRows.value);
  }

  /** 历史评价 Modal（内嵌展示，不单独开路由） */
  const historyModal = reactive({
    open: false,
    expertId: 0,
    expertName: '',
  });

  /** 当前专家的评价记录 */
  const historyRecords = computed(() => expertStore.recordsOf(historyModal.expertId));

  /** 打开历史评价 Modal */
  function openHistory(expert: Expert) {
    historyModal.expertId = expert.id;
    historyModal.expertName = expert.name;
    historyModal.open = true;
  }

  /** 删除评价记录（删除后三维度平均分自动重算；TODO: 后端就绪后改为接口提交） */
  function handleHistoryDelete(rec: Recordable) {
    expertStore.removeEvaluation(rec.id);
    refreshTable();
    showMessage('删除成功（本地演示，未持久化）');
  }

  // keep-alive 页签再次进入时同步（历史页可能删除过记录）
  onActivated(refreshTable);
</script>
