<!--
  市住更局 —— 满意度调查问题 新增/编辑/查看 表单抽屉

  组件格式对齐 indicator-system/_id/form.vue。
  问题行为"整单提交"：本表单不做接口调用，校验通过后把表单值回传父级
  （emit('success', row, values)），由父级维护完整问题列表后整单 saveList。
  五档占比任一档填写即要求合计 100（提交时前端校验，与后端口径一致）。
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
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanSatisfactionSurveyIdForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { SurveyQuestion } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';

  const emit = defineEmits(['success', 'register']);

  const props = defineProps({
    /** 所属调查已提交时整个表单只读（父级传入） */
    readOnly: { type: Boolean, default: false },
  });

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<SurveyQuestion & { isNewRecord?: boolean }>({} as SurveyQuestion & { isNewRecord?: boolean });

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看调查问题' : record.value.isNewRecord ? '新增调查问题' : '编辑调查问题',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '调查问题',
      field: 'questionName',
      component: 'Input',
      componentProps: { maxlength: 200 },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入调查问题' }],
    },
    {
      label: '面向对象',
      field: 'target',
      component: 'Input',
      componentProps: { maxlength: 50 },
      helpMessage: '如：全体居民 / 社区居民 / 企业经营者',
    },
    {
      label: '满意度占比',
      field: 'rateInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '非常满意(%)',
      field: 'verySatisfied',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, style: 'width: 100%' },
    },
    {
      label: '满意(%)',
      field: 'satisfied',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, style: 'width: 100%' },
    },
    {
      label: '一般(%)',
      field: 'neutral',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, style: 'width: 100%' },
    },
    {
      label: '不满意(%)',
      field: 'dissatisfied',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, style: 'width: 100%' },
    },
    {
      label: '非常不满意(%)',
      field: 'veryDissatisfied',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, style: 'width: 100%' },
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
    labelWidth: 140,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as SurveyQuestion;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    await setFieldsValue({
      questionName: record.value.questionName ?? '',
      target: record.value.target ?? '',
      verySatisfied: record.value.verySatisfied,
      satisfied: record.value.satisfied,
      neutral: record.value.neutral,
      dissatisfied: record.value.dissatisfied,
      veryDissatisfied: record.value.veryDissatisfied,
      remarks: record.value.remarks ?? '',
    });
    await setProps({ disabled: isView.value || props.readOnly });
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
    // 五档占比任一档有值时合计须为 100（与后端校验口径一致）
    const rates = ['verySatisfied', 'satisfied', 'neutral', 'dissatisfied', 'veryDissatisfied'].map(
      (key) => Number(data[key] ?? 0),
    );
    if (rates.some((rate) => rate > 0)) {
      const sum = Math.round(rates.reduce((acc, cur) => acc + cur, 0) * 100) / 100;
      if (Math.abs(sum - 100) > 0.01) {
        showMessage(`五档满意度占比合计须为 100（当前 ${sum}）`);
        return;
      }
    }
    setTimeout(closeDrawer);
    // 不直接调接口：回传父级由整单 saveList 提交
    emit('success', record.value, data);
  }
</script>
