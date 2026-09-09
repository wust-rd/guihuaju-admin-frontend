<!--
  ifco —— 在库项目管理（/ifco/project-library-management/project-management/list）

  项目库管理 · 四库在库项目查询。策划库→储备库→实施库为项目三段生命周期，
  项目可随时退出，退出的项目归集为已退出（状态显示「已退出」，只能查看）。
  结构对齐设计稿：
  顶部四张统计卡（策划库/储备库/实施库/已退出，卡即单选 select——默认选中
  策划库，点选切换筛选表格，URL 无 ?library= 参数时按策划库过滤）+
  BasicTable（项目名称/行政区/五改类型/入库年份/
  最新项目状态/项目归属 搜索表单；配置统筹主体/实施主体、新增项目、一键提交、
  下载模板、一键导入、一键导出 工具栏；操作列按钮随项目状态变化）。

  路由参数（与列表页 URL 绑定，可分享/收藏/前进后退）：
  - ?library= 四库点选，单选、默认策划库（planning/reserve/implementing/exited，
    无参数时同样按策划库过滤）；
  - ?district= 行政区（搜索表单提交/重置时同步进 URL，进入页面时回填表单）。

  查看/编辑/新增走一体表单抽屉 form.vue（查看=表单禁用，对齐
  urban-health-check/shared/indicator-system 范式；顶部含生命周期步骤条）；
  流转类操作（申请转储备/申请退出/一键提交等）与导入导出仍为占位待接入。
  当前后端尚未介入：数据来自 @jeesite/ifco/api/ifco/project-library（内存假数据，
  统计卡数字与表格前 5 行照设计稿抄录，其余确定性生成共 50 条；刷新即恢复）。

  菜单注册（菜单名称「在库项目管理」）：
   - 链接地址：/ifco/project-library-management/project-management/list
   - 组件位置：/ifco/project-library-management/project-management/list（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 四库统计卡：单选 select（路由参数 ?library=），默认选中策划库，点选切换 -->
    <div class="grid grid-cols-1 gap-16px md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in LIBRARY_CARDS"
        :key="card.key"
        class="cursor-pointer bg-white rd-8px b-1 b-solid px-20px py-16px shadow-sm transition-colors"
        :class="selectedLibrary === card.key ? 'b-#1677ff bg-#f0f7ff' : 'b-gray-100 hover:b-gray-300'"
        @click="handleCardClick(card.key)"
      >
        <div class="flex items-center justify-between">
          <span class="text-15px font-600" :class="selectedLibrary === card.key ? 'text-#1677ff' : 'text-gray-900'">
            {{ card.label }}
          </span>
          <span
            v-if="selectedLibrary === card.key"
            class="i-ant-design:check-circle-filled text-16px text-#1677ff"
          ></span>
        </div>
        <div class="mt-4px text-12px text-gray-400">{{ card.description }}</div>
        <div class="mt-10px flex flex-wrap items-baseline gap-x-24px">
          <span class="text-13px text-gray-500">
            项目数 <span class="text-22px font-700 text-gray-900">{{ card.count }}</span> 项
          </span>
          <span v-if="card.invest !== undefined" class="text-13px text-gray-500">
            总投资 <span class="text-22px font-700 text-gray-900">{{ card.invest.toFixed(2) }}</span> 亿元
          </span>
        </div>
      </div>
    </div>

    <!-- 列表：搜索表单 + 工具栏 + 表格 -->
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="handleTodo('配置统筹主体/实施主体')"> 配置统筹主体/实施主体 </a-button>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
        <a-button @click="handleTodo('一键提交')"> 一键提交 </a-button>
        <a-button @click="handleTodo('下载模板')"> 下载模板 </a-button>
        <a-button @click="handleTodo('一键导入')"> 一键导入 </a-button>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #areaName="{ record }">{{ withSlash(record.areaName) }}</template>
      <template #fundSource="{ record }">{{ withSlash(record.fundSource) }}</template>
      <template #implementOrg="{ record }">{{ withSlash(record.implementOrg) }}</template>
      <template #coordinateOrg="{ record }">{{ withSlash(record.coordinateOrg) }}</template>
      <template #status="{ record }">
        <Tag
          :color="record.status === '已退出' ? 'default' : 'blue'"
          :variant="SOLID_STATUSES.includes(record.status) ? 'solid' : 'outlined'"
          style="border-radius: 10px"
        >
          {{ record.status }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看/新增/编辑一体表单抽屉 -->
    <ProjectForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoProjectLibraryManagementProjectManagementList">
  import { computed, onMounted, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { Icon } from '@jeesite/core/components/Icon';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import {
    ACTIONS_BY_STATUS,
    DISTRICTS,
    LIBRARY_CARDS,
    OWNERSHIPS,
    RENEWAL_TYPES,
    STATUS_OPTIONS,
    filterProjects,
    type LibraryKey,
  } from '@jeesite/ifco/api/ifco/project-library';
  import ProjectForm from './form.vue';

  const { showMessage } = useMessage();
  const route = useRoute();
  const router = useRouter();

  /** 终态用实心（已提交=实心蓝，已退出=实心灰），待办态用描边蓝 */
  const SOLID_STATUSES = ['已提交', '已退出'];

  // ── 路由参数：library(四库点选) + district(行政区) ───────────────────
  /** 默认选中策划库（URL 无 ?library= 参数时同样按策划库过滤） */
  const DEFAULT_LIBRARY: LibraryKey = 'planning';

  /** 从 URL 读查询条件（进入页面时的初始过滤与表单回填来源） */
  function urlParams() {
    const library = route.query.library;
    const district = route.query.district;
    return {
      library: LIBRARY_CARDS.some((card) => card.key === library) ? (library as LibraryKey) : DEFAULT_LIBRARY,
      district: typeof district === 'string' && district ? district : undefined,
    };
  }

  const selectedLibrary = computed(() => urlParams().library);

  /** 统计卡点选（单选）：只改 URL，过滤由 route.query 的 watcher 统一触发 */
  function handleCardClick(key: LibraryKey) {
    if (selectedLibrary.value === key) return;
    const query: Record<string, string> = {};
    for (const [name, value] of Object.entries(route.query)) {
      if (typeof value === 'string' && value) query[name] = value;
    }
    query.library = key;
    router.replace({ query });
  }

  // ── 表格 ────────────────────────────────────────────────────────────
  /** 项目编号/项目名称固定左侧（与复选框列同翼），最新项目状态固定右侧（与操作列同翼） */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'code', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'name', width: 240, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'areaName', width: 100, slot: 'areaName' },
    { title: '五改类别', dataIndex: 'renewalType', width: 110 },
    { title: '投资估算(亿元)', dataIndex: 'investEstimate', width: 120, align: 'right' },
    { title: '资金来源', dataIndex: 'fundSource', width: 180, slot: 'fundSource' },
    { title: '项目归属', dataIndex: 'ownership', width: 130 },
    { title: '实施主体', dataIndex: 'implementOrg', width: 140, slot: 'implementOrg' },
    { title: '统筹主体', dataIndex: 'coordinateOrg', width: 140, slot: 'coordinateOrg' },
    { title: '最新项目状态', dataIndex: 'status', width: 120, fixed: 'right', slot: 'status' },
  ];

  /** 操作列：按钮随项目状态变化（查看/编辑走一体表单抽屉，流转操作待接入） */
  const actionColumn: BasicColumn = {
    width: 210,
    actions: (record: Recordable) =>
      (ACTIONS_BY_STATUS[record.status] ?? ['查看']).map((label: string) => ({
        label,
        onClick: () => handleAction(label, record),
      })),
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  /** 打开表单抽屉：查看/编辑一体（查看=表单禁用）；打开前按查看与否预设
   *  showFooter（硬性规则：打开动画期间翻转会导致首次点击不弹） */
  function handleForm(record: Recordable) {
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 查看走只读表单；流转类操作（申请转储备/申请退出等）随后续接入 */
  function handleAction(label: string, record: Recordable) {
    if (label === '查看') {
      handleForm({ ...record, isView: true });
      return;
    }
    if (label === '编辑') {
      handleForm({ ...record });
      return;
    }
    handleTodo(label);
  }

  /** 表单保存回调（TODO: 后端接入后更新本地数据） */
  function handleSuccess(_data: Recordable) {
    showMessage('保存成功（本地演示，未持久化）');
  }

  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));
  const renewalTypeOptions = RENEWAL_TYPES.map((name) => ({ label: name, value: name }));
  const statusOptions = STATUS_OPTIONS.map((name) => ({ label: name, value: name }));
  const ownershipOptions = OWNERSHIPS.map((name) => ({ label: name, value: name }));
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: Number(item.key),
  }));

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: filterProjects(urlParams()),
    columns,
    actionColumn,
    rowSelection: { type: 'checkbox' },
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    pagination: { pageSize: 8 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 110,
      schemas: [
        { label: '项目名称', field: 'name', component: 'Input' },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: districtOptions, allowClear: true },
        },
        {
          label: '五改类型',
          field: 'renewalType',
          component: 'Select',
          componentProps: { options: renewalTypeOptions, allowClear: true },
        },
        {
          label: '入库年份',
          field: 'storeYear',
          component: 'Select',
          componentProps: { options: yearOptions, allowClear: true },
        },
        {
          label: '最新项目状态',
          field: 'status',
          component: 'Select',
          componentProps: { options: statusOptions, allowClear: true },
        },
        {
          label: '项目归属',
          field: 'ownership',
          component: 'Select',
          componentProps: { options: ownershipOptions, allowClear: true },
        },
      ],
    },
    // 无后端：查询/重置走本地过滤；行政区是路由参数，提交时同步进 URL
    handleSearchInfoFn: (params: Recordable) => {
      const query: Record<string, string> = {};
      for (const [name, value] of Object.entries(route.query)) {
        if (typeof value === 'string' && value && name !== 'district') query[name] = value;
      }
      if (params.district) query.district = String(params.district);
      router.replace({ query });
      applyFilter(params);
      return params;
    },
  });

  /** 按当前条件重铺表格数据（库来自 URL，其余来自搜索表单） */
  function applyFilter(formValues?: Recordable) {
    const values = formValues ?? getForm().getFieldsValue();
    setTableData(filterProjects({ ...values, library: selectedLibrary.value }));
  }

  /** 前进/后退或统计卡点选：URL 参数变化 → 回填表单并重铺数据 */
  watch(
    () => [route.query.library, route.query.district],
    () => {
      const district = route.query.district;
      if (typeof district === 'string' && district && getForm().getFieldsValue().district !== district) {
        getForm().setFieldsValue({ district });
      }
      applyFilter();
    },
  );

  /** 进入页面：URL 带了行政区时回填搜索表单（数据已按 URL 过滤） */
  onMounted(() => {
    const { district } = urlParams();
    if (district) getForm().setFieldsValue({ district });
  });

  /** 空值显示 / */
  function withSlash(value: string | undefined) {
    return value ? value : '/';
  }

  /** 占位操作（TODO：随抽屉/后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
