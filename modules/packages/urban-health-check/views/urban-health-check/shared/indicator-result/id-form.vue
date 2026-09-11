<!--
  市住更局 —— 指标项结果 新增/编辑/查看 表单抽屉

  组件格式对齐 indicator-system/form.vue；接口已接入 indicatorResultSave。
  结果填报口径（US-4.3）：仅维护 指标值 / 标准值目标值 / 评估结果；
  维度与指标定义列为指标项快照（只读）；预警状态由后端按评估结果自动计算（只读展示）。
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
<script lang="ts" setup name="UhcSharedIndicatorResultIdForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { Indicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import { EVAL_RESULT, WARNING_STATUS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import { indicatorResultSave } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';

  const EVAL_RESULT_OPTIONS = Object.values(EVAL_RESULT).map((item) => ({ label: item, value: item }));
  const WARNING_STATUS_OPTIONS = Object.values(WARNING_STATUS).map((item) => ({ label: item, value: item }));

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<Indicator & { isNewRecord?: boolean }>({} as Indicator & { isNewRecord?: boolean });

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看指标结果' : record.value.isNewRecord ? '新增指标结果' : '编辑指标结果',
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
      dynamicDisabled: true,
    },
    {
      label: '二级维度',
      field: 'dim2',
      component: 'Input',
      dynamicDisabled: true,
    },
    {
      label: '三级维度',
      field: 'dim3',
      component: 'Input',
      dynamicDisabled: true,
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
      dynamicDisabled: true,
    },
    {
      label: '单位',
      field: 'unit',
      component: 'Input',
      dynamicDisabled: true,
    },
    {
      label: '指标值',
      field: 'indicatorValue',
      component: 'InputNumber',
      componentProps: { style: 'width: 100%' },
    },
    {
      label: '标准值/目标值',
      field: 'standardValue',
      component: 'InputNumber',
      componentProps: { style: 'width: 100%' },
      helpMessage: '无标准的指标可留空',
    },
    {
      label: '评估结果',
      field: 'evalResult',
      component: 'Select',
      componentProps: { options: EVAL_RESULT_OPTIONS, allowClear: true },
      helpMessage: '无标准的指标评估为「无标准」',
    },
    {
      label: '预警状态',
      field: 'warningStatus',
      component: 'Select',
      componentProps: { options: WARNING_STATUS_OPTIONS, allowClear: true },
      dynamicDisabled: true,
      helpMessage: '保存时按评估结果自动计算：较差→红色预警；一般/无标准→黄色预警；很好/较好→正常',
    },
    {
      label: '指标来源',
      field: 'indicatorSource',
      component: 'Input',
      dynamicDisabled: true,
    },
    {
      label: '数据来源',
      field: 'dataSource',
      component: 'Input',
      dynamicDisabled: true,
    },
    {
      label: '责任部门',
      field: 'responsibleDept',
      component: 'Input',
      dynamicDisabled: true,
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
      indicatorValue: record.value.indicatorValue,
      standardValue: record.value.standardValue,
      evalResult: record.value.evalResult ?? '',
      warningStatus: record.value.warningStatus ?? '',
      indicatorSource: record.value.indicatorSource ?? '',
      dataSource: record.value.dataSource ?? '',
      responsibleDept: record.value.responsibleDept ?? '',
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
      const { warningStatus } = await indicatorResultSave({
        id: record.value.id,
        indicatorValue: data.indicatorValue,
        standardValue: data.standardValue,
        evalResult: data.evalResult,
        remarks: data.remarks,
      });
      showMessage(`保存成功${warningStatus ? `（预警状态：${warningStatus}）` : ''}`);
      setTimeout(closeDrawer);
      emit('success', data);
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
