<!--
  市住更局 —— 三师信息管理（查看 / 新增 / 编辑 表单抽屉）

  组件格式对齐项目 BasicDrawer + useDrawerInner + BasicForm 模式：
   - force-render 预挂载（消除首次打开时表单未注册的竞态）；
   - 查看模式：list.vue 在 openDrawer 前预设 showFooter，本组件内只做表单级 disabled；
   - 回调 try/finally 兜底复位 loading。
  当前后端尚未介入：保存仅校验后 emit success（携带表单值与记录标识），由父级落内存副本。
-->
<template>
  <BasicDrawer ref="drawerRef" v-bind="$attrs" width="600px" force-render @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolInfoManagementForm">
  import { computed, ref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { EXPERT_FIELDS, EXPERT_ORG_TYPES, EXPERT_TITLES } from '../expert-store';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Recordable>({});

  const getTitle = computed(() => ({
    icon: 'ant-design:team-outlined',
    value: isView.value ? '查看专家' : record.value.isNewRecord ? '新增专家' : '修改专家',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '专家姓名',
      field: 'name',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入专家姓名' }],
    },
    {
      label: '性别',
      field: 'gender',
      component: 'Select',
      componentProps: {
        options: [
          { label: '男', value: '男' },
          { label: '女', value: '女' },
        ],
        placeholder: '请选择',
      },
      rules: [{ required: true, message: '请选择性别' }],
    },
    {
      label: '年龄',
      field: 'age',
      component: 'InputNumber',
      componentProps: { min: 25, max: 90, precision: 0, style: 'width: 100%' },
      rules: [{ required: true, message: '请输入年龄' }],
    },
    {
      label: '联系电话',
      field: 'phone',
      component: 'Input',
      componentProps: { maxlength: 20 },
      rules: [{ required: true, message: '请输入联系电话' }],
    },
    {
      label: '身份证号',
      field: 'idCard',
      component: 'Input',
      componentProps: { maxlength: 18 },
      rules: [{ required: true, message: '请输入身份证号' }],
    },
    {
      label: '专业领域',
      field: 'field',
      component: 'Select',
      componentProps: { options: EXPERT_FIELDS.map((f) => ({ label: f, value: f })), allowClear: true },
      rules: [{ required: true, message: '请选择专业领域' }],
    },
    {
      label: '职称',
      field: 'title',
      component: 'Select',
      componentProps: { options: EXPERT_TITLES.map((t) => ({ label: t, value: t })), allowClear: true },
      rules: [{ required: true, message: '请选择职称' }],
    },
    {
      label: '单位名称',
      field: 'org',
      component: 'Input',
      componentProps: { maxlength: 100 },
      rules: [{ required: true, message: '请输入单位名称' }],
    },
    {
      label: '单位性质',
      field: 'orgType',
      component: 'Select',
      componentProps: { options: EXPERT_ORG_TYPES.map((t) => ({ label: t, value: t })), allowClear: true },
      rules: [{ required: true, message: '请选择单位性质' }],
    },
    {
      label: '入库时间',
      field: 'joinDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%' },
    },
    {
      label: '是否已入选三师',
      field: 'selected',
      component: 'Select',
      componentProps: {
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        placeholder: '请选择',
      },
      rules: [{ required: true, message: '请选择是否已入选三师' }],
    },
    {
      label: '主要学习和工作经历',
      field: 'career',
      component: 'InputTextArea',
      componentProps: { maxlength: 2000, rows: 4, placeholder: '请输入' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入主要学习和工作经历' }],
    },
    {
      label: '过往评审经历',
      field: 'reviewExperience',
      component: 'InputTextArea',
      componentProps: { maxlength: 2000, rows: 4, placeholder: '请输入' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入过往评审经历' }],
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 110,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    // try/finally：任一 await 抛错也要复位 loading，否则遮罩盖住抽屉内容
    try {
      await resetFields();
      isView.value = !!data?.isView;
      record.value = (data || {}) as Recordable;
      record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
      await setFieldsValue({
        name: record.value.name ?? '',
        gender: record.value.gender ?? '男',
        age: record.value.age ?? 35,
        phone: record.value.phone ?? '',
        idCard: record.value.idCard ?? '',
        field: record.value.field ?? undefined,
        title: record.value.title ?? undefined,
        org: record.value.org ?? '',
        orgType: record.value.orgType ?? undefined,
        joinDate: record.value.joinDate ?? '',
        selected: record.value.selected ?? undefined,
        career: record.value.career ?? '',
        reviewExperience: record.value.reviewExperience ?? '',
      });
      // 查看模式：表单级禁用（showFooter 已由 list.vue 在 openDrawer 前预设）
      await setProps({ disabled: isView.value });
    } finally {
      setDrawerProps({ loading: false });
    }
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
    // TODO: 后端接入后在此调用保存接口
    // 本地演示：success 携带表单值 + 记录标识，父级更新内存副本
    emit('success', { ...data, id: record.value.id, isNewRecord: !!record.value.isNewRecord });
    setTimeout(closeDrawer);
  }
</script>
