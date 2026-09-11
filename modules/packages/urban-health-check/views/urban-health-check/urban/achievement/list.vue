<!--
  市住更局 —— 体检成果管理（列表页）

  菜单注册（菜单名称「体检成果管理」）:
   - 链接地址:/urban-health-check/urban/achievement/list
   - 组件位置:/urban-health-check/urban/achievement/list(与链接地址一致)
   - 是否可见:显示
  show 页路由(RESTful,后端隐藏菜单,已注册):
   - 链接地址:/urban-health-check/urban/achievement/{id}({id}=记录编码 code=sort_no)
   - 组件位置:/urban-health-check/urban/achievement/_id/list;上级菜单挂「体检成果管理」点亮侧边栏
  接口已接入：achievementPage / achievementDelete（/cityCheck/achievement）。
  成果目录为固定五类清单（Select），已提交的目录只读。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #toolbar>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleDetail(record)" :title="record.catalog">
          {{ record.catalog }}
        </a>
      </template>
      <template #submitStatus="{ record }">
        <Tag
          :color="record.submitStatus === SUBMIT_STATUS.SUBMITTED ? 'blue' : 'blue'"
          :variant="record.submitStatus === SUBMIT_STATUS.SUBMITTED ? 'solid' : 'outlined'"
          style="border-radius: 10px"
        >
          {{ record.submitStatus === SUBMIT_STATUS.SUBMITTED ? '已提交' : '待提交' }}
        </Tag>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanAchievementList">
  import { unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { Achievement } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import {
    ACHIEVEMENT_CATALOGS,
    achievementDelete,
    achievementPage,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import {
    SUBMIT_STATUS,
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import { toOptions } from '@jeesite/urban-health-check/api/urban-health-check/common';
  import InputForm from './form.vue';

  const { meta } = unref(router.currentRoute);
  const go = useGo();
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '体检成果管理',
  };

  /** 搜索表单 */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      {
        label: '体检年份',
        field: 'year',
        component: 'Select',
        componentProps: { options: YEAR_OPTIONS, allowClear: true },
      },
      {
        label: '体检成果目录',
        field: 'catalog',
        component: 'Select',
        componentProps: { options: toOptions(ACHIEVEMENT_CATALOGS), allowClear: true },
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'code', width: 70, align: 'center' },
    { title: '体检年份', dataIndex: 'year', width: 100, align: 'center' },
    { title: '体检成果目录', dataIndex: 'catalog', slot: 'firstColumn', width: 200 },
    { title: '填报时间', dataIndex: 'reportDate', width: 120, align: 'center' },
    { title: '提交状态', dataIndex: 'submitStatus', width: 110, align: 'center', slot: 'submitStatus' },
  ];

  /** 操作列（已提交只读） */
  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
      },
      {
        label: '编辑',
        onClick: () => handleForm({ ...record, isNewRecord: false }),
        ifShow: () => record.submitStatus === SUBMIT_STATUS.PENDING,
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该成果目录？', confirm: () => handleDelete(record) },
        ifShow: () => record.submitStatus === SUBMIT_STATUS.PENDING,
      },
    ],
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable, { reload }] = useTable({
    api: achievementPage,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    // 打开前先按查看/编辑设好 showFooter(抽屉级);打开动画期间翻转会导致首次不弹(见 form.vue 头注释)
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 打开该成果目录的 show 页(RESTful:/…/achievement/{code},{id}=记录编码 code) */
  function handleDetail(record: Recordable) {
    go(`/urban-health-check/urban/achievement/${record.code}`);
  }

  /** 删除 */
  async function handleDelete(record: Achievement) {
    try {
      await achievementDelete([record.id!]);
      showMessage('删除成功');
      reload();
    } catch (e: any) {
      showMessage(e?.message || '删除失败', 'error');
    }
  }

  /** 表单保存成功回调：刷新列表 */
  function handleSuccess() {
    reload();
  }
</script>
