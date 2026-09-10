<!--
  ifco —— 项目实施成效统计（/ifco/effect-statistics/list）

  页面结构:Card 工具栏(填报年份/填报季度 | 导出[按钮保留,功能待做])
  → 只读汇总表格:行 = 全部成效指标(含「一、～八、」节标题行,加粗不落数值),
    列 = 指标名称(固定) | 计量单位 | 代码 | 全武汉市 | 13 个行政区报送单位。

  口径:
  - 只展示汇总,整页只读(无编辑/新增/带入/保存);
  - 全武汉市列 = 全部报送单位合计;各区列 = 该区填报数据的行合计;
  - 与成效填报页共享内存假数据仓库 effectFillStore
    (@jeesite/ifco/api/ifco/effect-fill,填报页改动在本页即时可见;后端接入后整体替换);
  - 空值与 0 置空(不补斜杠、不补 0),数值千分位。

  菜单注册(菜单名称「项目成效统计」):
   - 链接地址:/ifco/effect-statistics/list
   - 组件位置:/ifco/effect-statistics/list(与链接地址一致)
-->
<template>
  <PageWrapper>
    <Card class="mb-3">
      <div class="flex flex-wrap items-center justify-between gap-y-2">
        <div class="flex items-center">
          <span class="text-gray-500">填报年份</span>
          <Select v-model:value="year" :options="yearOptions" class="ml-2 w-28" />
          <span class="ml-6 text-gray-500">填报季度</span>
          <Select v-model:value="quarter" :options="QUARTER_OPTIONS" class="ml-2 w-28" />
        </div>
        <a-button @click="handleExport"> 导出 </a-button>
      </div>
    </Card>

    <Card :title="tableCardTitle">
      <Table
        :columns="tableColumns"
        :data-source="STAT_ROWS"
        :scroll="{ x: scrollX, y: TABLE_HEIGHT }"
        :components="TABLE_COMPONENTS"
        :pagination="false"
        bordered
        size="small"
        row-key="key"
      />
    </Card>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoEffectStatisticsList">
  import { computed, reactive, ref } from 'vue';
  import { Card, Select, Table } from 'antdv-next';
  import type { TableColumnsType } from 'antdv-next';
  import ResizableTitle from '@jeesite/core/components/Table/src/components/ResizableTitle.vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import type { EffectIndicatorDef, EffectUnitData } from '@jeesite/ifco/api/ifco/effect-fill';
  import {
    EFFECT_INDICATORS,
    EFFECT_INDICATOR_MAP,
    ensureEffectUnitData,
    rowTotal,
    rowTotalOfUnits,
  } from '@jeesite/ifco/api/ifco/effect-fill';
  import { QUARTER_OPTIONS, REPORT_UNITS, quarterLabel, toPeriodKey } from '@jeesite/ifco/api/ifco/common';

  /** 表格行(指标) */
  type StatRow = {
    key: string;
    kind: EffectIndicatorDef['kind'];
    name: string;
    unit: string;
    code: string;
  };

  const { showMessage } = useMessage();

  // ── 列宽拖拽(复用框架 ResizableTitle,同 sys/empUser):onHeaderCell 注入 resizable 与宽度回写 ──
  const TABLE_COMPONENTS = { header: { cell: ResizableTitle } };
  const colWidths = reactive<Record<string, number>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resizableHeaderCell = (col: any): any => ({
    column: { ...col, resizable: true },
    onResize: (_event: MouseEvent, { size }: { size: { width: number } }) => {
      if (col.key) {
        colWidths[col.key] = size.width;
      }
    },
  });
  const widthFor = (key: string, defaultWidth: number) => colWidths[key] ?? defaultWidth;

  // ── 筛选条件:年份 + 季度(切换即时生效) ──────────────────────────────
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: Number(item.key),
  }));
  const year = ref(dateUtil().year());
  // dayjs 的 quarter() 需 quarterOfYear 插件，这里用 month() 推导当前季度
  const quarter = ref(String(Math.floor(dateUtil().month() / 3) + 1));

  /** 各报送单位的数据集(懒初始化;全武汉市列 = 全部单位合计) */
  const unitDatas = computed<EffectUnitData[]>(() => {
    const key = toPeriodKey(year.value, quarter.value);
    return REPORT_UNITS.map((unit) => ensureEffectUnitData(key, unit));
  });

  const tableCardTitle = computed(() => `${year.value}年 ${quarterLabel(quarter.value)} 项目实施成效统计`);

  // ── 表格行(全部指标,含节标题行) ─────────────────────────────────────
  const STAT_ROWS: StatRow[] = EFFECT_INDICATORS.map((item) => ({
    key: item.key,
    kind: item.kind,
    name: item.name,
    unit: item.unit,
    code: item.code,
  }));

  /** 节标题行加粗;全武汉市列数值加粗(全市口径) */
  const rowOnCell = (record: StatRow, columnKey?: string) => ({
    className:
      [
        record.kind === 'section' ? 'effect-stat-row-section' : undefined,
        columnKey === 'city' && record.kind !== 'section' ? 'effect-stat-col-city' : undefined,
      ]
        .filter(Boolean)
        .join(' ') || undefined,
  });

  /** 未填内容与 0 一律置空(不补斜杠、不补 0);双值行「数 | 面积」竖线留空隙 */
  function renderDisplay(value: number | string | [number, number] | undefined) {
    if (Array.isArray(value)) {
      const format = (v: number) => (v === 0 ? '' : String(v));
      // 竖线前后各留 4 个空格;用不间断空格(U+00A0)防止 HTML 空白折叠
      const gap = '\u00A0\u00A0';
      return `${format(value[0])}${gap}|${gap}${format(value[1])}`;
    }
    if (value === undefined || value === '' || value === 0) return '';
    return typeof value === 'number' ? String(value) : value;
  }

  const tableColumns = computed<TableColumnsType<StatRow>>(() => {
    /** 全武汉市列:全部单位行合计之和 */
    const cityColumn: TableColumnsType<StatRow>[number] = {
      key: 'city',
      title: '全武汉市',
      width: widthFor('city', 200),
      align: 'right',
      onHeaderCell: resizableHeaderCell,
      onCell: (record: StatRow) => rowOnCell(record, 'city'),
      render: (_value: unknown, record: StatRow) =>
        renderDisplay(rowTotalOfUnits(EFFECT_INDICATOR_MAP[record.key]!, unitDatas.value)),
    };
    /** 各区列:该区填报数据的行合计 */
    const unitColumns: TableColumnsType<StatRow> = REPORT_UNITS.map((unit, index) => ({
      key: unit,
      title: unit,
      width: widthFor(unit, 200),
      align: 'right',
      onHeaderCell: resizableHeaderCell,
      onCell: (record: StatRow) => rowOnCell(record),
      render: (_value: unknown, record: StatRow) =>
        renderDisplay(rowTotal(EFFECT_INDICATOR_MAP[record.key]!, unitDatas.value[index])),
    }));
    return [
      {
        key: 'name',
        title: '指标名称',
        dataIndex: 'name',
        width: widthFor('name', 400),
        fixed: 'left',
        className: 'effect-stat-col-name',
        onHeaderCell: resizableHeaderCell,
      },
      {
        key: 'unit',
        title: '计量单位',
        dataIndex: 'unit',
        width: widthFor('unit', 90),
        align: 'center',
        onHeaderCell: resizableHeaderCell,
      },
      {
        key: 'code',
        title: '代码',
        dataIndex: 'code',
        width: widthFor('code', 80),
        align: 'center',
        onHeaderCell: resizableHeaderCell,
      },
      cityColumn,
      ...unitColumns,
    ];
  });

  /** 表格区域高度:视口自适应,表格内部纵向滚动(不依赖页面滚动,表头恒在视野) */
  const TABLE_HEIGHT = 'calc(100vh - 400px)';

  // 横向滚动宽度 = 各列当前宽度(含拖拽调整)之和
  const scrollX = computed(
    () =>
      widthFor('name', 400) +
      widthFor('unit', 90) +
      widthFor('code', 80) +
      widthFor('city', 200) +
      REPORT_UNITS.reduce((sum, unit) => sum + widthFor(unit, 200), 0),
  );

  // ── 导出(按钮保留,功能待做) ─────────────────────────────────────────
  function handleExport() {
    showMessage('导出功能建设中');
  }
</script>

<style>
  /* 节标题行(一、～八、)加粗 */
  .effect-stat-row-section {
    font-weight: 600;
  }

  /* 全武汉市列数值加粗(全市口径) */
  .effect-stat-col-city {
    font-weight: 600;
  }

  .effect-stat-col-name {
    white-space: nowrap;
  }
</style>
