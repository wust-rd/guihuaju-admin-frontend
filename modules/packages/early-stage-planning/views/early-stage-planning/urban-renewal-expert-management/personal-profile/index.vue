<!--
  市住更局 —— 城市更新专家管理 · 个人档案

  专家基础信息的增删改查：顶部三张统计卡 + BasicTable（姓名/单位名称/专业领域搜索表单）；
  新增/编辑走 Modal，查看跳二级详情页（_id/list，空间更大便于扩展）。
  数据来自本模块共享 store（urban-renewal-expert-management/expert-store），接口就绪后替换。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 统计卡 -->
    <div class="grid grid-cols-3 gap-16px">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="bg-white rd-8px b-1 b-solid b-gray-100 py-20px text-center shadow-sm"
      >
        <div class="flex items-baseline justify-center gap-4px">
          <span class="text-36px font-700 text-gray-900">{{ card.value }}</span>
          <span class="text-14px text-gray-500">{{ card.unit }}</span>
        </div>
        <div class="mt-4px text-14px text-gray-600">{{ card.label }}</div>
      </div>
    </div>

    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <span>专家档案</span>
      </template>
      <template #toolbar>
        <a-button type="primary" @click="openForm({ isNewRecord: true })">
          <span class="inline-flex items-center gap-4px"> <span class="i-fluent:add-12-filled"></span> 新增专家 </span>
        </a-button>
      </template>
    </BasicTable>

    <!-- 新增 / 编辑 Modal -->
    <Modal
      v-model:open="formModal.open"
      :title="formModal.isNewRecord ? '新增专家' : '编辑专家'"
      :width="620"
      centered
      ok-text="确定"
      cancel-text="取消"
      @ok="submitForm"
    >
      <div class="grid grid-cols-2 gap-x-16px gap-y-14px py-8px">
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">姓名</span>
          <Input v-model:value="formModal.form.name" placeholder="请输入姓名" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">性别</span>
          <Select v-model:value="formModal.form.gender" :options="GENDER_OPTIONS" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">年龄</span>
          <InputNumber v-model:value="formModal.form.age" :min="18" :max="80" class="w-full" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">联系电话</span>
          <Input v-model:value="formModal.form.phone" placeholder="请输入联系电话" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">专业领域</span>
          <Select v-model:value="formModal.form.field" :options="FIELD_OPTIONS" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">职称</span>
          <Select v-model:value="formModal.form.title" :options="TITLE_OPTIONS" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">单位名称</span>
          <Input v-model:value="formModal.form.org" placeholder="请输入单位名称" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">单位性质</span>
          <Select v-model:value="formModal.form.orgType" :options="ORGTYPE_OPTIONS" />
        </div>
        <div class="col-span-2 flex flex-col gap-4px">
          <span class="text-13px text-gray-600">主要经历</span>
          <Input.TextArea v-model:value="formModal.form.career" :rows="3" placeholder="请输入主要经历" />
        </div>
      </div>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProfileList">
  import { computed, reactive, toRaw } from 'vue';
  import { Input, InputNumber, Modal, Select } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useUserStore } from '@jeesite/core/store/modules/user';
  import type { UrbanExpert } from '../expert-store';
  import { URBAN_FIELDS, URBAN_ORG_TYPES, URBAN_TITLES, useUrbanExpertStore } from '../expert-store';

  const { showMessage } = useMessage();
  const go = useGo();
  const store = useUrbanExpertStore();

  // 调试：进入个人档案页时，在控制台输出当前登录用户信息
  const userStore = useUserStore();
  console.log('【当前登录用户信息】', toRaw(userStore.getUserInfo));
  console.log('【当前登录用户角色】', toRaw(userStore.getRoleList));
  console.log('【当前登录用户Token】', userStore.getToken);

  const FIELD_OPTIONS = URBAN_FIELDS.map((f) => ({ label: f, value: f }));
  const TITLE_OPTIONS = URBAN_TITLES.map((t) => ({ label: t, value: t }));
  const ORGTYPE_OPTIONS = URBAN_ORG_TYPES.map((o) => ({ label: o, value: o }));
  const GENDER_OPTIONS = [
    { label: '男', value: '男' },
    { label: '女', value: '女' },
  ];

  /** 统计卡：入库专家总数 / 正高级工程师 / 专业领域数量 */
  const statCards = computed(() => [
    { label: '入库专家总数', value: store.urbanStats.total, unit: '人' },
    { label: '正高级工程师', value: store.urbanStats.senior, unit: '人' },
    { label: '专业领域数量', value: new Set(store.experts.map((e) => e.field)).size, unit: '个' },
  ]);

  /** 表格列 */
  const columns: BasicColumn[] = [
    { title: '姓名', dataIndex: 'name', width: 90 },
    { title: '性别', dataIndex: 'gender', width: 60 },
    { title: '年龄', dataIndex: 'age', width: 60 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '专业领域', dataIndex: 'field', width: 100 },
    { title: '职称', dataIndex: 'title', width: 120 },
    { title: '单位名称', dataIndex: 'org', width: 180, ellipsis: true },
    { title: '单位性质', dataIndex: 'orgType', width: 90 },
    { title: '入库时间', dataIndex: 'joinDate', width: 110 },
  ];

  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => go(`/early-stage-planning/urban-renewal-expert-management/personal-profile/${record.code}`),
      },
      { label: '修改', onClick: () => openForm({ ...record }) },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该专家？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const searchKeyword = reactive<{ name?: string; org?: string; field?: string }>({});

  const [registerTable, { setTableData }] = useTable({
    dataSource: store.experts,
    columns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: { pageSize: 10 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 90,
      schemas: [
        {
          label: '姓名',
          field: 'name',
          component: 'Input',
          componentProps: { allowClear: true, placeholder: '请输入' },
        },
        {
          label: '单位名称',
          field: 'org',
          component: 'Input',
          componentProps: { allowClear: true, placeholder: '请输入' },
        },
        {
          label: '专业领域',
          field: 'field',
          component: 'Select',
          componentProps: { options: FIELD_OPTIONS, allowClear: true, placeholder: '请选择' },
        },
      ],
    },
    handleSearchInfoFn: (params: Recordable) => {
      Object.assign(searchKeyword, params);
      setTableData(store.queryExperts(params));
      return params;
    },
  });

  /** 表单 Modal 状态 */
  const formModal = reactive({
    open: false,
    isNewRecord: false,
    form: {} as Partial<UrbanExpert>,
  });

  /** 打开新增/编辑 */
  function openForm(record: Recordable) {
    formModal.isNewRecord = !!record.isNewRecord;
    formModal.form = { ...(record.isNewRecord ? ({} as Partial<UrbanExpert>) : record) };
    formModal.open = true;
  }

  /** 提交表单（code/入库时间由 store 在新增时自动生成） */
  function submitForm() {
    const f = formModal.form;
    if (!f.name) {
      showMessage('请输入姓名');
      return;
    }
    if (formModal.isNewRecord) {
      store.addExpert(f);
      showMessage('新增成功（本地演示，未持久化）');
    } else {
      store.updateExpert(f.id!, f);
      showMessage('保存成功（本地演示，未持久化）');
    }
    formModal.open = false;
    setTableData(store.queryExperts(searchKeyword));
  }

  /** 删除 */
  function handleDelete(record: Recordable) {
    store.removeExpert(record.id);
    setTableData(store.queryExperts(searchKeyword));
    showMessage('删除成功（本地演示，未持久化）');
  }
</script>
