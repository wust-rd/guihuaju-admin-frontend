<!--
  市住更局 —— 指标项结果 show 页 / 指标项表(Tabs 第二个页签)

  接口已接入：indicatorResultListBySet（首次自动按指标项同步生成结果行，全量取回本地分页）。
  列结构:一级维度/二级维度/三级维度/序号/指标项名称/指标单位/指标值/标准值目标值/评估结果(Tag)/
  预警状态(Tag)/指标来源/数据来源/责任部门/操作;
  一、二级维度合并同值单元格(按页分块计算,组跨页时维度名在下一页重显)。
  结果填报前置条件:所属体系须处于启用状态(后端校验);已提交的行(submitStatus=1)只读。
-->
<template>
  <div>
    <BasicTable @register="registerTable" @change="handleTableChange">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #dim1="{ record }">
        {{ record.dim1Label }}
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleForm({ ...record, isNewRecord: false, isView: true })" :title="record.indicatorName">
          {{ record.indicatorName }}
        </a>
      </template>
      <template #evalResult="{ record }">
        <Tag :color="EVAL_RESULT_COLOR[record.evalResult] || 'default'" style="border-radius: 10px">
          {{ record.evalResult || '-' }}
        </Tag>
      </template>
      <template #warningStatus="{ record }">
        <Tag :color="WARNING_STATUS_COLOR[record.warningStatus] || 'default'" style="border-radius: 10px">
          {{ record.warningStatus || '-' }}
        </Tag>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </div>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultIndicatorTable">
  import { onMounted, ref, unref } from 'vue';
  import type { PropType } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { IndicatorResult, IndicatorResultRow } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import { indicatorResultListBySet } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import InputForm from './id-form.vue';

  const props = defineProps({
    system: Object as PropType<IndicatorResult>,
  });

  const { meta, params } = unref(router.currentRoute);
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '指标项',
  };

  // 兼容菜单占位符 {id}/{code}；show 页路由 id 恒为体系编码
  const setCode = ((params.id ?? params.code) as string) || '';

  /** 评估结果 Tag 颜色 */
  const EVAL_RESULT_COLOR: Record<string, string> = {
    较差: 'error',
    一般: 'warning',
    较好: 'processing',
    很好: 'success',
    无标准: 'default',
  };

  /** 预警状态 Tag 颜色 */
  const WARNING_STATUS_COLOR: Record<string, string> = {
    红色预警: 'error',
    黄色预警: 'warning',
    正常: 'success',
    无: 'default',
  };

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
        defaultValue: props.system?.year,
      },
      {
        label: '指标体系名称',
        field: 'indicatorName',
        component: 'Input',
        componentProps: { disabled: true },
        defaultValue: props.system?.indicatorName,
      },
    ],
  };

  /** 结果行（全量取回后本地分页 + 维度合并计算） */
  const rows = ref<IndicatorResultRow[]>([]);
  const loading = ref(false);

  onMounted(load);

  async function load() {
    loading.value = true;
    try {
      rows.value = await indicatorResultListBySet(setCode);
      buildTableData();
    } catch (e: any) {
      showMessage(e?.message || '加载指标项结果失败', 'error');
    } finally {
      loading.value = false;
    }
  }

  /** 一级维度按出现次数统计,组内首行附「共 N 项」标注 */
  const tableData = ref<Recordable[]>([]);

  function buildTableData() {
    const dim1CountMap: Record<string, number> = {};
    rows.value.forEach((item) => {
      dim1CountMap[item.dim1!] = (dim1CountMap[item.dim1!] || 0) + 1;
    });
    const seenDim1 = new Set<string>();
    tableData.value = rows.value.map((item) => {
      const first = !seenDim1.has(item.dim1!);
      seenDim1.add(item.dim1!);
      return {
        ...item,
        dim1Label: first ? `${item.dim1}(共 ${dim1CountMap[item.dim1!]} 项)` : item.dim1,
      };
    });
    rebuildPageSpanMaps(currentPageSize.value);
  }

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

  /** 分页 + 合并单元格:按页分块计算 rowSpan,以行 id 建索引;切页大小时重算 */
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
    { title: '指标值', dataIndex: 'indicatorValue', width: 90, align: 'center' },
    { title: '标准值/目标值', dataIndex: 'standardValue', width: 120, align: 'center' },
    { title: '评估结果', dataIndex: 'evalResult', width: 100, align: 'center', slot: 'evalResult' },
    { title: '预警状态', dataIndex: 'warningStatus', width: 100, align: 'center', slot: 'warningStatus' },
    { title: '指标来源', dataIndex: 'indicatorSource', width: 130, align: 'center' },
    { title: '数据来源', dataIndex: 'dataSource', width: 140 },
    { title: '责任部门', dataIndex: 'responsibleDept', width: 110 },
  ];

  /** 操作列(查看始终可;编辑仅未提交的行显示——提交后只读) */
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
        ifShow: () => record.submitStatus !== 1,
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
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 表单保存成功回调：刷新列表 */
  function handleSuccess() {
    load();
  }
</script>
