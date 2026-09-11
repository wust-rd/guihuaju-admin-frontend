<!--
  市住更局 —— 一级维度图层信息 新增/编辑 表单抽屉（dim-table 子组件）

  接口已接入：dimensionSave（{id?, setCode, dimName, layerCount, layerArea}）。
  新增时 dimName 可填（补充体系未覆盖的维度）；编辑时 dimName 只读仅维护图层两项。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="500px" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultDimForm">
  import { computed, ref, unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { dimensionSave } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const record = ref<Recordable>({});

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: record.value.isNewRecord ? '新增一级维度' : '编辑一级维度',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '一级维度名称',
      field: 'dimName',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入一级维度名称' }],
      dynamicDisabled: () => !record.value.isNewRecord,
      helpMessage: '维度行由系统按体系指标项自动同步；此处可手工补充未覆盖的维度',
    },
    {
      label: '图层对象数量',
      field: 'layerCount',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 0, style: 'width: 100%' },
    },
    {
      label: '图层覆盖面积（km²）',
      field: 'layerArea',
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width: 100%' },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate }] = useForm({
    labelWidth: 160,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 24 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    record.value = { ...(data || {}) };
    record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
    await setFieldsValue({
      dimName: record.value.dimName ?? '',
      layerCount: record.value.layerCount,
      layerArea: record.value.layerArea,
    });
    setDrawerProps({ loading: false });
  });

  async function handleSubmit() {
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
      await dimensionSave({
        ...data,
        id: record.value.isNewRecord ? undefined : record.value.id,
        setCode: record.value.setCode,
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
