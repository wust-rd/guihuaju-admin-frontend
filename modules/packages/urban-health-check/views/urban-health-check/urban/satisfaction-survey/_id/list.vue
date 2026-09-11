<!--
  市住更局 —— 满意度调查 show 页(某年调查的问题明细)

  规划路由(RESTful,后端隐藏菜单,已注册):
   - 链接地址:/urban-health-check/urban/satisfaction-survey/{id}(show 页;与 /list 静态段不冲突)
   - 组件位置:/urban-health-check/urban/satisfaction-survey/_id/list(与链接地址不一致,菜单里已显式填写)
   - 是否可见:隐藏;上级菜单挂「满意度调查」以点亮侧边栏
  接口已接入：surveyInfo（{id}=code 反查）+ surveyQuestionSaveList（整单替换）+ surveySubmit。
  页面结构:Card(年份+统计信息+提交发布) → BasicTable(调查问题明细)。
  问题维护为"整单提交"：编辑/删除单个问题 = 维护本地列表后整单 saveList；
  已提交的调查整页只读。
-->
<template>
  <PageWrapper>
    <Card class="mb-3" :title="`${survey?.year ?? surveyId} 年满意度调查`">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-gray-500">填报时间:{{ survey?.reportDate ?? '-' }}</span>
          <span class="ml-6">数据来源:{{ survey?.dataSource ?? '-' }}</span>
          <span class="ml-6">调查问题数量:{{ survey?.questionCount ?? 0 }} 项</span>
          <span class="ml-6">有效调查问卷数:{{ survey?.validQuestionnaireCount ?? 0 }} 份</span>
          <span class="ml-6">
            综合满意度:<span class="text-lg font-medium" style="color: var(--ant-color-success)">
              {{ survey?.overallSatisfaction ?? 0 }}%
            </span>
          </span>
        </div>
        <a-button
          v-if="survey?.submitStatus === SUBMIT_STATUS.PENDING"
          type="primary"
          :loading="submitting"
          @click="handleSubmitPublish"
        >
          提交发布
        </a-button>
        <Tag v-else color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
      </div>
    </Card>
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #toolbar>
        <a-button v-if="!readOnly" type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleForm({ ...record, isNewRecord: false, isView: true })" :title="record.questionName">
          {{ record.questionName }}
        </a>
      </template>
    </BasicTable>

    <InputForm :read-only="readOnly" @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanSatisfactionSurveyIdList">
  import { computed, onMounted, ref, unref } from 'vue';
  import { Card, Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import type {
    SatisfactionSurvey,
    SurveyQuestion,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import {
    surveyInfo,
    surveyQuestionSaveList,
    surveySubmit,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import { SUBMIT_STATUS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import InputForm from './form.vue';

  const { meta, params } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '调查问题明细',
  };

  // 兼容菜单链接地址占位符写 {id} 或 {code}:路由参数名与占位符一致
  const surveyId = ((params.id ?? params.code) as string) || '';

  const { showMessage } = useMessage();

  /** 调查信息与问题明细（按 code 反查接口） */
  const survey = ref<SatisfactionSurvey | undefined>();
  const surveyRowId = ref('');
  const questions = ref<SurveyQuestion[]>([]);

  /** 已提交调查整页只读 */
  const readOnly = computed(() => survey.value?.submitStatus === SUBMIT_STATUS.SUBMITTED);

  /** 页签标题默认取菜单名,这里改为「XXXX 年满意度调查」 */
  const { setTitle } = useTabs(router);
  onMounted(load);

  async function load() {
    try {
      const info = await surveyInfo(surveyId);
      survey.value = info;
      surveyRowId.value = info.id ?? '';
      questions.value = info.questionList ?? [];
      if (info.dataSource) {
        setTitle(`满意度调查-${info.year}年（${info.dataSource}）`);
      }
    } catch (e: any) {
      showMessage(e?.message || '加载调查信息失败', 'error');
    }
  }

  /** 搜索表单 */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      {
        label: '调查问题',
        field: 'questionName',
        component: 'Input',
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'code', width: 70, align: 'center' },
    { title: '调查问题', dataIndex: 'questionName', slot: 'firstColumn', width: 320 },
    { title: '面向对象', dataIndex: 'target', width: 110, align: 'center' },
    { title: '非常满意(%)', dataIndex: 'verySatisfied', width: 110, align: 'center' },
    { title: '满意(%)', dataIndex: 'satisfied', width: 100, align: 'center' },
    { title: '一般(%)', dataIndex: 'neutral', width: 100, align: 'center' },
    { title: '不满意(%)', dataIndex: 'dissatisfied', width: 110, align: 'center' },
    { title: '非常不满意(%)', dataIndex: 'veryDissatisfied', width: 120, align: 'center' },
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
        ifShow: () => !readOnly.value,
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该问题？', confirm: () => handleDelete(record) },
        ifShow: () => !readOnly.value,
      },
    ],
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable] = useTable({
    dataSource: questions,
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
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 表单保存回调：新增/编辑一行后整单提交（index 由子组件回传定位） */
  async function handleSuccess(row: any, formValues: any) {
    const items = questions.value.map((item) => ({ ...item }));
    if (row.isNewRecord) {
      items.push({ ...formValues });
    } else {
      const idx = items.findIndex((item) => item.id === row.id || item.code === row.code);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...formValues };
      }
    }
    await saveQuestions(items);
  }

  /** 删除一行后整单提交 */
  async function handleDelete(record: Recordable) {
    const items = questions.value.filter((item) => item.id !== record.id);
    await saveQuestions(items);
  }

  /** 整单保存问题并回读 */
  async function saveQuestions(items: Partial<SurveyQuestion>[]) {
    try {
      await surveyQuestionSaveList(surveyRowId.value, items);
      showMessage('保存成功');
      await load();
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    }
  }

  /** 提交发布:按五档加权自动计算综合满意度写回，提交后只读 */
  const submitting = ref(false);
  async function handleSubmitPublish() {
    submitting.value = true;
    try {
      const { overallSatisfaction } = await surveySubmit(surveyRowId.value);
      showMessage(`提交发布成功（综合满意度 ${overallSatisfaction}%）`);
      await load();
    } catch (e: any) {
      showMessage(e?.message || '提交失败', 'error');
    } finally {
      submitting.value = false;
    }
  }
</script>
