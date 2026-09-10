<!--
  市住更局 —— 城市更新专家管理 · 项目评估

  项目评估列表（对齐设计稿）：顶部搜索表单（项目名称/片区名称/评审模式）+ 右侧「新增项目」，
  下方 BasicTable（项目名称/片区名称/实施主体/统筹主体/责任部门/评审模式/参与专家/开始时间/状态/操作）。
  操作按状态区分：评估中→查看·评估；待提交→查看·编辑·提交·删除；已完成→查看·生成评估报告。
  「查看」跳二级详情页（_id/list）；「新增项目/编辑」跳独立表单页（form.vue，含评估材料上传 + 参与专家 + 去抽取，底部取消/暂存/提交）。
  数据来自本模块共享 store，接口就绪后替换。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <span>项目列表</span>
      </template>
      <template #toolbar>
        <a-button type="primary" @click="go(FORM_ROUTE)">
          <span class="inline-flex items-center gap-4px"> <span class="i-fluent:add-12-filled"></span> 新增项目 </span>
        </a-button>
      </template>
      <template #experts="{ record }">
        <span class="text-13px text-gray-700">{{ record.experts.join('、') }}</span>
      </template>
      <template #status="{ record }">
        <Tag :color="STATUS_COLOR[record.status as string] || 'default'">{{ record.status }}</Tag>
      </template>
    </BasicTable>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProjectEvaluation">
  import { reactive } from 'vue';
  import { Select, Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import type { UrbanProject } from '../expert-store';
  import { REVIEW_MODES, URBAN_DISTRICTS, useUrbanExpertStore, validateProjectForSubmit } from '../expert-store';

  const { showMessage } = useMessage();
  const go = useGo();
  const store = useUrbanExpertStore();

  const FORM_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation/form';
  const DETAIL_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation';
  const EVAL_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation/evaluate';

  const DISTRICT_OPTIONS = URBAN_DISTRICTS.map((d) => ({ label: d, value: d }));
  const MODE_OPTIONS = REVIEW_MODES.map((m) => ({ label: m, value: m }));

  /** 状态颜色（待提交=橙，评估中=蓝，待评价=紫，已完成=绿） */
  const STATUS_COLOR: Record<string, string> = {
    待提交: 'warning',
    评估中: 'processing',
    待评价: 'purple',
    已完成: 'success',
  };

  /** 表格列 */
  const columns: BasicColumn[] = [
    { title: '项目名称', dataIndex: 'name', width: 200, ellipsis: true },
    { title: '片区名称', dataIndex: 'district', width: 100 },
    { title: '实施主体', dataIndex: 'implementOrg', width: 170, ellipsis: true },
    { title: '统筹主体', dataIndex: 'coordinator', width: 180, ellipsis: true },
    { title: '责任部门', dataIndex: 'dept', width: 120 },
    { title: '评审模式', dataIndex: 'reviewMode', width: 100 },
    { title: '参与专家', dataIndex: 'experts', width: 170, ellipsis: true, slot: 'experts' },
    { title: '开始时间', dataIndex: 'startDate', width: 110 },
    { title: '状态', dataIndex: 'status', width: 90, slot: 'status' },
  ];

  /** 操作列：按状态给出不同操作 */
  const actionColumn: BasicColumn = {
    width: 210,
    actions: (record: Recordable) => {
      const list: any[] = [{ label: '查看', onClick: () => go(`${DETAIL_ROUTE}/${record.code}`) }];
      if (record.status === '评估中') {
        list.push({ label: '评估', onClick: () => handleEvaluate(record) });
      } else if (record.status === '待评价') {
        list.push({
          label: '评价专家',
          onClick: () => handleExpertEval(record),
        });
      } else if (record.status === '待提交') {
        list.push({ label: '编辑', onClick: () => go(`${FORM_ROUTE}?id=${record.id}`) });
        list.push({
          label: '提交',
          popConfirm: { title: '是否确认提交该项目？', confirm: () => handleSubmit(record) },
        });
        list.push({
          label: '删除',
          color: 'error',
          popConfirm: { title: '是否确认删除该项目？', confirm: () => handleDelete(record) },
        });
      } else if (record.status === '已完成') {
        list.push({ label: '生成评估报告', onClick: () => handleReport(record) });
      }
      return list;
    },
  };

  const searchKeyword = reactive<{ name?: string; adminDistrict?: string; reviewMode?: string }>({});

  const [registerTable, { setTableData }] = useTable({
    dataSource: store.projects,
    columns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: { pageSize: 10, showSizeChanger: false, showTotal: (t: number) => `共 ${t} 条` },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 90,
      schemas: [
        {
          label: '项目名称',
          field: 'name',
          component: 'Input',
          componentProps: { allowClear: true, placeholder: '请输入' },
        },
        {
          label: '片区名称',
          field: 'adminDistrict',
          component: 'Select',
          componentProps: { options: DISTRICT_OPTIONS, allowClear: true, placeholder: '请选择' },
        },
        {
          label: '评审模式',
          field: 'reviewMode',
          component: 'Select',
          componentProps: { options: MODE_OPTIONS, allowClear: true, placeholder: '请选择' },
        },
      ],
    },
    handleSearchInfoFn: (params: Recordable) => {
      Object.assign(searchKeyword, params);
      setTableData(filterProjects(params));
      return params;
    },
  });

  /** 按搜索条件过滤项目 */
  function filterProjects(params: Recordable): UrbanProject[] {
    const name = String(params.name ?? '').trim();
    const adminDistrict = String(params.adminDistrict ?? '').trim();
    const reviewMode = String(params.reviewMode ?? '').trim();
    return store.projects.filter(
      (p) =>
        (!name || p.name.includes(name)) &&
        (!adminDistrict || p.adminDistrict === adminDistrict) &&
        (!reviewMode || p.reviewMode === reviewMode),
    );
  }

  function refreshTable() {
    setTableData(filterProjects(searchKeyword));
  }

  /** 评价专家：跳专家评价页（携带项目编码，对本项目参与专家打分；完成后项目 → 已完成） */
  function handleExpertEval(record: Recordable) {
    go(
      `/early-stage-planning/urban-renewal-expert-management/expert-evaluation/index?projectCode=${record.code}&projectName=${encodeURIComponent(record.name)}`,
    );
  }

  /** 去评估：跳评估页面（展示项目信息 + 评估结果/意见/附件） */
  function handleEvaluate(record: Recordable) {
    go(`${EVAL_ROUTE}?id=${record.code}`);
  }
  /** 提交（待提交 → 评估中）：与表单提交相同的校验，缺项则阻止并提示 */
  function handleSubmit(record: Recordable) {
    const missing = validateProjectForSubmit(record as Partial<UrbanProject>);
    if (missing.length) {
      showMessage(`该项目缺少：${missing.join('、')}，请先编辑补充`);
      return;
    }
    store.updateProject(record.id, { status: '评估中' });
    refreshTable();
    showMessage('提交成功（本地演示，未持久化）');
  }
  /** 删除 */
  function handleDelete(record: Recordable) {
    store.removeProject(record.id);
    refreshTable();
    showMessage('删除成功（本地演示，未持久化）');
  }
  /** 生成评估报告（TODO: 接入报告下载） */
  function handleReport(record: Recordable) {
    showMessage(`${record.name}：生成评估报告待接入`);
  }
</script>
