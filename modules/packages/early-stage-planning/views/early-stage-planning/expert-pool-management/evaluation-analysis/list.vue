<!--
  市住更局 —— 考评分析（列表页）

  三师库管理 · 子模块三：三师考评记录与统计分析。当前为空骨架，
  考评维度/图表与接口待设计稿/后端确定后填充。

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址：/early-stage-planning/expert-pool-management/evaluation-analysis/list
   - 组件位置：/early-stage-planning/expert-pool-management/evaluation-analysis/list（与链接地址一致）
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <span>考评分析</span>
      </template>
    </BasicTable>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolEvaluationAnalysisList">
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, useTable } from '@jeesite/core/components/Table';

  const [registerTable] = useTable({
    dataSource: [],
    columns: [],
    pagination: true,
    canResize: true,
  });
</script>
