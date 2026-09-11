<!--
  市住更局 —— 满意度调查 新增/编辑/查看 表单抽屉

  组件格式对齐 indicator-result/form.vue；接口已接入 surveySave（/cityCheck/survey/save）。
  调查年份每年一次唯一（后端校验）；综合满意度在"提交发布"时按问题五档加权自动计算，表单只读展示。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanSatisfactionSurveyForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { SatisfactionSurvey } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import { surveySave } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import { YEAR_OPTIONS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<SatisfactionSurvey & { isNewRecord?: boolean }>(
    {} as SatisfactionSurvey & { isNewRecord?: boolean },
  );

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看满意度调查' : record.value.isNewRecord ? '新增满意度调查' : '编辑满意度调查',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '调查年份',
      field: 'year',
      component: 'Select',
      componentProps: { options: YEAR_OPTIONS, allowClear: true },
      rules: [{ type: 'string', required: true, message: '请选择调查年份' }],
      helpMessage: '每年一次，不可重复创建',
    },
    {
      label: '填报时间',
      field: 'reportDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%' },
      rules: [{ type: 'string', required: true, message: '请选择填报时间' }],
    },
    {
      label: '数据来源',
      field: 'dataSource',
      component: 'Input',
      componentProps: { maxlength: 50 },
    },
    {
      label: '调查问题数量（项）',
      field: 'questionCount',
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width: 100%' },
      rules: [{ required: true, message: '请输入调查问题数量' }],
      helpMessage: '提交时按问题明细自动同步',
    },
    {
      label: '有效调查问卷数（份）',
      field: 'validQuestionnaireCount',
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width: 100%' },
    },
    {
      label: '综合满意度（%）',
      field: 'overallSatisfaction',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, style: 'width: 100%' },
      dynamicDisabled: true,
      helpMessage: '提交发布时按问题五档满意度加权自动计算，不可手工修改',
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, rows: 3 },
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 160,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as SatisfactionSurvey;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    await setFieldsValue({
      year: record.value.year ?? YEAR_OPTIONS[0].value,
      reportDate: record.value.reportDate ?? '',
      dataSource: record.value.dataSource ?? '',
      questionCount: record.value.questionCount ?? 0,
      validQuestionnaireCount: record.value.validQuestionnaireCount ?? 0,
      overallSatisfaction: record.value.overallSatisfaction ?? 0,
      remarks: record.value.remarks ?? '',
    });
    await setProps({ disabled: isView.value });
    setDrawerProps({ loading: false });
  });

  async function handleSubmit() {
    if (isView.value) {
      closeDrawer();
      return;
    }
    let data: any;
    try {
      data = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    setDrawerProps({ loading: true });
    try {
      await surveySave({
        ...data,
        id: record.value.isNewRecord ? undefined : record.value.id,
      });
      showMessage('保存成功');
      setTimeout(closeDrawer);
      emit('success', data);
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
