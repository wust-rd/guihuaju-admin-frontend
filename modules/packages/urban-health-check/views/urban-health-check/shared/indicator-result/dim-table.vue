<!--
  市住更局 —— 指标项结果 show 页 / 一级维度表(Tabs 第一个页签)

  接口已接入：dimensionListBySet（首次自动按体系指标项的一级维度同步生成维度行）。
  列:一级维度名称 / 图层对象数量 / 图层覆盖面积(km²) / 操作(编辑)。
-->
<template>
  <div>
    <BasicTable @register="registerDimTable" :showIndexColumn="false">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #toolbar>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>
    </BasicTable>

    <DimForm @register="registerDrawer" @success="load" />
  </div>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultDimTable">
  import { onMounted, ref, unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { dimensionListBySet } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import DimForm from './dim-form.vue';

  const { meta, params } = unref(router.currentRoute);
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: '一级维度',
  };

  // 兼容菜单占位符 {id}/{code}；show 页路由 id 恒为体系编码
  const setCode = ((params.id ?? params.code) as string) || '';

  /** 维度行 */
  const rows = ref<Recordable[]>([]);
  const loading = ref(false);

  onMounted(load);

  async function load() {
    loading.value = true;
    try {
      rows.value = (await dimensionListBySet(setCode)) as Recordable[];
    } catch (e: any) {
      showMessage(e?.message || '加载一级维度失败', 'error');
    } finally {
      loading.value = false;
    }
  }

  /** 一级维度表列 */
  const dimColumns: BasicColumn[] = [
    { title: '一级维度名称', dataIndex: 'dimName', width: 150 },
    { title: '图层对象数量', dataIndex: 'layerCount', width: 140, align: 'center' },
    { title: '图层覆盖面积（km²）', dataIndex: 'layerArea', width: 180, align: 'center' },
  ];

  /** 操作列（编辑图层信息） */
  const actionColumn: BasicColumn = {
    width: 100,
    actions: (record: Recordable) => [
      {
        label: '编辑',
        onClick: () => handleForm({ ...record, isNewRecord: false }),
      },
    ],
  };

  const [registerDimTable] = useTable({
    dataSource: rows,
    loading,
    columns: dimColumns,
    actionColumn: actionColumn,
    showTableSetting: true,
    showIndexColumn: false,
    pagination: false,
    canResize: true,
  });

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  function handleForm(row: Recordable) {
    setDrawerProps({ showFooter: true });
    openDrawer(true, { ...row, setCode });
  }
</script>
