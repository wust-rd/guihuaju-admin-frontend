<!--
  市住更局 —— 满意度调查（列表页）

  菜单注册（菜单名称「满意度调查」）:
   - 链接地址:/urban-health-check/urban/satisfaction-survey/list
   - 组件位置:/urban-health-check/urban/satisfaction-survey/list(与链接地址一致)
   - 是否可见:显示
  接口已接入：surveyPage / surveyDelete（/cityCheck/survey）。
  已提交的调查只读（编辑/删除锁定）；数据来源列点入问题明细 show 页。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #toolbar>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>
      <template #dataSource="{ record }">
        <a @click="handleDetail(record)" :title="record.dataSource">
          {{ record.dataSource }}
        </a>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanSatisfactionSurveyList">
  import { unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { SatisfactionSurvey } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import {
    SUBMIT_STATUS,
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import {
    surveyDelete,
    surveyPage,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import InputForm from './form.vue';

  const { meta } = unref(router.currentRoute);
  const go = useGo();
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '满意度调查',
  };

  /** 搜索表单 */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      {
        label: '调查年份',
        field: 'year',
        component: 'Select',
        componentProps: { options: YEAR_OPTIONS, allowClear: true },
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'code', width: 70, align: 'center' },
    { title: '调查年份', dataIndex: 'year', width: 110 },
    { title: '填报时间', dataIndex: 'reportDate', width: 120, align: 'center' },
    { title: '数据来源', dataIndex: 'dataSource', width: 150, slot: 'dataSource' },
    { title: '调查问题数量（项）', dataIndex: 'questionCount', width: 150, align: 'center' },
    { title: '有效调查问卷数（份）', dataIndex: 'validQuestionnaireCount', width: 160, align: 'center' },
    { title: '综合满意度（%）', dataIndex: 'overallSatisfaction', width: 140, align: 'center' },
  ];

  /** 操作列（已提交只读） */
  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
      },
      {
        label: '编辑',
        onClick: () => handleForm({ ...record, isNewRecord: false }),
        ifShow: () => record.submitStatus === SUBMIT_STATUS.PENDING,
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该记录？', confirm: () => handleDelete(record) },
        ifShow: () => record.submitStatus === SUBMIT_STATUS.PENDING,
      },
    ],
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable, { reload }] = useTable({
    api: surveyPage,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    // 打开前先按查看/编辑设好 showFooter(抽屉级);打开动画期间翻转会导致首次不弹(见对应 form.vue 头注释)
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 打开该年调查的 show 页(RESTful:/…/satisfaction-survey/{code},code=调查序号) */
  function handleDetail(record: Recordable) {
    go(`/urban-health-check/urban/satisfaction-survey/${record.code}`);
  }

  /** 删除 */
  async function handleDelete(record: SatisfactionSurvey) {
    try {
      await surveyDelete([record.id!]);
      showMessage('删除成功');
      reload();
    } catch (e: any) {
      showMessage(e?.message || '删除失败', 'error');
    }
  }

  /** 表单保存成功回调：刷新列表 */
  function handleSuccess() {
    reload();
  }
</script>
