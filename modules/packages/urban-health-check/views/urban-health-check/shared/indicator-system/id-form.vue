<!--
  市住更局 —— 指标 新增/编辑/查看 表单抽屉

  组件格式对齐 indicator-system/form.vue:
   - BasicDrawer + useDrawerInner + BasicForm(FormSchema);
   - 查看模式:表单 disabled + 抽屉隐藏底部按钮。
  接口已接入：indicatorSave（systemCode 归属体系，后端解析）。
  指标单位/指标来源/数据来源 为后端表非空列，前端同步设为必填。
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
<script lang="ts" setup name="UhcSharedIndicatorSystemIdForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { Indicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import { indicatorSave } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';

  const emit = defineEmits(['success', 'register']);

  const props = defineProps({
    /** 所属体系已提交时整个表单只读（父级传入） */
    readOnly: { type: Boolean, default: false },
  });

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<Indicator & { isNewRecord?: boolean }>({} as Indicator & { isNewRecord?: boolean });

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看指标' : record.value.isNewRecord ? '新增指标' : '编辑指标',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '维度信息',
      field: 'dimInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '一级维度',
      field: 'dim1',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入一级维度' }],
    },
    {
      label: '二级维度',
      field: 'dim2',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入二级维度' }],
    },
    {
      label: '三级维度',
      field: 'dim3',
      component: 'Input',
      componentProps: { maxlength: 50 },
      helpMessage: '可空:指标直接挂二级维度时留空',
    },
    {
      label: '指标信息',
      field: 'indicatorInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '指标项名称',
      field: 'indicatorName',
      component: 'Input',
      componentProps: { maxlength: 100 },
      rules: [{ required: true, message: '请输入指标项名称' }],
    },
    {
      label: '指标单位',
      field: 'unit',
      component: 'Input',
      componentProps: { maxlength: 20 },
      rules: [{ required: true, message: '请输入指标单位' }],
    },
    {
      label: '指标来源',
      field: 'indicatorSource',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入指标来源' }],
    },
    {
      label: '数据来源',
      field: 'dataSource',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入数据来源' }],
    },
    {
      label: '责任部门',
      field: 'responsibleDept',
      component: 'Input',
      componentProps: { maxlength: 50 },
      helpMessage: '无责任部门时填 /',
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
    labelWidth: 120,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as Indicator;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    await setFieldsValue({
      dim1: record.value.dim1 ?? '',
      dim2: record.value.dim2 ?? '',
      dim3: record.value.dim3 ?? '',
      indicatorName: record.value.indicatorName ?? '',
      unit: record.value.unit ?? '',
      indicatorSource: record.value.indicatorSource ?? '',
      dataSource: record.value.dataSource ?? '',
      responsibleDept: record.value.responsibleDept ?? '',
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
    setDrawerProps({ loading: true });
    try {
      await indicatorSave({
        ...data,
        id: record.value.isNewRecord ? undefined : record.value.id,
        systemCode: record.value.systemCode,
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
