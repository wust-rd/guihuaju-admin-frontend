<!--
  三师库 · 考评分析 —— 单张排名卡（Top5 渐变条）

  从 index.vue 拆出：标题彩色竖条 + Top5 行（排名徽标/姓名/渐变进度条/得分），三张卡共用同一组件。

  props：
  - title: 卡片标题（如 活跃度排名）
  - accent: 主题色（标题竖条与悬停徽标）
  - barGradient: 进度条渐变（CSS background 值）
  - rows: Top5 行（{ name, score }[]，score 满分 10）
-->
<template>
  <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-16px shadow-sm" :style="{ '--accent': accent }">
    <!-- 标题：左侧彩色竖条 + 标题 -->
    <div class="flex items-center gap-8px">
      <span class="h-16px w-4px rd-full" :style="{ background: accent }"></span>
      <span class="text-15px font-600 text-gray-800">{{ title }}</span>
    </div>

    <div v-if="rows.length === 0" class="flex h-150px items-center justify-center text-13px text-gray-400">
      暂无评价数据
    </div>
    <div v-else class="mt-12px space-y-14px">
      <div v-for="(row, i) in rows" :key="`${title}-${row.name}`" class="flex items-center gap-10px">
        <!-- 排名：默认灰色数字，悬停高亮为彩色圆形徽标 -->
        <span
          class="rank-badge flex h-22px w-22px shrink-0 items-center justify-center rd-full text-13px font-500 text-gray-500"
          >{{ i + 1 }}</span
        >
        <span class="w-56px shrink-0 truncate text-14px text-gray-800" :title="row.name">{{ row.name }}</span>
        <div class="h-10px flex-1 rd-full bg-[#EEF2F7] overflow-hidden">
          <div class="h-full rd-full" :style="{ width: `${(row.score / 10) * 100}%`, background: barGradient }"></div>
        </div>
        <span class="w-36px shrink-0 text-right text-13px font-500 text-gray-700">{{ row.score.toFixed(1) }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolEvaluationAnalysisRankCard">
  defineProps({
    title: { type: String, required: true },
    accent: { type: String, required: true },
    barGradient: { type: String, required: true },
    rows: { type: Array as () => { name: string; score: number }[], default: () => [] },
  });
</script>

<style scoped>
  .rank-badge {
    transition:
      background-color 0.2s,
      color 0.2s;
  }
  .rank-badge:hover {
    background-color: var(--accent);
    color: #fff;
  }
</style>
