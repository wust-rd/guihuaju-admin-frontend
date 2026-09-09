<!--
  市住更局 —— 城市更新专家管理 · 专家评价

  对已入选专家打分考评：顶部三张排名卡（活跃度/专业度/效率 Top5，彩色渐变条），
  下方专家列表（仅展示已入选专家），操作列「评价」弹打分 Modal（半星步进）、「历史记录」内嵌 Modal。
  数据来自本模块共享 store；打分后平均分与排名即时联动。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 三张排名卡 -->
    <div class="grid grid-cols-3 gap-16px">
      <div
        v-for="card in rankCards"
        :key="card.title"
        class="bg-white rd-12px b-1 b-solid b-gray-100 p-16px shadow-sm"
        :style="{ '--accent': card.accent }"
      >
        <div class="flex items-center gap-8px">
          <span class="h-16px w-4px rd-full" :style="{ background: card.accent }"></span>
          <span class="text-15px font-600 text-gray-800">{{ card.title }}</span>
        </div>

        <div v-if="card.rows.length === 0" class="flex h-150px items-center justify-center text-13px text-gray-400">
          暂无评价数据
        </div>
        <div v-else class="mt-12px space-y-14px">
          <div v-for="(row, i) in card.rows" :key="`${card.title}-${row.name}`" class="flex items-center gap-10px">
            <span
              class="rank-badge flex h-22px w-22px shrink-0 items-center justify-center rd-full text-13px font-500 text-gray-500"
              >{{ i + 1 }}</span
            >
            <span class="w-56px shrink-0 truncate text-14px text-gray-800" :title="row.name">{{ row.name }}</span>
            <div class="h-10px flex-1 rd-full bg-[#EEF2F7] overflow-hidden">
              <div
                class="h-full rd-full"
                :style="{ width: `${(row.score / 10) * 100}%`, background: card.barGradient }"
              ></div>
            </div>
            <span class="w-36px shrink-0 text-right text-13px font-500 text-gray-700">{{ row.score.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 专家列表 -->
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <span>已入选专家</span>
      </template>
    </BasicTable>

    <!-- 打分 Modal -->
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
          <Input.TextArea v-model:value="rateModal.comment" :rows="3" placeholder="请输入内容" class="flex-1" />
        </div>
      </div>
    </Modal>

    <!-- 历史评价 Modal -->
    <Modal v-model:open="historyModal.open" width="720px" centered :footer="null">
      <template #title>
        <span>历史评价</span>
        <span v-if="historyModal.expertName" class="ml-8px text-14px font-400 text-gray-500">{{ historyModal.expertName }}</span>
      </template>
      <div class="max-h-[60vh] overflow-y-auto pr-4px">
        <div v-if="historyRecords.length === 0" class="flex h-200px items-center justify-center text-14px text-gray-400">
          该专家暂无评价记录
        </div>
        <div v-else class="space-y-16px">
          <div v-for="rec in historyRecords" :key="rec.id" class="rd-8px bg-[#EBF3FB] p-16px">
            <div class="flex items-center gap-24px text-13px text-gray-700">
              <span>评价人: {{ rec.evaluator }}</span>
              <span>评价时间: {{ rec.time }}</span>
              <a-button type="link" danger size="small" class="ml-auto" @click="handleHistoryDelete(rec)">删除</a-button>
            </div>
            <div class="mt-10px flex flex-wrap items-center gap-x-32px gap-y-6px text-13px text-gray-700">
              <span class="flex items-center gap-8px">活跃度: <Rate :value="rec.activityStars" allow-half disabled class="text-16px" /></span>
              <span class="flex items-center gap-8px">专业度: <Rate :value="rec.coverageStars" allow-half disabled class="text-16px" /></span>
              <span class="flex items-center gap-8px">效率: <Rate :value="rec.efficiencyStars" allow-half disabled class="text-16px" /></span>
            </div>
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
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertEvaluation">
  import { computed, reactive } from 'vue';
  import { Input, Modal, Rate } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import type { UrbanExpert } from '../expert-store';
  import { useUrbanExpertStore } from '../expert-store';

  const { showMessage } = useMessage();
  const store = useUrbanExpertStore();

  /** 打分维度定义 */
  const RATE_DIMENSIONS = [
    { key: 'activity', label: '活跃度' },
    { key: 'coverage', label: '专业度' },
    { key: 'efficiency', label: '效率' },
  ] as const;
  type RateDimensionKey = (typeof RATE_DIMENSIONS)[number]['key'];

  /** 专家列表行 = 基础信息 + 三维度平均分 + 评价次数（仅展示已入选专家） */
  const expertRows = computed(() =>
    store.experts
      .filter((e) => e.selected)
      .map((e) => {
        const avg = store.avgScoreOf(e.id);
        return {
          ...e,
          activityScore: avg.activity,
          coverageScore: avg.coverage,
          efficiencyScore: avg.efficiency,
          evalCount: avg.count,
        };
      }),
  );

  /** 三张排名卡（Top5，主题色 per card） */
  const rankCards = computed(() => [
    {
      title: '活跃度排名',
      accent: '#3A8EF6',
      barGradient: 'linear-gradient(90deg, #5AB2FF 0%, #3A8EF6 100%)',
      rows: [...expertRows.value]
        .filter((e) => e.activityScore > 0)
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, 5)
        .map((e) => ({ name: e.name, score: e.activityScore })),
    },
    {
      title: '专业度排名',
      accent: '#2AB69B',
      barGradient: 'linear-gradient(90deg, #4ED3B8 0%, #2AB69B 100%)',
      rows: [...expertRows.value]
        .filter((e) => e.coverageScore > 0)
        .sort((a, b) => b.coverageScore - a.coverageScore)
        .slice(0, 5)
        .map((e) => ({ name: e.name, score: e.coverageScore })),
    },
    {
      title: '效率排名',
      accent: '#F7A832',
      barGradient: 'linear-gradient(90deg, #FFC163 0%, #F7A832 100%)',
      rows: [...expertRows.value]
        .filter((e) => e.efficiencyScore > 0)
        .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
        .slice(0, 5)
        .map((e) => ({ name: e.name, score: e.efficiencyScore })),
    },
  ]);

  /** 表格列 */
  const columns: BasicColumn[] = [
    { title: '专家姓名', dataIndex: 'name', width: 100 },
    { title: '性别', dataIndex: 'gender', width: 70 },
    { title: '年龄', dataIndex: 'age', width: 70 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '评价次数', dataIndex: 'evalCount', width: 90, align: 'center' },
    { title: '活跃度得分（10）', dataIndex: 'activityScore', width: 140, align: 'center' },
    { title: '专业度得分（10）', dataIndex: 'coverageScore', width: 140, align: 'center' },
    { title: '效率得分（10）', dataIndex: 'efficiencyScore', width: 130, align: 'center' },
  ];

  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      { label: '评价', onClick: () => openRateModal(record as unknown as UrbanExpert) },
      { label: '历史记录', onClick: () => openHistory(record as unknown as UrbanExpert) },
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
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 90,
      schemas: [{ label: '专家姓名', field: 'name', component: 'Input' }],
    },
    handleSearchInfoFn: (params: Recordable) => {
      const name = String(params.name ?? '').trim();
      setTableData(expertRows.value.filter((e) => !name || e.name.includes(name)));
      return params;
    },
  });

  /** 打分 Modal */
  const rateModal = reactive({
    open: false,
    loading: false,
    activity: 0,
    coverage: 0,
    efficiency: 0,
    comment: '',
    expert: null as UrbanExpert | null,
  });

  function openRateModal(expert: UrbanExpert) {
    rateModal.expert = expert;
    rateModal.activity = 0;
    rateModal.coverage = 0;
    rateModal.efficiency = 0;
    rateModal.comment = '';
    rateModal.open = true;
  }

  function submitRate() {
    const expert = rateModal.expert;
    if (!expert) return;
    if (!rateModal.activity || !rateModal.coverage || !rateModal.efficiency) {
      showMessage('请为三个维度都打分');
      return;
    }
    rateModal.loading = true;
    setTimeout(() => {
      store.addEvaluation({
        expertId: expert.id,
        activityStars: rateModal.activity,
        coverageStars: rateModal.coverage,
        efficiencyStars: rateModal.efficiency,
        time: dateUtil().format('YYYY-MM-DD'),
        comment: rateModal.comment,
      });
      rateModal.loading = false;
      rateModal.open = false;
      refreshTable();
      showMessage('评价成功（本地演示，未持久化）');
    }, 300);
  }

  function refreshTable() {
    setTableData(expertRows.value);
  }

  /** 历史评价 Modal */
  const historyModal = reactive({
    open: false,
    expertId: 0,
    expertName: '',
  });

  const historyRecords = computed(() => store.recordsOf(historyModal.expertId));

  function openHistory(expert: UrbanExpert) {
    historyModal.expertId = expert.id;
    historyModal.expertName = expert.name;
    historyModal.open = true;
  }

  function handleHistoryDelete(rec: Recordable) {
    store.removeEvaluation(rec.id);
    refreshTable();
    showMessage('删除成功（本地演示，未持久化）');
  }
</script>

<style scoped>
  .rank-badge {
    transition:
      background-color 0.2s,
      color 0.2s;
  }
  .rank-badge:hover {
    background: var(--accent, #3e8ef7);
    color: #fff;
  }
</style>
