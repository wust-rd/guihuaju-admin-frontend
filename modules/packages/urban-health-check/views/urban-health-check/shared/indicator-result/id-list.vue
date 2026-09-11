<!--
  市住更局 —— 指标项结果 show 页(容器)

  规划路由(RESTful,后端隐藏菜单,已注册):
   - 链接地址:/urban-health-check/urban/indicator-result/{id}(show 页;与 /list 静态段不冲突)
   - 组件位置:/urban-health-check/urban/indicator-result/_id/list(与链接地址不一致,菜单里已显式填写)
   - 是否可见:隐藏;上级菜单挂「指标项结果管理」以点亮侧边栏
  页面结构:Card(体系信息+进度+提交发布) → Tabs(一级维度 dim-table / 指标项 indicator-table)。
  接口已接入：indicatorResultStatInfo（进度卡统计）+ indicatorResultSubmitSet（体系级提交发布）。
-->
<template>
  <PageWrapper>
    <Card class="mb-3" :title="system?.indicatorName || systemId">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-gray-500">{{ system?.year ?? '-' }} 年</span>
          <Progress
            class="ml-6 w-72"
            :percent="filledPercent"
            :format="() => `已填报结果指标项 ${system?.filledCount ?? 0} / 指标数量 ${system?.indicatorCount ?? 0} 项`"
          />
        </div>
        <a-button type="primary" :loading="submitting" @click="handleSubmitPublish">提交发布</a-button>
      </div>
    </Card>
    <Tabs type="card">
      <Tabs.TabPane key="dim" tab="一级维度">
        <DimTable />
      </Tabs.TabPane>
      <Tabs.TabPane key="indicator" tab="指标项">
        <IndicatorTable :system="system" />
      </Tabs.TabPane>
    </Tabs>
  </PageWrapper>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultIdList">
  import { computed, onMounted, ref, unref } from 'vue';
  import { Card, Progress, Tabs } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import type { IndicatorResult } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import {
    indicatorResultStatInfo,
    indicatorResultSubmitSet,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import DimTable from './dim-table.vue';
  import IndicatorTable from './indicator-table.vue';

  const { params } = unref(router.currentRoute);
  // 兼容菜单链接地址占位符写 {id} 或 {code}:路由参数名与占位符一致
  const systemId = ((params.id ?? params.code) as string) || '';

  const { showMessage } = useMessage();

  /** 体系结果统计（按 code 取单行：filledCount/indicatorCount 驱动进度卡） */
  const system = ref<IndicatorResult | undefined>();

  /** 页签标题默认取菜单名,这里改为体系名称 */
  const { setTitle } = useTabs(router);
  onMounted(async () => {
    try {
      system.value = await indicatorResultStatInfo(systemId);
      if (system.value?.indicatorName) {
        setTitle(`指标项结果-${system.value.indicatorName}`);
      }
    } catch (e: any) {
      showMessage(e?.message || '加载统计信息失败', 'error');
    }
  });

  /** 填报进度:已填报结果指标数 / 指标数量 */
  const filledPercent = computed(() => {
    const total = system.value?.indicatorCount ?? 0;
    if (!total) return 0;
    return Math.min(100, Math.round(((system.value?.filledCount ?? 0) / total) * 10000) / 100);
  });

  /** 提交发布:提交该体系全部已填报完整的结果行（渐进式快照，未填完的可补填后再提交） */
  const submitting = ref(false);
  async function handleSubmitPublish() {
    submitting.value = true;
    try {
      const { submitCount } = await indicatorResultSubmitSet(systemId);
      showMessage(`提交发布成功（本次提交 ${submitCount} 项）`);
      system.value = await indicatorResultStatInfo(systemId);
    } catch (e: any) {
      showMessage(e?.message || '提交失败', 'error');
    } finally {
      submitting.value = false;
    }
  }
</script>
