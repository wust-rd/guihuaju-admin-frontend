<!--
  三师库 · 考评分析 —— 历史评价 Modal（内嵌展示，不单独开路由）

  从 index.vue 拆出：打开时按专家调接口 4.3 拉评价记录（首屏前 50 条），
  卡片流展示（评价单位/评价人/时间 + 三维度星级 + 评价说明），支持删除（4.5）。

  props：
  - open: v-model:open 双向控制显隐
  - expertId / expertName: 当前专家

  emits：
  - update:open
  - deleted: 删除了一条记录（父级刷新列表与排名）
-->
<template>
  <Modal :open="open" width="1400px" centered :footer="null" @cancel="emit('update:open', false)">
    <template #title>
      <span>历史评价</span>
      <span v-if="expertName" class="ml-8px text-14px font-400 text-gray-500">{{ expertName }}</span>
    </template>

    <div class="max-h-[60vh] overflow-y-auto pr-4px">
      <div v-if="records.length === 0" class="flex h-200px items-center justify-center text-14px text-gray-400">
        该专家暂无评价记录
      </div>
      <div v-else class="space-y-16px">
        <div v-for="rec in records" :key="rec.id" class="rd-8px bg-[#EBF3FB] p-16px">
          <!-- 首行：评价单位 / 评价人 / 评价时间 + 删除 -->
          <div class="flex items-center gap-24px text-13px text-gray-700">
            <span>评价单位: {{ rec.org || '—' }}</span>
            <span>评价人: {{ rec.evaluator }}</span>
            <span>评价时间: {{ rec.time }}</span>
            <a-button type="link" danger size="small" class="ml-auto" @click="handleDelete(rec)">删除</a-button>
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
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolEvaluationAnalysisHistoryModal">
  import { ref, watch } from 'vue';
  import { Modal, Rate } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    espEvaluationDelete,
    espEvaluationPage,
    type EspEvalRecord,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';

  const props = defineProps({
    open: { type: Boolean, default: false },
    expertId: { type: String, default: '' },
    expertName: { type: String, default: '' },
  });

  const emit = defineEmits(['update:open', 'deleted']);

  const { showMessage } = useMessage();

  /** 评价记录（打开时拉取，按时间倒序，首屏取前 50 条） */
  const records = ref<EspEvalRecord[]>([]);
  async function loadRecords() {
    if (!props.expertId) return;
    const { list } = await espEvaluationPage({ expertId: props.expertId, pageNum: 1, pageSize: 50 });
    records.value = list;
  }

  watch(
    () => props.open,
    (open) => {
      if (open) loadRecords();
    },
  );

  /** 删除评价记录（接口 4.5；通知父级刷新列表与排名） */
  async function handleDelete(rec: Recordable) {
    await espEvaluationDelete(String(rec.id));
    showMessage('删除成功');
    emit('deleted');
    loadRecords();
  }
</script>
