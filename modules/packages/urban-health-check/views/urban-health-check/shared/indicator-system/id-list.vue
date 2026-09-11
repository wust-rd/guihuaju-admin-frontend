<!--
  市住更局 —— 指标项管理(指标体系 show 页,列表)

  规划路由(RESTful,后端隐藏菜单,已注册):
   - 链接地址:/urban-health-check/urban/indicator-system/{id}(show 页;与 /list 静态段不冲突)
   - 组件位置:/urban-health-check/urban/indicator-system/_id/list(与链接地址不一致,菜单里已显式填写)
   - 是否可见:隐藏;上级菜单挂「指标体系管理」以点亮侧边栏
  接口已接入：体系详情 indicatorSystemInfo({id}=code) + 指标项 indicatorListBySet/save/delete +
  体系提交 indicatorSystemSubmit。
  列结构:一级维度/二级维度/三级维度/序号/指标项名称/指标单位/指标来源/数据来源/责任部门/操作;
  一、二级维度合并同值单元格(按页分块计算,组跨页时维度名在下一页重显),
  三级维度可空(指标直接挂二级维度),空值显示空白。
  已提交体系只读:编辑/删除/新增/提交发布均隐藏或禁用(US-2.4)。
-->
<template>
  <PageWrapper>
    <Card class="mb-3" :title="system?.indicatorName || systemId">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-gray-500">{{ system?.year ?? '-' }} 年</span>
          <Progress
            class="ml-6 w-72"
            :percent="filledPercent"
            :format="() => `已填报指标项 ${tableData.length} / 系统指标项 ${system?.indicatorCount ?? 0} 项`"
          />
        </div>
        <a-button
          v-if="system?.submitStatus === SUBMIT_STATUS.PENDING"
          type="primary"
          :loading="submitting"
          @click="handleSubmitPublish"
        >
          提交发布
        </a-button>
        <Tag v-else color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
      </div>
    </Card>
    <BasicTable @register="registerTable" @change="handleTableChange" :showIndexColumn="false">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #toolbar>
        <a-button v-if="!readOnly" type="primary" @click="handleForm({ systemCode: systemId, isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>
      <template #dim1="{ record }">
        {{ record.dim1Label }}
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleForm({ ...record, isNewRecord: false, isView: true })" :title="record.indicatorName">
          {{ record.indicatorName }}
        </a>
      </template>
    </BasicTable>

    <InputForm :read-only="readOnly" @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="UhcSharedIndicatorSystemIdList">
  import { computed, onMounted, ref, unref } from 'vue';
  import { Card, Progress, Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import type { IndicatorSystem } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import {
    SUBMIT_STATUS,
    indicatorSystemInfo,
    indicatorSystemSubmit,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import type { Indicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import {
    indicatorDelete,
    indicatorListBySet,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import InputForm from './id-form.vue';

  const { meta, params } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '指标项管理',
  };

  // 兼容菜单链接地址占位符写 {id} 或 {code}:路由参数名与占位符一致
  const systemId = ((params.id ?? params.code) as string) || '';

  const { showMessage } = useMessage();

  /** 体系信息（按 code 反查接口） */
  const system = ref<IndicatorSystem | undefined>();

  /** 已提交体系只读（US-2.4：编辑/删除/新增/提交发布锁定） */
  const readOnly = computed(() => system.value?.submitStatus === SUBMIT_STATUS.SUBMITTED);

  /** 页签标题默认取菜单名,这里改为体系名称 */
  const { setTitle } = useTabs(router);
  onMounted(() => {
    loadData();
  });

  async function loadData() {
    try {
      system.value = await indicatorSystemInfo(systemId);
      if (system.value?.indicatorName) {
        setTitle(`指标体系管理-${system.value.indicatorName}`);
      }
      await loadItems();
    } catch (e: any) {
      showMessage(e?.message || '加载体系信息失败', 'error');
    }
  }

  /** 搜索表单(体检年份/体系名称为体系信息回显,只读) */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      {
        label: '体检年份',
        field: 'year',
        component: 'Input',
        componentProps: { disabled: true },
        defaultValue: system.value?.year,
      },
      {
        label: '指标体系名称',
        field: 'indicatorName',
        component: 'Input',
        componentProps: { disabled: true },
        defaultValue: system.value?.indicatorName,
      },
    ],
  };

  /** 指标项列表（全量取回后本地分页 + 维度合并计算） */
  const items = ref<Indicator[]>([]);
  const loading = ref(false);

  async function loadItems() {
    loading.value = true;
    try {
      items.value = await indicatorListBySet(systemId);
      buildTableData();
    } catch (e: any) {
      showMessage(e?.message || '加载指标项失败', 'error');
    } finally {
      loading.value = false;
    }
  }

  /** 一级维度按出现次数统计,组内首行附「共 N 项」标注 */
  const tableData = ref<Recordable[]>([]);

  function buildTableData() {
    const dim1CountMap: Record<string, number> = {};
    items.value.forEach((item) => {
      dim1CountMap[item.dim1!] = (dim1CountMap[item.dim1!] || 0) + 1;
    });
    const seenDim1 = new Set<string>();
    tableData.value = items.value.map((item) => {
      const first = !seenDim1.has(item.dim1!);
      seenDim1.add(item.dim1!);
      return {
        ...item,
        dim1Label: first ? `${item.dim1}(共 ${dim1CountMap[item.dim1!]} 项)` : item.dim1,
      };
    });
    rebuildPageSpanMaps(currentPageSize.value);
  }

  /** 填报进度:已填报(表格行数)/ 系统指标项 */
  const filledPercent = computed(() => {
    const total = system.value?.indicatorCount ?? 0;
    if (!total) return 0;
    return Math.min(100, Math.round((tableData.value.length / total) * 10000) / 100);
  });

  /**
   * 维度列合并:一级维度按 dim1 连续同值合并,二级维度按 dim1+dim2 连续同值合并;
   * 返回每行的 rowSpan,0 表示该单元格并入上一行。
   */
  function calcRowSpans(rows: Recordable[], keys: string[]): number[] {
    const spans: number[] = [];
    let i = 0;
    while (i < rows.length) {
      let j = i;
      while (j + 1 < rows.length && keys.every((k) => rows[j + 1][k] === rows[i][k])) {
        j++;
      }
      const span = j - i + 1;
      spans.push(span);
      for (let k = i + 1; k <= j; k++) {
        spans.push(0);
      }
      i = j + 1;
    }
    return spans;
  }

  /** 默认页大小与 sys/config/list 一致(componentSetting:defaultPageSize 20,可切 10/20/50/80/100) */
  const DEFAULT_PAGE_SIZE = 20;
  const currentPageSize = ref(DEFAULT_PAGE_SIZE);

  /**
   * 分页 + 合并单元格:antd 的 onCell 拿到的行属于「当前页」,
   * 若按全量数据算 rowSpan,跨页的组在后页 span 全为 0,维度列会整列空白;
   * 因此按页分块计算,并以行 id 建索引(与页内下标解耦),
   * 组跨页时在下一页重新起一格,维度名重复显示保证可见。
   * 切换页大小时通过表格 change 事件重算。
   */
  const dim1Map = ref(new Map<string, number>());
  const dim2Map = ref(new Map<string, number>());

  function rebuildPageSpanMaps(pageSize: number) {
    const m1 = new Map<string, number>();
    const m2 = new Map<string, number>();
    for (let start = 0; start < tableData.value.length; start += pageSize) {
      const pageRows = tableData.value.slice(start, start + pageSize) as Recordable[];
      const spans1 = calcRowSpans(pageRows, ['dim1']);
      const spans2 = calcRowSpans(pageRows, ['dim1', 'dim2']);
      pageRows.forEach((row, i) => {
        m1.set(row.id, spans1[i]);
        m2.set(row.id, spans2[i]);
      });
    }
    dim1Map.value = m1;
    dim2Map.value = m2;
  }

  /** 页大小变化时重算合并(仅翻页不重算) */
  function handleTableChange(pagination: any) {
    const size = pagination?.pageSize;
    if (size && size !== currentPageSize.value) {
      currentPageSize.value = size;
      rebuildPageSpanMaps(size);
    }
  }

  /** 表格列(序号列位于三级维度右侧;一/二级维度合并同值单元格) */
  const tableColumns: BasicColumn[] = [
    {
      title: '一级维度',
      dataIndex: 'dim1',
      width: 140,
      slot: 'dim1',
      onCell: (record: Recordable) => ({ rowSpan: dim1Map.value.get(record.id) ?? 1 }),
    },
    {
      title: '二级维度',
      dataIndex: 'dim2',
      width: 110,
      onCell: (record: Recordable) => ({ rowSpan: dim2Map.value.get(record.id) ?? 1 }),
    },
    { title: '三级维度', dataIndex: 'dim3', width: 130 },
    { title: '序号', dataIndex: 'code', width: 70, align: 'center' },
    { title: '指标项名称', dataIndex: 'indicatorName', slot: 'firstColumn', width: 150 },
    { title: '指标单位', dataIndex: 'unit', width: 80, align: 'center' },
    { title: '指标来源', dataIndex: 'indicatorSource', width: 130, align: 'center' },
    { title: '数据来源', dataIndex: 'dataSource', width: 140 },
    { title: '责任部门', dataIndex: 'responsibleDept', width: 110 },
  ];

  /** 操作列(查看始终可;编辑/删除仅未提交时显示) */
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
        ifShow: () => !readOnly.value,
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该指标？', confirm: () => handleDelete(record) },
        ifShow: () => !readOnly.value,
      },
    ],
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable] = useTable({
    dataSource: tableData,
    loading,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    // 屏蔽 BasicTable 默认在最左侧追加的「序号」索引列(showIndexColumn 默认 true)
    showIndexColumn: false,
    // 分页器与 sys/config/list 相同:走全局默认(20 条/页,可切 10/20/50/80/100),
    // 切页大小时由 @change 重算维度合并的 rowSpan
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    // 打开前先按查看/编辑设好 showFooter(抽屉级);打开动画期间翻转会导致首次不弹(见对应 form.vue 头注释)
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 提交发布:提交当前体系形成版本快照,提交后体系与指标项只读 */
  const submitting = ref(false);
  async function handleSubmitPublish() {
    submitting.value = true;
    try {
      await indicatorSystemSubmit(system.value!.id!);
      showMessage('提交发布成功');
      await loadData();
    } catch (e: any) {
      showMessage(e?.message || '提交失败', 'error');
    } finally {
      submitting.value = false;
    }
  }

  /** 删除 */
  async function handleDelete(record: Recordable) {
    try {
      await indicatorDelete([record.id]);
      showMessage('删除成功');
      await loadItems();
    } catch (e: any) {
      showMessage(e?.message || '删除失败', 'error');
    }
  }

  /** 表单保存成功回调：刷新指标项列表 */
  function handleSuccess() {
    loadItems();
  }
</script>
