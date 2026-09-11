<!--
  市住更局 —— 指标项结果管理（列表页）

  菜单注册（菜单名称「指标项结果管理」）:
   - 链接地址:/urban-health-check/urban/indicator-result/list
   - 组件位置:/urban-health-check/urban/indicator-result/list(与链接地址一致)
   - 是否可见:显示
  show 页路由(RESTful,后端隐藏菜单,已注册):
   - 链接地址:/urban-health-check/urban/indicator-result/{id}(与 /list 静态段不冲突)
   - 上级菜单挂「指标项结果管理」以点亮侧边栏(配方同 indicator-system)
  接口已接入：indicatorResultStatPage（/cityCheck/indicatorResult/statPage）。
  统计行（指标数量/已填报/未填报/预警数）为按体系派生的只读数据（US-4.1 跟踪口径），
  无新增/编辑/删除；点击体系名称进入 show 页维护结果明细。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleDetail(record)" :title="record.indicatorName">
          {{ record.indicatorName }}
        </a>
      </template>
      <template #functionPosition="{ record }">
        {{ (record.functionPosition || []).join('、') }}
      </template>
    </BasicTable>
  </PageWrapper>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultList">
  import { unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { FormProps } from '@jeesite/core/components/Form';
  import { indicatorResultStatPage } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import { YEAR_OPTIONS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import {
    DISTRICTS,
    FUNCTION_POSITIONS,
    SURVEY_AREAS,
    toOptions,
  } from '@jeesite/urban-health-check/api/urban-health-check/common';

  const { meta } = unref(router.currentRoute);
  const go = useGo();

  const props = defineProps({
    /** 本级路由基址,如 /urban-health-check/urban/indicator-system */
    routeBase: { type: String, required: true },
    /** 区级体检:搜索表单附加 体检片区/行政区划/功能定位 */
    district: { type: Boolean, default: false },
  });
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '指标项结果管理',
  };

  /** 搜索表单 */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      {
        label: '体检年份',
        field: 'year',
        component: 'Select' as const,
        componentProps: { options: YEAR_OPTIONS, allowClear: true },
      },
      ...(props.district
        ? [
            {
              label: '体检片区',
              field: 'surveyArea',
              component: 'Select' as const,
              componentProps: { options: toOptions(SURVEY_AREAS), allowClear: true },
            },
            {
              label: '行政区划',
              field: 'adminDivision',
              component: 'Select' as const,
              componentProps: { options: toOptions(DISTRICTS), allowClear: true },
            },
            {
              label: '功能定位',
              field: 'functionPosition',
              component: 'Select' as const,
              componentProps: { mode: 'multiple', options: toOptions(FUNCTION_POSITIONS), allowClear: true },
            },
          ]
        : []),
      {
        label: '指标体系名称',
        field: 'indicatorName',
        component: 'Input',
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '编码', dataIndex: 'code', width: 100 },
    { title: '体检年份', dataIndex: 'year', width: 100 },
    ...(props.district
      ? [
          { title: '体检片区', dataIndex: 'surveyArea', width: 110, align: 'center' as const },
          { title: '行政区划', dataIndex: 'adminDivision', width: 100, align: 'center' as const },
          { title: '功能定位', dataIndex: 'functionPosition', width: 120, align: 'center' as const, slot: 'functionPosition' },
        ]
      : []),
    { title: '指标体系名称', dataIndex: 'indicatorName', slot: 'firstColumn', width: 150 },
    { title: '指标数量（项）', dataIndex: 'indicatorCount', width: 120, align: 'center' as const },
    { title: '已填报结果的指标数量（项）', dataIndex: 'filledCount', width: 180, align: 'center' as const },
    { title: '未填报结果的指标数量（项）', dataIndex: 'unfilledCount', width: 180, align: 'center' as const },
    { title: '预警指标数量（项）', dataIndex: 'warningCount', width: 140, align: 'center' as const },
  ];

  const [registerTable] = useTable({
    api: indicatorResultStatPage,
    columns: tableColumns,
    showTableSetting: true,
    useSearchForm: true,
    pagination: true,
    canResize: true,
  });

  /** 打开该体系的结果 show 页(RESTful:/…/indicator-result/{code}) */
  function handleDetail(record: Recordable) {
    go(`${props.routeBase}/${record.code}`);
  }
</script>
