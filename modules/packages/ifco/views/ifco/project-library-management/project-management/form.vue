<!--
  ifco —— 在库项目管理（查看 / 新增 / 编辑 一体表单抽屉）

  组件格式对齐 urban-health-check/shared/indicator-system/form.vue：
   - BasicDrawer + useDrawerInner + BasicForm（FormSchema）；
   - 查看/编辑一体：查看=表单 disabled（setProps），不使用 Description；
   - BasicDrawer 加 force-render 消除首次打开的懒挂载；抽屉级 showFooter 由
     list.vue 在打开前经 setDrawerProps 设置（硬性规则，动画中翻转会首击不弹）。

  顶部为项目生命周期块（不走表单 schema）：FormGroup 标题行（状态 Tag 紧随
  标题 gap-2）+ @jeesite/ui 的 Stepper（策划库→储备库→实施库 三段，已退出
  不是生命周期阶段，由状态 Tag 表达）。Stepper 兼作页签（v-model:active，
  切换的内容区暂未落地）：已退出默认落在退出时所处环节（整条无强调色，退出前
  已完成=灰勾、其余灰数字），在库默认当前阶段（仅当前阶段蓝色强调）。

  表单分区（FormGroup schema）：退出信息（仅已退出项目，置顶）→ 基本信息。
  当前后端尚未介入：保存仅做表单校验后关闭抽屉。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer" @ok="handleSubmit">
    <template #title> {{ getTitle }} </template>

    <!-- 项目生命周期：状态 Tag + Stepper（非表单 schema，块级排版） -->
    <FormGroup>
      <div class="flex items-start gap-2">
        项目生命周期
        <Tag :color="isExited ? 'default' : 'blue'" :variant="SOLID_STATUSES.includes(record.status) ? 'solid' : 'outlined'" style="border-radius: 10px">
          {{ record.status || '/' }}
        </Tag>
      </div>
    </FormGroup>
    <Stepper v-model:active="activeStage" :steps="stepItems" :tone="isExited ? 'gray' : 'blue'" class="mb-24px" />

    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoProjectLibraryManagementProjectManagementForm">
  import { computed, ref } from 'vue';
  import { Tag } from 'antdv-next';
  import { BasicForm, FormGroup, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import { Stepper } from '@jeesite/ui';
  import type { StepItem } from '@jeesite/ui';
  import {
    DISTRICTS,
    LIBRARY_LABELS,
    OWNERSHIPS,
    RENEWAL_TYPES,
    type LibraryKey,
    type ProjectLibraryItem,
  } from '@jeesite/ifco/api/ifco/project-library';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<ProjectLibraryItem & { isNewRecord?: boolean }>({} as ProjectLibraryItem);

  /** 终态实心（已提交=蓝、已退出=灰），待办描边蓝——与列表状态列同口径 */
  const SOLID_STATUSES = ['已提交', '已退出'];

  const getTitle = computed(() => {
    if (isView.value) return `查看 · ${record.value.name ?? ''}`;
    return record.value.isNewRecord ? '新增项目' : `编辑 · ${record.value.name ?? ''}`;
  });

  // ── 生命周期块：三段步骤条（兼页签） ────────────────────────────────
  const STAGE_ORDER: LibraryKey[] = ['planning', 'reserve', 'implementing'];

  const isExited = computed(() => record.value.library === 'exited');

  /** 当前所处的生命周期阶段（在库项目用；已退出/新增无当前阶段） */
  const currentStageIndex = computed(() => STAGE_ORDER.indexOf(record.value.library));

  /** 页签默认落点：已退出=退出时所处环节，在库=当前阶段，新增=策划库 */
  const activeStage = ref(
    isExited.value
      ? STAGE_ORDER.indexOf(record.value.exitedFrom ?? 'implementing')
      : Math.max(0, currentStageIndex.value),
  );

  const stepItems = computed<StepItem[]>(() => {
    // 已退出：如实表达走过的阶段——退出前已完成的环节打钩（finish 灰勾），
    // 退出时所处环节及未到的显示数字（wait），整条无强调色
    if (isExited.value) {
      const exitIndex = STAGE_ORDER.indexOf(record.value.exitedFrom ?? 'implementing');
      return STAGE_ORDER.map((key, index) => ({
        title: LIBRARY_LABELS[key],
        status: index < exitIndex ? ('finish' as const) : ('wait' as const),
      }));
    }
    // 在库/新增：仅当前所处阶段为强调色，已走过的常规完成态，未到的灰色
    return STAGE_ORDER.map((key, index) => ({
      title: LIBRARY_LABELS[key],
      status:
        index === currentStageIndex.value
          ? ('process' as const)
          : index < currentStageIndex.value
            ? ('finish' as const)
            : ('wait' as const),
    }));
  });

  // ── 表单 ────────────────────────────────────────────────────────────
  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));
  const renewalTypeOptions = RENEWAL_TYPES.map((name) => ({ label: name, value: name }));
  const ownershipOptions = OWNERSHIPS.map((name) => ({ label: name, value: name }));
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: Number(item.key),
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '退出信息',
      field: 'exitInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
      ifShow: () => isExited.value,
    },
    {
      label: '退出环节',
      field: 'exitedFromLabel',
      component: 'Input',
      ifShow: () => isExited.value,
    },
    {
      label: '退出时间',
      field: 'exitDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%' },
      ifShow: () => isExited.value,
    },
    {
      label: '退出原因',
      field: 'exitReason',
      component: 'InputTextArea',
      componentProps: { maxlength: 200, rows: 2 },
      colProps: { md: 24, lg: 24 },
      ifShow: () => isExited.value,
    },
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '项目编号',
      field: 'code',
      component: 'Input',
      componentProps: { maxlength: 50 },
    },
    {
      label: '项目名称',
      field: 'name',
      component: 'Input',
      componentProps: { maxlength: 100 },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '行政区',
      field: 'district',
      component: 'Select' as const,
      componentProps: { options: districtOptions, allowClear: true },
    },
    {
      label: '片区名称',
      field: 'areaName',
      component: 'Input',
      componentProps: { maxlength: 50 },
    },
    {
      label: '五改类别',
      field: 'renewalType',
      component: 'Select' as const,
      componentProps: { options: renewalTypeOptions, allowClear: true },
    },
    {
      label: '投资估算(亿元)',
      field: 'investEstimate',
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width: 100%' },
    },
    {
      label: '资金来源',
      field: 'fundSource',
      component: 'Input',
      componentProps: { maxlength: 100 },
    },
    {
      label: '项目归属',
      field: 'ownership',
      component: 'Select' as const,
      componentProps: { options: ownershipOptions, allowClear: true },
    },
    {
      label: '实施主体',
      field: 'implementOrg',
      component: 'Input',
      componentProps: { maxlength: 50 },
    },
    {
      label: '统筹主体',
      field: 'coordinateOrg',
      component: 'Input',
      componentProps: { maxlength: 50 },
    },
    {
      label: '入库年份',
      field: 'storeYear',
      component: 'Select' as const,
      componentProps: { options: yearOptions, allowClear: true },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 130,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as ProjectLibraryItem;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    // 页签默认落点随记录重算（同 activeStage 初始逻辑）
    activeStage.value = isExited.value
      ? STAGE_ORDER.indexOf(record.value.exitedFrom ?? 'implementing')
      : Math.max(0, currentStageIndex.value);
    await setFieldsValue({
      exitedFromLabel: record.value.exitedFrom ? LIBRARY_LABELS[record.value.exitedFrom] : '',
      exitDate: record.value.exitDate ?? '',
      exitReason: record.value.exitReason ?? '',
      code: record.value.code ?? '',
      name: record.value.name ?? '',
      district: record.value.district ?? '',
      areaName: record.value.areaName ?? '',
      renewalType: record.value.renewalType ?? '',
      investEstimate: record.value.investEstimate,
      fundSource: record.value.fundSource ?? '',
      ownership: record.value.ownership ?? '',
      implementOrg: record.value.implementOrg ?? '',
      coordinateOrg: record.value.coordinateOrg ?? '',
      storeYear: record.value.storeYear ?? dateUtil().year(),
    });
    // 查看模式只禁用表单（抽屉体内安全）；抽屉级 showFooter 已由 list.vue 打开前设置
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
    // TODO: 后端接入后在此调用保存接口（暂存/提交）
    setTimeout(closeDrawer);
    emit('success', data);
  }
</script>
